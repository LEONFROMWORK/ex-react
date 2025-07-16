#!/usr/bin/env python3
"""
강화된 크롤러 1페이지 테스트
"""

from oppadu_crawler_v5_enhanced import OppaduCrawlerV5Enhanced

def main():
    crawler = OppaduCrawlerV5Enhanced()
    
    print("=== 강화된 크롤러 1페이지 테스트 ===")
    print("답변 길이: 50-500자")
    print("Excel 키워드 필수")
    print("강화된 시간 정보 제거")
    print()
    
    total_collected = crawler.crawl_pages(
        start_page=1, 
        end_page=1, 
        output_file='../data/oppadu_test_v5.jsonl'
    )
    
    print(f"\n✅ 테스트 완료: {total_collected}개 수집")
    
    if total_collected > 0:
        print("\n🚀 테스트 성공! 전체 수집을 시작하시겠습니까?")
        print("전체 수집 명령어:")
        print("python3 oppadu_crawler_v5_enhanced.py")

if __name__ == "__main__":
    main() 