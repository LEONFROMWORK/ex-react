#!/usr/bin/env python3
"""
Oppadu 게시판 크롤러 (AI 학습용)
https://www.oppadu.com/community/question/ 에서 Excel 관련 Q&A 데이터를 수집합니다.
AI 학습에 최적화된 간단한 형식으로 질문과 답변만 저장합니다.
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
from datetime import datetime
from urllib.parse import urljoin
import re

class OppaduCrawler:
    def __init__(self):
        self.base_url = "https://www.oppadu.com/community/question/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
    def get_page_list(self, page_num):
        """특정 페이지의 게시글 목록을 가져옵니다."""
        try:
            url = f"{self.base_url}?board_id=&pg={page_num}"
            print(f"Fetching page {page_num}: {url}")
            
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            posts = []
            
            for link in soup.find_all('a', href=True):
                href = link.get('href')
                
                if 'action=view' in href and 'uid=' in href:
                    if href.startswith('/'):
                        full_url = f"https://www.oppadu.com{href}"
                    elif href.startswith('?'):
                        full_url = f"{self.base_url}{href}"
                    else:
                        full_url = urljoin(self.base_url, href)
                    
                    title = link.get_text(strip=True)
                    if title and len(title) > 5:
                        posts.append({
                            'url': full_url,
                            'title': title
                        })
            
            seen = set()
            unique_posts = []
            for post in posts:
                if post['url'] not in seen:
                    seen.add(post['url'])
                    unique_posts.append(post)
            
            print(f"Found {len(unique_posts)} unique posts on page {page_num}")
            return unique_posts
            
        except Exception as e:
            print(f"Error fetching page {page_num}: {e}")
            return []
    
    def get_post_content(self, post_url, post_title):
        """개별 게시글의 내용을 가져옵니다."""
        try:
            print(f"  Fetching post: {post_title[:50]}...")
            response = self.session.get(post_url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 게시글 내용 추출
            content = ""
            
            # 다양한 패턴으로 내용 추출 시도
            for selector in [
                'article',
                'div[class*="content"]',
                'div[class*="post"]',
                'div[class*="view"]',
                'main',
                'td[class*="content"]',
                'td[class*="view"]',
                '#content',
                '.board-content',
                '.view-content'
            ]:
                element = soup.select_one(selector)
                if element:
                    content = element.get_text(strip=True)
                    break
            
            # 답변/댓글 추출
            answers = []
            for answer_div in soup.find_all(['div', 'section', 'td'], class_=re.compile('answer|reply|comment|response')):
                answer_text = answer_div.get_text(strip=True)
                if answer_text and len(answer_text) > 20:
                    answers.append(answer_text[:1000])
            
            return {
                'content': content[:2000] if content else post_title,
                'answers': answers[:3]
            }
            
        except Exception as e:
            print(f"  Error fetching post content: {e}")
            return None
    
    def clean_text(self, text):
        """텍스트에서 불필요한 내용을 제거하고 정리합니다."""
        if not text:
            return ""
        
        # HTML 엔티티 디코딩
        text = text.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
        
        # 이모지 및 이모티콘 제거 (Unicode 범위)
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"  # emoticons
            u"\U0001F300-\U0001F5FF"  # symbols & pictographs
            u"\U0001F680-\U0001F6FF"  # transport & map symbols
            u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
            u"\U00002500-\U00002BEF"  # chinese char
            u"\U00002702-\U000027B0"
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
        
        # 추가 특수 기호 제거
        special_chars = ['🏠', '📢', '🖐️', '💬', '🚨', '💾', '🎯', '📚', '🟢', '📅', '👁', '📁', '📄']
        for char in special_chars:
            text = text.replace(char, '')
        
        # 불필요한 패턴 제거
        patterns_to_remove = [
            r'오빠두엑셀 커뮤니티.*?진짜쓰는실무엑셀',
            r'현재 접속자.*?Agency',
            r'\d{4}년 \d{2}월 \d{2}일.*?조회 \d+',
            r'엑셀버전.*?OS버전.*?윈도우\d+',
            r'좋아요\d+댓글\d+스크랩공유',
            r'댓글을 작성하려면로그인이 필요합니다.*?',
            r'목록▲ TOP.*',
            r'파일 첨부저장취소\d+시간 전',
            r'비주얼텍스트.*?파일 첨부저장취소',
            r'<img src="data:image.*?>',
            r'<pre lang=.*?</pre>',
            r'Lv\.\d+',
            r'@.*?님',
            r'첨부파일.*?KB\)',
            r'https?://[^\s]+',  # URL 제거
            r'게시글 목록페이지.*',
            r'▲ TOP게시글.*',
            r'답변 완료.*?해결.*?',
            r'답글 \d+.*?조회\d+.*?',
            r'커뮤니티 전체.*?',
        ]
        
        for pattern in patterns_to_remove:
            text = re.sub(pattern, '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # 연속된 공백과 줄바꿈 정리
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    def crawl_pages(self, start_page=1, end_page=50, output_file='oppadu_simple_qa.jsonl'):
        """지정된 페이지 범위의 데이터를 크롤링합니다."""
        all_data = []
        
        # 출력 디렉토리 생성
        os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
        
        for page_num in range(start_page, end_page + 1):
            print(f"\n--- Processing page {page_num}/{end_page} ---")
            
            posts = self.get_page_list(page_num)
            
            if not posts:
                print(f"No posts found on page {page_num}")
                continue
            
            print(f"Found {len(posts)} posts on page {page_num}")
            
            for i, post in enumerate(posts):
                post_data = self.get_post_content(post['url'], post['title'])
                
                if post_data:
                    # 질문 텍스트 생성 (제목 + 내용)
                    question = f"{post['title']}\n{post_data['content']}"
                    question = self.clean_text(question)
                    
                    # 답변 텍스트 생성 (모든 답변을 하나로 합침)
                    if post_data['answers']:
                        answer = '\n\n'.join(post_data['answers'])
                        answer = self.clean_text(answer)
                    else:
                        answer = ""
                    
                    # 유효한 질문과 답변이 있는 경우만 저장
                    if len(question) > 50 and len(answer) > 20:
                        qa_data = {
                            'question': question,
                            'answer': answer
                        }
                        
                        all_data.append(qa_data)
                        print(f"  ✓ Collected: {post['title'][:50]}...")
                        
                        # 중간 저장 (10개마다)
                        if len(all_data) % 10 == 0:
                            self.save_data(all_data, output_file)
                    else:
                        print(f"  ✗ Skipped (insufficient content): {post['title'][:50]}...")
                
                time.sleep(1)
            
            time.sleep(2)
            
            self.save_data(all_data, output_file)
            print(f"Total collected: {len(all_data)} Q&A pairs")
        
        print(f"\nCrawling completed! Total: {len(all_data)} Q&A pairs")
        return all_data
    
    def save_data(self, data, output_file):
        """데이터를 JSONL 형식으로 저장합니다."""
        with open(output_file, 'w', encoding='utf-8') as f:
            for item in data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        print(f"Data saved to {output_file} ({len(data)} items)")

def main():
    crawler = OppaduCrawler()
    
    # 데이터 수집 (간단한 형식으로)
    output_path = '../data/oppadu_simple_qa.jsonl'
    crawler.crawl_pages(start_page=1, end_page=10, output_file=output_path)
    
    # 수집 통계 출력
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            print(f"\nTotal Q&A collected: {len(lines)}")
            
            # 샘플 출력
            if lines:
                sample = json.loads(lines[0])
                print("\nSample data:")
                print(f"Question: {sample['question'][:100]}...")
                print(f"Answer: {sample['answer'][:100]}...")

if __name__ == "__main__":
    main()