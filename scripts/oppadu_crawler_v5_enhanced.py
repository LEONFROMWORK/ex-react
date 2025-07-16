#!/usr/bin/env python3
"""
오빠두 게시판 강화 크롤러 (v5) - 고품질 데이터 전용
- 강화된 시간 정보 제거
- 개선된 답변 길이 필터링 (50-500자)
- 강화된 노이즈 제거
- 엄격한 Excel 키워드 필터링
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
from datetime import datetime
from urllib.parse import urljoin, urlparse, parse_qs
import re

class OppaduCrawlerV5Enhanced:
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
        
        # Excel 키워드 확장
        self.excel_keywords = [
            # 핵심 함수들
            'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'IF', 'SUMIF', 'COUNTIF',
            'SUMIFS', 'COUNTIFS', 'AVERAGEIF', 'AVERAGEIFS', 'IFERROR', 'ISERROR',
            'SUM', 'COUNT', 'AVERAGE', 'MAX', 'MIN', 'CONCATENATE', 'LEFT', 'RIGHT',
            'MID', 'LEN', 'FIND', 'SEARCH', 'SUBSTITUTE', 'REPLACE', 'TRIM',
            'UPPER', 'LOWER', 'PROPER', 'TODAY', 'NOW', 'DATE', 'TIME',
            'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
            
            # 한글 키워드들
            '엑셀', '함수', '수식', '셀', '시트', '워크시트', '피벗테이블', '피벗',
            '차트', '그래프', '매크로', 'VBA', '조건부서식', '데이터검증',
            '필터', '정렬', '범위', '참조', '절대참조', '상대참조', '혼합참조',
            '서식', '조건', '계산', '공식', '입력', '출력', '인쇄', '페이지설정',
            
            # 특수 기호들
            '=', '$', '#REF!', '#VALUE!', '#NAME?', '#DIV/0!', '#N/A', '#NULL!',
            
            # 키보드 조합
            'Ctrl+', 'Alt+', 'Shift+', 'F2', 'F4', 'F9', 'F11', 'F12'
        ]
        
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
    
    def enhanced_clean_text(self, text):
        """강화된 텍스트 정리 - 시간 정보 완전 제거"""
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
        
        # 4. 강화된 시간/날짜 정보 제거
        time_patterns = [
            # 날짜 패턴들
            r'\d{4}[.-/]\d{1,2}[.-/]\d{1,2}',     # YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD
            r'\d{1,2}[.-/]\d{1,2}[.-/]\d{4}',     # MM-DD-YYYY, MM.DD.YYYY, MM/DD/YYYY
            r'\d{4}\s*\d{1,2}\s*\d{1,2}',         # YYYY MM DD (공백 구분)
            r'\d{1,2}\s*\d{1,2}\s*\d{4}',         # MM DD YYYY (공백 구분)
            
            # 시간 패턴들
            r'\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM|오전|오후))?',  # HH:MM, HH:MM:SS, AM/PM
            r'\d{1,2}시\s*\d{1,2}분(\s*\d{1,2}초)?',          # N시 N분 N초
            
            # 상대 시간 패턴들
            r'\d+\s*(초|분|시간|일|주|개월|년)\s*(전|후|뒤|지나서)',
            r'\d+\s*(second|minute|hour|day|week|month|year)s?\s*(ago|later)',
            
            # 텍스트 끝 숫자 패턴들 (시간 정보로 추정)
            r'\s+\d{1,2}\s+\d{1,2}$',             # 끝에 "숫자 숫자" (예: " 6 2")
            r'\s+\d{1,2}$',                       # 끝에 단일 숫자 (예: " 12")
            r'\d{1,2}\s*\d{1,2}$',                # 끝에 붙어있는 숫자들 (예: "12 2")
            
            # 기타 시간 관련
            r'작성일시?[:：]\s*\d+',
            r'등록일시?[:：]\s*\d+',
            r'수정일시?[:：]\s*\d+',
            r'\d+\.\d+\.\d+\s*\d+:\d+',
            
            # Lv, 레벨 정보
            r'Lv\.\s*\d+',
            r'레벨\s*\d+',
            r'LV\s*\d+',
        ]
        
        for pattern in time_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
        
        # 5. 오빠두 특화 노이즈 패턴 제거 (확장)
        noise_patterns = [
            r'오빠두엑셀.*?커뮤니티',
            r'엑셀강의.*?대표채널',
            r'좋아요\s*\d+',
            r'댓글\s*\d+',
            r'조회\s*\d+',
            r'추천\s*\d+',
            r'스크랩\s*\d+',
            r'신고',
            r'채택된\s*답변',
            r'채택\s*완료',
            r'베스트\s*답변',
            r'@\w+님?',
            r'@[가-힣]+님?',
            r'질문자\s*:?',
            r'답변자\s*:?',
            r'작성자\s*:?',
            r'글쓴이\s*:?',
            r'https?://[^\s]+',          # URL
            r'www\.[^\s]+',              # www 링크
            r'[가-힣]+\.com[^\s]*',       # 한글도메인
            r'첨부파일\s*:?',
            r'파일\s*첨부',
            r'이미지\s*첨부',
            r'스크린샷',
            r'캡처',
            r'그림\s*\d*',
            r'이미지\s*\d*',
            r'출처\s*:?',
            r'참고\s*:?',
            r'Source\s*:?',
            r'※.*?※',                   # 주석 표시
            r'\[.*?\]',                  # 대괄호 내용
            r'【.*?】',                   # 특수 괄호
            r'★.*?★',                   # 별표 내용
            r'▶.*?◀',                   # 화살표 내용
        ]
        
        for pattern in noise_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
        
        # 6. 연속된 공백과 줄바꿈 정리
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n', text)
        
        # 7. 특수문자 연속 제거
        text = re.sub(r'[^\w\s가-힣=\(\)\[\]\{\}\+\-\*\/\.\,\?\!]{2,}', ' ', text)
        
        # 8. 앞뒤 공백 제거
        text = text.strip()
        
        return text
    
    def has_excel_relevance(self, text):
        """Excel 관련성을 더 엄격하게 확인합니다."""
        if not text:
            return False
        
        text_lower = text.lower()
        
        # Excel 키워드 개수 계산
        keyword_count = 0
        for keyword in self.excel_keywords:
            if keyword.lower() in text_lower:
                keyword_count += 1
        
        # 최소 2개 이상의 Excel 키워드가 있어야 함
        if keyword_count < 2:
            return False
        
        # 또는 핵심 Excel 함수가 있으면 통과
        core_functions = ['=', 'VLOOKUP', 'IF', 'SUM', 'COUNT', 'INDEX', 'MATCH']
        if any(func in text for func in core_functions):
            return True
        
        # 또는 엑셀 관련 한글 키워드가 충분히 있으면 통과
        korean_excel_words = ['엑셀', '함수', '수식', '셀', '시트', '워크시트']
        korean_count = sum(1 for word in korean_excel_words if word in text)
        
        return korean_count >= 2
    
    def is_high_quality_answer(self, answer_text):
        """고품질 답변인지 더 엄격하게 확인합니다."""
        if not answer_text:
            return False
        
        # 1. 길이 확인 (50-500자로 제한)
        if len(answer_text) < 50 or len(answer_text) > 500:
            return False
        
        # 2. Excel 관련성 확인
        if not self.has_excel_relevance(answer_text):
            return False
        
        # 3. 저품질 패턴 확인
        low_quality_patterns = [
            r'^[\d\s\.\-=\+\*\/\(\)]+$',     # 숫자와 기호만
            r'^[가-힣]{1,10}$',              # 너무 짧은 한글만
            r'^\w{1,15}$',                   # 너무 짧은 영문만
            r'^[\?\!\.\,\s]+$',              # 특수문자만
            r'^(감사|고마워|알겠어|네|예|맞아|그래|아니|모름).*?$',  # 너무 간단한 답변
            r'^(thanks?|yes|no|ok|good)\s*$',  # 영문 간단 답변
            r'^\s*\?\s*$',                   # 물음표만
            r'^\s*\!\s*$',                   # 느낌표만
        ]
        
        for pattern in low_quality_patterns:
            if re.match(pattern, answer_text, re.IGNORECASE):
                return False
        
        # 4. 도움되는 키워드가 있는지 확인
        helpful_patterns = [
            r'[가-힣]+함수',                 # ~함수
            r'=\w+\(',                      # 함수 호출
            r'셀\s*[A-Z]\d+',                # 셀 참조
            r'시트\d*',                     # 시트 언급
            r'방법',                        # 방법 설명
            r'어떻게',                      # 설명
            r'단계',                        # 단계별 설명
        ]
        
        helpful_count = sum(1 for pattern in helpful_patterns 
                          if re.search(pattern, answer_text, re.IGNORECASE))
        
        return helpful_count >= 1
    
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
                    question_title = self.enhanced_clean_text(elem.get_text())
                    break
            
            if not question_title:
                question_title = self.enhanced_clean_text(post_title)
            
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
                    question_content = self.enhanced_clean_text(elem.get_text())
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
                    answer_text = self.enhanced_clean_text(elem.get_text())
                    
                    # 고품질 검증
                    if self.is_high_quality_answer(answer_text):
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
                        answer_text = self.enhanced_clean_text(elem.get_text())
                        
                        # 더 엄격한 고품질 검증
                        if self.is_high_quality_answer(answer_text):
                            selected_answers.append(answer_text)
                            break  # 첫 번째 좋은 답변만
                    
                    if selected_answers:
                        break
            
            # 답변이 없으면 스킵
            if not selected_answers:
                print(f"    ✗ No high-quality answers found")
                return None
            
            # 5. 최종 검증
            final_question = self.build_question(question_title, question_content)
            final_answer = selected_answers[0]  # 첫 번째 답변만
            
            # 질문도 Excel 관련성 확인
            if (len(final_question) < 20 or 
                not self.has_excel_relevance(final_question)):
                print(f"    ✗ Question quality/relevance check failed")
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
    
    def crawl_pages(self, start_page=1, end_page=300, output_file='../data/oppadu_enhanced_qa.jsonl'):
        """강화된 고품질 데이터를 수집합니다."""
        all_data = []
        
        # 출력 디렉토리 생성
        os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
        
        print(f"=== 오빠두 강화 크롤링 (v5): {start_page}-{end_page} 페이지 ===")
        print(f"출력 파일: {output_file}")
        print(f"답변 길이 제한: 50-500자")
        print(f"Excel 키워드 필수: {len(self.excel_keywords)}개 키워드 pool")
        
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
                    
                    # 5개마다 중간 저장
                    if len(all_data) % 5 == 0:
                        self.save_data(all_data, output_file)
                
                # Rate limiting
                time.sleep(2.5)
            
            print(f"Page {page_num}: {page_success}/{len(posts)} collected (총 {len(all_data)}개)")
            
            # 페이지마다 저장
            if all_data:
                self.save_data(all_data, output_file)
            
            # 페이지 간 대기
            time.sleep(3)
            
            # 5페이지마다 통계
            if page_num % 5 == 0 and all_data:
                print(f"\n=== 진행통계 (페이지 {page_num}) ===")
                print(f"총 수집: {len(all_data)}개")
                print(f"평균: {len(all_data)/page_num:.1f}개/페이지")
                
                avg_q_len = sum(len(item['question']) for item in all_data) / len(all_data)
                avg_a_len = sum(len(item['answer']) for item in all_data) / len(all_data)
                print(f"평균 질문 길이: {avg_q_len:.0f}자")
                print(f"평균 답변 길이: {avg_a_len:.0f}자")
                
                # Excel 키워드 통계
                excel_questions = sum(1 for item in all_data if self.has_excel_relevance(item['question']))
                excel_answers = sum(1 for item in all_data if self.has_excel_relevance(item['answer']))
                print(f"Excel 관련 질문: {excel_questions}/{len(all_data)} ({excel_questions/len(all_data)*100:.1f}%)")
                print(f"Excel 관련 답변: {excel_answers}/{len(all_data)} ({excel_answers/len(all_data)*100:.1f}%)")
        
        # 최종 저장
        if all_data:
            self.save_data(all_data, output_file)
            
            # 최종 통계
            print(f"\n📊 최종 품질 통계:")
            avg_q_len = sum(len(item['question']) for item in all_data) / len(all_data)
            avg_a_len = sum(len(item['answer']) for item in all_data) / len(all_data)
            print(f"평균 질문 길이: {avg_q_len:.0f}자")
            print(f"평균 답변 길이: {avg_a_len:.0f}자")
            
            short_answers = sum(1 for item in all_data if len(item['answer']) < 100)
            long_answers = sum(1 for item in all_data if len(item['answer']) > 300)
            print(f"짧은 답변 (<100자): {short_answers}/{len(all_data)} ({short_answers/len(all_data)*100:.1f}%)")
            print(f"긴 답변 (>300자): {long_answers}/{len(all_data)} ({long_answers/len(all_data)*100:.1f}%)")
            
        print(f"\n🎉 강화 크롤링 완료!")
        print(f"총 수집: {len(all_data)}개 고품질 Q&A")
        print(f"파일: {output_file}")
        
        return len(all_data)

def main():
    crawler = OppaduCrawlerV5Enhanced()
    total_collected = crawler.crawl_pages(1, 300)
    print(f"\n최종 결과: {total_collected}개 강화된 고품질 Q&A 수집 완료")

if __name__ == "__main__":
    main() 