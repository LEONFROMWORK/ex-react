#!/usr/bin/env python3
"""
오빠두 게시판 정밀 크롤러 (v2)
구체적인 CSS 클래스를 타겟팅하여 정확한 데이터만 추출
- 질문 제목: class="answer-complete-text"
- 질문 내용: post-content
- 버전 정보: class="post-options-display"  
- 채택된 답변: class="comment-wrapper selected-answer"
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
from datetime import datetime
from urllib.parse import urljoin
import re

class OppaduCrawlerV2:
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
            url = f"{self.base_url}?board_id=&pg={page_num}"
            print(f"Fetching page {page_num}: {url}")
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            posts = []
            
            # 게시글 링크 추출 - 더 정확한 패턴 사용
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
                    if title and len(title) > 5 and not title.startswith('답변'):
                        posts.append({
                            'url': full_url,
                            'title': title
                        })
            
            # 중복 제거
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
        """오빠두 특화 HTML 구조에서 정확한 데이터를 추출합니다."""
        try:
            print(f"  Fetching post: {post_title[:50]}...")
            response = self.session.get(post_url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 1. 질문 제목 추출 (class="answer-complete-text")
            question_title = ""
            title_elem = soup.find(class_="answer-complete-text")
            if title_elem:
                question_title = title_elem.get_text(strip=True)
            else:
                # 대체 방법으로 제목 찾기
                title_elem = soup.find('h1') or soup.find('h2') or soup.find('h3')
                if title_elem:
                    question_title = title_elem.get_text(strip=True)
                else:
                    question_title = post_title
            
            # 2. 질문 내용 추출 (post-content)
            question_content = ""
            content_elem = soup.find(class_="post-content")
            if content_elem:
                question_content = content_elem.get_text(strip=True)
            else:
                # 대체 방법들
                for selector in ['div[class*="post-content"]', '.view-content', '.board-content', 'article']:
                    elem = soup.select_one(selector)
                    if elem:
                        question_content = elem.get_text(strip=True)
                        break
            
            # 3. 버전 정보 추출 (class="post-options-display")
            version_info = ""
            version_elem = soup.find(class_="post-options-display")
            if version_elem:
                version_info = version_elem.get_text(strip=True)
            
            # 4. 채택된 답변만 추출 (class="comment-wrapper selected-answer")
            selected_answers = []
            answer_wrappers = soup.find_all(class_="comment-wrapper selected-answer")
            
            if answer_wrappers:
                for wrapper in answer_wrappers:
                    answer_text = wrapper.get_text(strip=True)
                    if answer_text and len(answer_text) > 20:
                        cleaned_answer = self.clean_answer_text(answer_text)
                        if cleaned_answer:
                            selected_answers.append(cleaned_answer)
            
            # 채택된 답변이 없으면 None 반환 (수집하지 않음)
            if not selected_answers:
                print(f"  ✗ No selected answers found, skipping post")
                return None
            
            return {
                'title': self.clean_text(question_title),
                'content': self.clean_text(question_content),
                'version_info': self.clean_text(version_info),
                'selected_answers': selected_answers[:3]  # 최대 3개
            }
            
        except Exception as e:
            print(f"  Error fetching post content: {e}")
            return None
    
    def clean_answer_text(self, text):
        """답변 텍스트를 정리합니다."""
        if not text:
            return ""
        
        # 답변에서 불필요한 부분 제거
        answer_patterns_to_remove = [
            r'좋아요\d+',
            r'댓글\d+',
            r'스크랩',
            r'신고',
            r'@.*?님',
            r'Lv\.\d+',
            r'\d+시간 전',
            r'\d+일 전',
            r'작성자',
            r'채택된 답변',
        ]
        
        for pattern in answer_patterns_to_remove:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        text = self.clean_text(text)
        
        # 너무 짧은 답변 필터링
        if len(text) < 10:
            return ""
        
        return text
    
    def clean_text(self, text):
        """텍스트에서 불필요한 내용을 제거하고 정리합니다."""
        if not text:
            return ""
        
        # HTML 엔티티 디코딩
        text = text.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
        text = text.replace('&nbsp;', ' ').replace('&quot;', '"')
        
        # 이모지 및 이모티콘 제거
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
        
        # 오빠두 특화 불필요한 패턴 제거
        patterns_to_remove = [
            r'오빠두엑셀 커뮤니티.*?',
            r'공지사항.*?실무엑셀',
            r'현재 접속자.*?명',
            r'\d{4}년 \d{2}월 \d{2}일.*?조회 \d+',
            r'엑셀버전.*?OS버전.*?',
            r'좋아요\d+댓글\d+스크랩공유',
            r'목록.*?TOP',
            r'게시글 목록페이지.*?',
            r'파일 첨부.*?KB',
            r'비주얼텍스트.*?',
            r'<[^>]+>',  # HTML 태그
            r'https?://[^\s]+',  # URL
        ]
        
        for pattern in patterns_to_remove:
            text = re.sub(pattern, '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # 연속된 공백과 줄바꿈 정리
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    def crawl_pages(self, start_page=1, end_page=200, output_file='../data/oppadu_precise_qa.jsonl'):
        """지정된 페이지 범위의 데이터를 정밀하게 크롤링합니다."""
        all_data = []
        
        # 출력 디렉토리 생성
        os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
        
        print(f"=== 오빠두 정밀 크롤링 시작: {start_page}-{end_page} 페이지 ===")
        
        for page_num in range(start_page, end_page + 1):
            print(f"\n--- Processing page {page_num}/{end_page} ---")
            
            posts = self.get_page_list(page_num)
            
            if not posts:
                print(f"No posts found on page {page_num}")
                continue
            
            print(f"Found {len(posts)} posts on page {page_num}")
            
            for i, post in enumerate(posts):
                post_data = self.get_post_content(post['url'], post['title'])
                
                # 채택된 답변이 있는 게시물만 처리 (None이면 이미 스킵됨)
                if post_data:
                    # 질문 구성
                    question_parts = []
                    if post_data['title']:
                        question_parts.append(post_data['title'])
                    if post_data['content']:
                        question_parts.append(post_data['content'])
                    if post_data['version_info']:
                        question_parts.append(f"사용환경: {post_data['version_info']}")
                    
                    question = '\n'.join(question_parts)
                    
                    # 답변 구성 (채택된 답변만)
                    answer = '\n\n'.join(post_data['selected_answers'])
                    
                    # 품질 검증
                    if len(question) > 20 and len(answer) > 20:
                        qa_data = {
                            'question': question,
                            'answer': answer
                        }
                        
                        all_data.append(qa_data)
                        print(f"  ✓ Collected: {post_data['title'][:50]}...")
                        
                        # 중간 저장 (50개마다)
                        if len(all_data) % 50 == 0:
                            self.save_data(all_data, output_file)
                    else:
                        print(f"  ✗ Skipped (quality): {post['title'][:50]}...")
                # post_data가 None이면 이미 get_post_content에서 스킵 메시지를 출력함
                
                # Rate limiting
                time.sleep(2)  # 2초 대기 (서버 부하 고려)
            
            # 페이지 간 대기
            time.sleep(3)  # 3초 대기
            
            # 진행상황 저장
            self.save_data(all_data, output_file)
            print(f"Page {page_num} completed. Total collected: {len(all_data)} Q&A pairs")
            
            # 10페이지마다 통계 출력
            if page_num % 10 == 0:
                print(f"\n=== 중간 통계 (페이지 {page_num}) ===")
                print(f"총 수집: {len(all_data)}개")
                print(f"평균 페이지당: {len(all_data)/page_num:.1f}개")
                if all_data:
                    avg_q_len = sum(len(item['question']) for item in all_data) / len(all_data)
                    avg_a_len = sum(len(item['answer']) for item in all_data) / len(all_data)
                    print(f"평균 질문 길이: {avg_q_len:.0f}자")
                    print(f"평균 답변 길이: {avg_a_len:.0f}자")
        
        print(f"\n=== 크롤링 완료! ===")
        print(f"총 수집: {len(all_data)} Q&A pairs")
        print(f"출력 파일: {output_file}")
        
        return all_data
    
    def save_data(self, data, output_file):
        """데이터를 JSONL 형식으로 저장합니다."""
        with open(output_file, 'w', encoding='utf-8') as f:
            for item in data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        print(f"Data saved: {len(data)} items → {output_file}")

def main():
    crawler = OppaduCrawlerV2()
    
    # 1-200 페이지 전체 크롤링
    output_path = '../data/oppadu_precise_qa.jsonl'
    
    print("오빠두 정밀 크롤러 v2 시작!")
    print("- 채택된 답변만 수집")
    print("- 정확한 CSS 클래스 타겟팅")
    print("- 고품질 데이터만 저장")
    
    crawler.crawl_pages(start_page=1, end_page=200, output_file=output_path)
    
    # 수집 통계 출력
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            print(f"\n=== 최종 결과 ===")
            print(f"총 수집: {len(lines)}개 Q&A")
            
            # 품질 샘플 출력
            if lines:
                sample = json.loads(lines[0])
                print(f"\n샘플 데이터:")
                print(f"Question: {sample['question'][:100]}...")
                print(f"Answer: {sample['answer'][:100]}...")

if __name__ == "__main__":
    main() 