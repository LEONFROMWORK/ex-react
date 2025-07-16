#!/usr/bin/env python3
"""
오빠두 게시판 최종 크롤러 (v4) - 실제 구조 기반
- 실제 URL 패턴: ?board_id=1&action=view&uid=XXXXX&pg=1
- 채택된 답변만 수집
- 고품질 Q&A 데이터 생성
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
from datetime import datetime
from urllib.parse import urljoin, urlparse, parse_qs
import re

class OppaduCrawlerV4:
    def __init__(self):
        self.base_url = "https://www.oppadu.com/community/question/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def get_page_list(self, page_num):
        """특정 페이지의 게시글 목록을 가져옵니다."""
        try:
            url = f"{self.base_url}?pg={page_num}"
            print(f"Fetching page {page_num}: {url}")
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            posts = []
            
            # 실제 오빠두 패턴: ?board_id=1&action=view&uid=XXXXX&pg=1
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                text = link.get_text(strip=True)
                
                # 게시글 링크 패턴 확인
                if (href and 
                    'action=view' in href and 
                    'uid=' in href and 
                    'board_id=' in href and
                    len(text) > 10 and  # 제목이 있는 링크
                    not any(skip in text.lower() for skip in ['home', 'menu', 'login', '홈', '메뉴', '로그인'])):
                    
                    # 상대 URL을 절대 URL로 변환
                    if href.startswith('?'):
                        full_url = self.base_url + href
                    elif href.startswith('/'):
                        full_url = "https://www.oppadu.com" + href
                    else:
                        full_url = href
                    
                    posts.append({
                        'url': full_url,
                        'title': text
                    })
            
            # 중복 제거
            seen = set()
            unique_posts = []
            for post in posts:
                if post['url'] not in seen:
                    seen.add(post['url'])
                    unique_posts.append(post)
            
            return unique_posts
            
        except Exception as e:
            print(f"Error fetching page {page_num}: {e}")
            return []
    
    def clean_text(self, text):
        """텍스트를 완전히 정리합니다."""
        if not text:
            return ""
        
        # 1. HTML 엔티티 디코딩
        text = text.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
        text = text.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&#39;', "'")
        
        # 2. HTML 태그 완전 제거
        text = re.sub(r'<[^>]+>', '', text)
        
        # 3. 이모지 및 특수문자 제거
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"  # emoticons
            u"\U0001F300-\U0001F5FF"  # symbols & pictographs
            u"\U0001F680-\U0001F6FF"  # transport & map symbols
            u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
            u"\U00002500-\U00002BEF"  # chinese char
            u"\U00002702-\U000027B0"
            u"\U000024C2-\U0001F251"
            u"\U0001f926-\U0001f937"
            u"\U00010000-\U0010ffff"
            u"\u2640-\u2642" 
            u"\u2600-\u2B55"
            u"\u200d"
            u"\u23cf"
            u"\u23e9"
            u"\u231a"
            u"\ufe0f"  # dingbats
            u"\u3030"
            "]+", flags=re.UNICODE)
        text = emoji_pattern.sub('', text)
        
        # 4. 오빠두 특화 노이즈 패턴 제거
        noise_patterns = [
            r'오빠두엑셀.*?커뮤니티',
            r'엑셀강의.*?대표채널',
            r'좋아요\s*\d+',
            r'댓글\s*\d+',
            r'조회\s*\d+',
            r'스크랩',
            r'신고',
            r'채택된\s*답변',
            r'@\w+님',
            r'Lv\.\d+',
            r'\d+시간\s*전',
            r'\d+일\s*전',
            r'\d+분\s*전',
            r'\d{4}\s*\d{2}\s*\d{2}',  # YYYY MM DD 날짜
            r'\d{2}:\d{2}',            # HH:MM 시간
            r'\d{1,2}\s*\d{1,2}$',     # 텍스트 끝의 숫자 쌍 (시간 정보)
            r'\s+\d+$',                # 텍스트 끝의 단일 숫자 (시간 정보)
            r'작성자',
            r'질문자',
            r'답변자',
            r'https?://[^\s]+',  # URL
            r'www\.[^\s]+',      # www 링크
        ]
        
        for pattern in noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
        
        # 5. 연속된 공백과 줄바꿈 정리
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n', text)
        
        # 6. 앞뒤 공백 제거
        text = text.strip()
        
        return text
    
    def get_post_content(self, post_url, post_title):
        """게시글에서 질문과 채택된 답변을 추출합니다."""
        try:
            print(f"  Processing: {post_title[:50]}...")
            response = self.session.get(post_url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 1. 질문 제목 추출
            question_title = ""
            title_selectors = [
                'h1', 'h2', 'h3',
                '.post-title',
                '.question-title',
                '.board-title',
                'title'
            ]
            
            for selector in title_selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    question_title = self.clean_text(elem.get_text())
                    break
            
            if not question_title:
                question_title = post_title
            
            # 2. 질문 내용 추출 (다양한 패턴 시도)
            question_content = ""
            content_selectors = [
                '.post-content',
                '.question-content',
                '.view-content', 
                '.board-content',
                'article',
                '.content',
                '.text-content'
            ]
            
            for selector in content_selectors:
                elem = soup.select_one(selector)
                if elem:
                    question_content = self.clean_text(elem.get_text())
                    if len(question_content) > 20:  # 의미있는 내용이 있으면
                        break
            
            # 3. 채택된 답변 추출 (다양한 패턴)
            selected_answers = []
            
            answer_selectors = [
                '.comment-wrapper.selected-answer',
                '.selected-answer',
                '.best-answer',
                '.accepted-answer',
                '.answer.selected',
                '.reply.selected',
                '[class*="selected"]',
                '[class*="best"]',
                '[class*="accepted"]'
            ]
            
            for selector in answer_selectors:
                elements = soup.select(selector)
                for elem in elements:
                    answer_text = self.clean_text(elem.get_text())
                    
                    # 품질 검증
                    if (answer_text and 
                        len(answer_text) > 30 and 
                        len(answer_text) < 2000 and
                        not self.is_low_quality_answer(answer_text)):
                        selected_answers.append(answer_text)
                
                if selected_answers:
                    break
            
            # 채택된 답변이 없으면 일반 답변에서 찾기
            if not selected_answers:
                general_answer_selectors = [
                    '.comment-content',
                    '.reply-content',
                    '.answer-content',
                    '.comment',
                    '.reply'
                ]
                
                for selector in general_answer_selectors:
                    elements = soup.select(selector)
                    for elem in elements:
                        answer_text = self.clean_text(elem.get_text())
                        
                        # 더 엄격한 품질 검증 (일반 답변이므로)
                        if (answer_text and 
                            len(answer_text) > 50 and 
                            len(answer_text) < 1500 and
                            not self.is_low_quality_answer(answer_text) and
                            self.looks_like_helpful_answer(answer_text)):
                            selected_answers.append(answer_text)
                            break  # 첫 번째 좋은 답변만
                    
                    if selected_answers:
                        break
            
            # 답변이 없으면 스킵
            if not selected_answers:
                print(f"    ✗ No answers found")
                return None
            
            # 5. 최종 검증
            final_question = self.build_question(question_title, question_content)
            final_answer = selected_answers[0]  # 첫 번째 답변만
            
            if (len(final_question) < 15 or 
                len(final_answer) < 30 or
                self.is_low_quality_text(final_question) or
                self.is_low_quality_text(final_answer)):
                print(f"    ✗ Quality check failed")
                return None
            
            return {
                'question': final_question,
                'answer': final_answer
            }
            
        except Exception as e:
            print(f"    ✗ Error: {e}")
            return None
    
    def build_question(self, title, content):
        """질문을 구성합니다."""
        parts = []
        
        if title and len(title) > 5:
            parts.append(title)
        
        if content and len(content) > 10 and content != title:
            parts.append(content)
        
        return '\n\n'.join(parts) if parts else title or ""
    
    def is_low_quality_answer(self, text):
        """저품질 답변을 필터링합니다."""
        if not text or len(text) < 20:
            return True
        
        # 의미없는 패턴들
        low_quality_patterns = [
            r'^[\d\s\.\-=]+$',  # 숫자와 기호만
            r'^[가-힣]{1,5}$',   # 너무 짧은 한글
            r'^\w{1,10}$',      # 너무 짧은 영문
            r'^[\?\!\.\,\s]+$', # 특수문자만
            r'^(감사|고마워|알겠어|네|예).*?$',  # 너무 간단한 답변
        ]
        
        for pattern in low_quality_patterns:
            if re.match(pattern, text, re.IGNORECASE):
                return True
        
        return False
    
    def looks_like_helpful_answer(self, text):
        """도움이 될 것 같은 답변인지 확인합니다."""
        helpful_keywords = [
            '함수', '수식', '엑셀', '방법', '=', 'VLOOKUP', 'IF', 'SUM', 'COUNT',
            '셀', '시트', '워크시트', '피벗', '차트', '그래프', '매크로', 'VBA',
            '조건', '참조', '범위', '데이터', '입력', '출력', '계산'
        ]
        
        return any(keyword in text for keyword in helpful_keywords)
    
    def is_low_quality_text(self, text):
        """저품질 텍스트를 필터링합니다."""
        if not text or len(text.strip()) < 10:
            return True
        
        # 의미있는 한글이나 영문이 있는지 확인
        if not re.search(r'[가-힣a-zA-Z]', text):
            return True
        
        return False
    
    def save_data(self, data, filename):
        """데이터를 JSONL 파일로 저장합니다."""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                for item in data:
                    json.dump(item, f, ensure_ascii=False)
                    f.write('\n')
            print(f"Saved {len(data)} items to {filename}")
        except Exception as e:
            print(f"Error saving data: {e}")
    
    def crawl_pages(self, start_page=1, end_page=300, output_file='../data/oppadu_final_qa.jsonl'):
        """최종 고품질 데이터를 수집합니다."""
        all_data = []
        
        # 출력 디렉토리 생성
        os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
        
        print(f"=== 오빠두 최종 크롤링 (v4): {start_page}-{end_page} 페이지 ===")
        print(f"출력 파일: {output_file}")
        
        for page_num in range(start_page, end_page + 1):
            print(f"\n--- Page {page_num}/{end_page} ---")
            
            posts = self.get_page_list(page_num)
            
            if not posts:
                print(f"No posts found on page {page_num}")
                continue
            
            print(f"Found {len(posts)} posts")
            
            page_success = 0
            for i, post in enumerate(posts):
                qa_data = self.get_post_content(post['url'], post['title'])
                
                if qa_data:
                    all_data.append(qa_data)
                    page_success += 1
                    print(f"    ✓ Success ({page_success}): {qa_data['question'][:40]}...")
                    
                    # 10개마다 중간 저장
                    if len(all_data) % 10 == 0:
                        self.save_data(all_data, output_file)
                
                # Rate limiting
                time.sleep(2.5)
            
            print(f"Page {page_num}: {page_success}/{len(posts)} collected (총 {len(all_data)}개)")
            
            # 페이지마다 저장
            if all_data:
                self.save_data(all_data, output_file)
            
            # 페이지 간 대기
            time.sleep(3)
            
            # 10페이지마다 통계
            if page_num % 10 == 0:
                print(f"\n=== 진행통계 (페이지 {page_num}) ===")
                print(f"총 수집: {len(all_data)}개")
                print(f"평균: {len(all_data)/page_num:.1f}개/페이지")
                
                if all_data:
                    avg_q_len = sum(len(item['question']) for item in all_data) / len(all_data)
                    avg_a_len = sum(len(item['answer']) for item in all_data) / len(all_data)
                    print(f"평균 질문 길이: {avg_q_len:.0f}자")
                    print(f"평균 답변 길이: {avg_a_len:.0f}자")
        
        # 최종 저장
        if all_data:
            self.save_data(all_data, output_file)
            
        print(f"\n🎉 크롤링 완료!")
        print(f"총 수집: {len(all_data)}개 Q&A")
        print(f"파일: {output_file}")
        
        return len(all_data)

def main():
    crawler = OppaduCrawlerV4()
    total_collected = crawler.crawl_pages(1, 300)
    print(f"\n최종 결과: {total_collected}개 고품질 Q&A 수집 완료")

if __name__ == "__main__":
    main() 