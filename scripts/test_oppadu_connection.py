#!/usr/bin/env python3
"""
오빠두 웹사이트 연결 테스트
"""

import requests
from bs4 import BeautifulSoup
import time

def test_oppadu_connection():
    """오빠두 웹사이트 연결을 테스트합니다."""
    
    base_url = "https://www.oppadu.com"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
    }
    
    session = requests.Session()
    session.headers.update(headers)
    
    print("=== 오빠두 웹사이트 연결 테스트 ===")
    
    # 1. 메인 페이지 테스트
    try:
        print(f"\n1. 메인 페이지 테스트: {base_url}")
        response = session.get(base_url, timeout=10)
        print(f"   상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            title = soup.find('title')
            print(f"   페이지 제목: {title.get_text() if title else 'N/A'}")
            
            # 커뮤니티 링크 찾기
            community_links = soup.find_all('a', href=True)
            community_urls = []
            for link in community_links:
                href = link.get('href', '')
                text = link.get_text(strip=True)
                if any(keyword in href.lower() or keyword in text.lower() 
                       for keyword in ['community', 'question', '질문', '게시판', 'forum']):
                    community_urls.append({
                        'text': text,
                        'url': href if href.startswith('http') else base_url + href
                    })
            
            print(f"   커뮤니티 관련 링크: {len(community_urls)}개 발견")
            for i, link in enumerate(community_urls[:5]):
                print(f"     {i+1}. {link['text']} -> {link['url']}")
        else:
            print(f"   오류: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"   연결 실패: {e}")
    
    # 2. 질문 게시판 직접 테스트
    question_urls = [
        "https://www.oppadu.com/community/question/",
        "https://www.oppadu.com/community/question/?pg=1",
        "https://oppadu.com/community/question/",
        "https://oppadu.com/community/",
        "https://www.oppadu.com/community/",
    ]
    
    for i, url in enumerate(question_urls):
        try:
            print(f"\n{i+2}. 질문 게시판 테스트: {url}")
            response = session.get(url, timeout=10)
            print(f"   상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # 게시글 링크 찾기
                post_links = []
                for link in soup.find_all('a', href=True):
                    href = link.get('href', '')
                    if 'no=' in href and 'question' in href:
                        post_links.append(href)
                
                print(f"   게시글 링크: {len(post_links)}개 발견")
                if post_links:
                    print(f"   첫 번째 게시글: {post_links[0]}")
                
                # 제목 확인
                title = soup.find('title')
                if title:
                    print(f"   페이지 제목: {title.get_text()}")
                
                # 성공한 URL 저장
                if len(post_links) > 0:
                    print(f"   ✅ 유효한 게시판 URL 발견!")
                    return url
                    
            else:
                print(f"   오류: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   연결 실패: {e}")
        
        time.sleep(1)  # 요청 간 대기
    
    print(f"\n❌ 모든 URL 테스트 실패")
    return None

if __name__ == "__main__":
    working_url = test_oppadu_connection()
    if working_url:
        print(f"\n🎉 작동하는 URL: {working_url}")
    else:
        print(f"\n💡 대안:")
        print(f"   1. 직접 oppadu.com 접속해서 URL 확인")
        print(f"   2. 다른 한국 엑셀 커뮤니티 사이트 이용")
        print(f"   3. 네이버 카페나 다른 플랫폼의 엑셀 Q&A 수집") 