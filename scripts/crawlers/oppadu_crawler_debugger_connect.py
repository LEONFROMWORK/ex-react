import json
import os
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

def is_excel_related(text):
    keywords = ['엑셀', 'excel', 'vba', '스프레드시트', 'spreadsheet', '수식', '함수', '차트', '피벗']
    return any(keyword in text.lower() for keyword in keywords)

def get_post_details(driver, post_url):
    driver.execute_script("window.open('');")
    driver.switch_to.window(driver.window_handles[1])
    driver.get(post_url)
    
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".post-content"))
        )
        question_element = driver.find_element(By.CSS_SELECTOR, ".post-content")
        question = question_element.text
        
        answers = []
        answer_elements = driver.find_elements(By.CSS_SELECTOR, ".comment-content")
        for elem in answer_elements:
            answers.append(elem.text.strip())
            
        return question.strip(), answers
    finally:
        driver.close()
        driver.switch_to.window(driver.window_handles[0])

def main():
    print("--- Connecting to existing Chrome instance ---")
    
    # Give Chrome a moment to start up properly
    print("Waiting for 5 seconds for Chrome to initialize...")
    time.sleep(5)
    
    chrome_options = Options()
    chrome_options.add_experimental_option("debuggerAddress", "localhost:9222")
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        print("--- Successfully connected to Chrome ---")
    except Exception as e:
        print(f"--- Failed to connect to Chrome. Is it running with --remote-debugging-port=9222? ---")
        print(f"Error: {e}")
        return

    base_url = "https://www.oppadu.com/community/question/"
    output_file = f"../../data/oppadu_qa_debugger_mode_{datetime.now().strftime('%Y%m%d_%H%M')}.jsonl"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for page_num in range(1, 4):
            target_url = f"{base_url}?board_id=1&page={page_num}"
            print(f"Crawling Page: {page_num} -> {target_url}")
            driver.get(target_url)

            try:
                WebDriverWait(driver, 20).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".post-item"))
                )
                posts = driver.find_elements(By.CSS_SELECTOR, ".post-item")
                print(f"  -> Found {len(posts)} posts on page {page_num}")

                # Need to get all links first to avoid stale element references
                post_links = []
                for post in posts:
                    try:
                        title_element = post.find_element(By.CSS_SELECTOR, 'h3.post-title a')
                        post_links.append(title_element.get_attribute('href'))
                    except NoSuchElementException:
                        continue
                
                for post_url in post_links:
                    try:
                        if not post_url.startswith('http'):
                            post_url = "https://www.oppadu.com" + post_url
                        
                        question, answers = get_post_details(driver, post_url)
                        
                        if question:
                            # Simple way to get title; we don't have it directly here
                            qa_pair = {"question_title": "Title not captured", "question_content": question, "answers": answers, "source_url": post_url}
                            f.write(json.dumps(qa_pair, ensure_ascii=False) + '\\n')
                            print(f"    -> Saved QA from: {post_url}")
                    except Exception as e:
                        print(f"    -> Error processing post {post_url}: {e}")

            except TimeoutException:
                print(f"  - Timeout waiting for '.post-item' on page {page_num}.")
                driver.save_screenshot(f"../../logs/debugger_error_page_{page_num}.png")

    print("--- Crawler Finished. Don't forget to close the Chrome instance manually. ---")


if __name__ == "__main__":
    main() 