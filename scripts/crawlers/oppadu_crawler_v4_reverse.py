import requests
from bs4 import BeautifulSoup
import json
import re
import time
import random
from datetime import datetime

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

def crawl_oppadu(start_page=600, end_page=500):
    base_url = "https://www.oppadu.com/qna/list"
    output_file = "../data/oppadu_improved_qa.jsonl"
    
    for page in range(start_page, end_page-1, -1):
        try:
            params = {
                'page': page,
                'category': 'all',
                'subcategory': 'all',
                'order': 'latest',
                'keyword': ''
            }
            
            response = requests.get(base_url, params=params)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 질문 목록 찾기
            questions = soup.find_all('div', class_='question-item')
            
            for q in questions:
                try:
                    # 질문 제목과 내용
                    title = q.find('div', class_='question-title').get_text(strip=True)
                    content = q.find('div', class_='question-content').get_text(strip=True)
                    
                    # 답변 찾기
                    answer_div = q.find('div', class_='answer-content')
                    if not answer_div:
                        continue
                        
                    answer = answer_div.get_text(strip=True)
                    
                    # 텍스트 정제
                    question = clean_text(f"{title} {content}")
                    answer = clean_text(answer)
                    
                    # 길이 필터링
                    if not (30 <= len(question) <= 1000 and 40 <= len(answer) <= 500):
                        continue
                        
                    # 엑셀 관련 키워드 확인
                    if not (is_excel_related(question) or is_excel_related(answer)):
                        continue

                    # 엑셀 버전 추출
                    excel_versions = extract_excel_version(question + " " + answer)
                    
                    # 데이터 저장
                    qa_pair = {
                        "question": question,
                        "answer": answer,
                        "excel_versions": excel_versions,
                        "collected_at": datetime.now().isoformat()
                    }
                    
                    with open(output_file, 'a', encoding='utf-8') as f:
                        f.write(json.dumps(qa_pair, ensure_ascii=False) + '\n')
                    
                except Exception as e:
                    continue
            
            # 랜덤 딜레이
            time.sleep(random.uniform(1.5, 3.0))
            
        except Exception as e:
            continue

if __name__ == "__main__":
    # 600페이지부터 500페이지까지 역방향 수집
    crawl_oppadu() 