import json
import re
import time
import random
from datetime import datetime
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException
import os

def extract_excel_version(text):
    # 엑셀 버전 패턴
    version_patterns = [
        r'엑셀\s*20(?:10|13|16|19|21|23)',  # 엑셀 2010-2023
        r'excel\s*20(?:10|13|16|19|21|23)',  # Excel 2010-2023
        r'office\s*20(?:10|13|16|19|21|23)', # Office 2010-2023
        r'365',                              # Microsoft 365
        r'엑셀\s*\d{2,4}',                   # 기타 엑셀 연도
        r'excel\s*\d{2,4}'                   # 기타 Excel 연도
    ]
    
    versions = []
    text_lower = text.lower()
    
    for pattern in version_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            version = match.group().strip()
            if version not in versions:
                versions.append(version)
    
    return versions if versions else ["버전 미상"]

def clean_text(text):
    # HTML 엔티티 디코딩
    text = BeautifulSoup(text, 'html.parser').get_text()
    
    # 시간 정보 제거 패턴들
    time_patterns = [
        r'\d{4}\.\d{1,2}\.\d{1,2}\.?',  # 날짜
        r'\d{1,2}:\d{2}(?::\d{2})?',    # 시간
        r'\d+시간\s*전',                 # N시간 전
        r'\d+분\s*전',                   # N분 전
        r'어제|오늘|방금',               # 상대적 시간
        r'\d+일\s*전',                   # N일 전
        r'\[\d{1,2}/\d{1,2}\]',         # [MM/DD]
        r'\d+\s*[초분시일개월년]\s*(?:전|후|지남)',  # N초/분/시간/일/개월/년 전/후/지남
    ]
    
    for pattern in time_patterns:
        text = re.sub(pattern, '', text)
    
    # 특수문자 및 불필요한 공백 제거
    text = re.sub(r'[\n\t]+', ' ', text)  # 줄바꿈과 탭을 공백으로
    text = re.sub(r'\s+', ' ', text)      # 연속된 공백을 하나로
    text = text.strip()                    # 앞뒤 공백 제거
    
    return text

def is_excel_related(text):
    excel_keywords = [
        '엑셀', 'excel', '시트', 'sheet', '셀', 'cell', '행', '열', 
        '함수', 'function', '매크로', 'macro', 'vba', '피벗', 'pivot',
        '차트', 'chart', '필터', 'filter', '정렬', 'sort', '수식', 
        '워크북', 'workbook', '통합문서', '스프레드시트', 'spreadsheet'
    ]
    
    text_lower = text.lower()
    return any(keyword.lower() in text_lower for keyword in excel_keywords)

def get_post_details(driver, post_url):
    """게시물 상세 페이지에서 질문과 답변을 추출합니다."""
    try:
        # 새 탭에서 게시물 URL 열기
        driver.execute_script("window.open('');")
        driver.switch_to.window(driver.window_handles[1])
        driver.get(post_url)

        # 페이지 로드를 기다림
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "post-content")))

        post_soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 질문 내용 추출
        question_content = post_soup.find('div', class_='post-content')
        question = clean_text(question_content.get_text(strip=True)) if question_content else ""

        # 답변 내용 추출 (여러 개일 수 있음)
        answers = []
        answer_elements = post_soup.find_all('div', class_='comment-content')
        for ans_elem in answer_elements:
            answer_text = clean_text(ans_elem.get_text(strip=True))
            if len(answer_text) > 20: # 너무 짧은 답변은 제외
                answers.append(answer_text)
        
        return question, answers

    finally:
        # 탭을 닫고 원래 탭으로 돌아감
        driver.close()
        driver.switch_to.window(driver.window_handles[0])


def crawl_oppadu(start_page=1, end_page=3): # Test with a few pages first
    base_url = "https://www.oppadu.com/community/question/"
    output_file = f"../../data/oppadu_community_qa_{datetime.now().strftime('%Y%m%d_%H%M')}.jsonl"

    # Use undetected_chromedriver
    options = uc.ChromeOptions()
    
    # --- Start of Bot Evasion Options from https://yoonminlee.com/selenium-bot-detection-bypass
    options.add_argument("--disable-blink-features=AutomationControlled")
    # The following options might not be compatible with undetected_chromedriver
    # options.add_experimental_option("excludeSwitches", ["enable-automation"])
    # options.add_experimental_option('useAutomationExtension', False)
    # --- End of Bot Evasion Options
    
    # options.add_argument('--headless') # Headless mode can still be detected. Run with GUI first.
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
    
    driver = uc.Chrome(options=options)
    
    try:
        with open(output_file, 'a', encoding='utf-8') as f:
            for page in range(start_page, end_page + 1):
                target_url = f"{base_url}?board_id=1&page={page}"
                print(f"Crawling Page: {page} -> {target_url}")
                driver.get(target_url)
                
                # --- Move script execution after get()
                driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                
                time.sleep(3) # Give page time to load initial scripts

                # Wait for post items to be loaded
                try:
                    wait = WebDriverWait(driver, 20)
                    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "post-item")))
                except TimeoutException:
                    print(f"Error: Timed out waiting for post items on page {page}.")
                    
                    # Create logs directory if it doesn't exist
                    os.makedirs("../../logs", exist_ok=True)
                    
                    screenshot_path = f"../../logs/error_screenshot_page_{page}.png"
                    html_path = f"../../logs/error_page_source_{page}.html"
                    
                    driver.save_screenshot(screenshot_path)
                    with open(html_path, 'w', encoding='utf-8') as f_html:
                        f_html.write(driver.page_source)
                        
                    print(f"Debug Info: Screenshot saved to '{screenshot_path}'")
                    print(f"Debug Info: Page source saved to '{html_path}'")
                    print("Skipping to next page.")
                    continue

                soup = BeautifulSoup(driver.page_source, 'html.parser')
                posts = soup.find_all('div', class_='post-item')
                print(f"Found {len(posts)} posts on page {page}")

                if not posts:
                    print("No more posts found, stopping.")
                    break

                for post in posts:
                    post_url = None # Initialize post_url
                    try:
                        title_container = post.find('h3', class_='post-title')
                        if not title_container:
                            continue # Skip if title container is not found
                        
                        title_element = title_container.find('a')
                        if not title_element:
                            continue # Skip if link is not found

                        post_url = title_element['href']
                        if not post_url.startswith('http'):
                            post_url = "https://www.oppadu.com" + post_url
                        
                        question, answers = get_post_details(driver, post_url)

                        if question and answers:
                            # 엑셀 관련성 및 길이 필터링
                            if not (is_excel_related(question) or any(is_excel_related(ans) for ans in answers)):
                                continue
                            if not (30 <= len(question) <= 2000):
                                continue

                            # QA 쌍 만들기
                            for answer in answers:
                                if not (40 <= len(answer) <= 2000):
                                    continue

                                excel_versions = extract_excel_version(question + " " + answer)
                                qa_pair = {
                                    "question": question,
                                    "answer": answer,
                                    "excel_versions": excel_versions,
                                    "source": post_url,
                                    "collected_at": datetime.now().isoformat()
                                }
                                
                                f.write(json.dumps(qa_pair, ensure_ascii=False) + '\n')
                            print(f"  -> Successfully processed and saved QA from: {post_url}")
                    
                    except Exception as e:
                        print(f"  -> Error processing post: {post_url}, {e}")
                        continue
                
                time.sleep(random.uniform(1, 2))
                
    finally:
        driver.quit()
        print("\n--- Crawler Finished ---")

if __name__ == "__main__":
    crawl_oppadu(start_page=1, end_page=3) # Crawl first 3 pages 