#!/usr/bin/env python3
"""
오빠두 웹사이트 HTML 구조 분석
"""

import requests
from bs4 import BeautifulSoup
import re

def analyze_oppadu_structure():
    """오빠두 웹사이트의 HTML 구조를 분석합니다."""
    
    url = "https://www.oppadu.com/community/question/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
    }
    
    session = requests.Session()
    session.headers.update(headers)
    
    print("=== 오빠두 HTML 구조 분석 ===")
    print(f"분석 URL: {url}")
    
    try:
        response = session.get(url, timeout=15)
        print(f"상태 코드: {response.status_code}")
        
        if response.status_code != 200:
            print("페이지 로드 실패")
            return
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 1. 모든 링크 분석
        print(f"\n1. 모든 링크 분석:")
        all_links = soup.find_all('a', href=True)
        print(f"총 링크 개수: {len(all_links)}")
        
        # 패턴별 분류
        patterns = {
            'view.php': [],
            'question': [],
            'no=': [],
            'idx=': [],
            'id=': [],
            'post': [],
            'board': [],
            'topic': [],
            'thread': [],
        }
        
        for link in all_links:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            for pattern, links_list in patterns.items():
                if pattern in href.lower():
                    links_list.append({
                        'href': href,
                        'text': text[:50] + '...' if len(text) > 50 else text
                    })
        
        # 패턴별 결과 출력
        for pattern, links_list in patterns.items():
            if links_list:
                print(f"\n'{pattern}' 패턴 링크: {len(links_list)}개")
                for i, link in enumerate(links_list[:3]):
                    print(f"  {i+1}. {link['text']} -> {link['href']}")
        
        # 2. 게시글로 보이는 링크 찾기
        print(f"\n2. 게시글 후보 링크:")
        post_candidates = []
        
        for link in all_links:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            # 게시글일 가능성이 높은 조건들
            if (len(text) > 10 and  # 제목이 어느 정도 길이가 있음
                not any(skip in text.lower() for skip in ['home', 'menu', 'login', 'register', 'search', '로그인', '회원가입', '검색', '홈', '메뉴']) and  # 네비게이션 요소가 아님
                not href.startswith('#') and  # 앵커 링크가 아님
                href not in ['/', '/community/', '/community/question/'] and  # 메인 페이지가 아님
                '?' in href or 'view' in href.lower() or 'post' in href.lower() or 'topic' in href.lower()):  # 게시글 링크 패턴
                
                post_candidates.append({
                    'href': href,
                    'text': text
                })
        
        print(f"게시글 후보: {len(post_candidates)}개")
        for i, candidate in enumerate(post_candidates[:10]):
            print(f"  {i+1}. {candidate['text'][:60]}...")
            print(f"      URL: {candidate['href']}")
        
        # 3. 특정 CSS 클래스나 구조 찾기
        print(f"\n3. CSS 구조 분석:")
        
        # 리스트 구조 찾기
        lists = soup.find_all(['ul', 'ol', 'div'], class_=True)
        for i, element in enumerate(lists[:10]):
            class_name = element.get('class', [])
            children_with_links = element.find_all('a', href=True)
            if len(children_with_links) > 2:
                print(f"  리스트 {i+1}: class='{' '.join(class_name)}', 링크 {len(children_with_links)}개")
        
        # 테이블 구조 찾기
        tables = soup.find_all('table')
        for i, table in enumerate(tables):
            rows = table.find_all('tr')
            links_in_table = table.find_all('a', href=True)
            if len(links_in_table) > 2:
                print(f"  테이블 {i+1}: {len(rows)}행, 링크 {len(links_in_table)}개")
        
        # 4. 페이지네이션 찾기
        print(f"\n4. 페이지네이션 분석:")
        pagination_keywords = ['page', 'pg', 'next', 'prev', '다음', '이전', '페이지']
        pagination_links = []
        
        for link in all_links:
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            if any(keyword in href.lower() or keyword in text.lower() for keyword in pagination_keywords):
                pagination_links.append({
                    'href': href,
                    'text': text
                })
        
        print(f"페이지네이션 링크: {len(pagination_links)}개")
        for link in pagination_links[:5]:
            print(f"  {link['text']} -> {link['href']}")
        
        # 5. HTML 샘플 출력 (디버깅용)
        print(f"\n5. HTML 샘플 (처음 2000자):")
        html_content = str(soup)[:2000]
        print(html_content)
        
        return post_candidates, pagination_links
        
    except Exception as e:
        print(f"분석 실패: {e}")
        return [], []

if __name__ == "__main__":
    posts, pagination = analyze_oppadu_structure()
    
    if posts:
        print(f"\n🎉 게시글 후보 {len(posts)}개 발견!")
        print(f"첫 번째 게시글 URL 패턴: {posts[0]['href']}")
    else:
        print(f"\n❌ 게시글을 찾을 수 없습니다.")
        print(f"사이트가 JavaScript로 동적 로딩하거나 다른 구조일 수 있습니다.") 