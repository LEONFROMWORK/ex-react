#!/usr/bin/env python3
"""
개선된 크롤러 1페이지 테스트
"""

from oppadu_crawler_v4_improved import OppaduCrawlerV4Improved

def main():
    crawler = OppaduCrawlerV4Improved()
    
    print("=== 개선된 크롤러 (v4 improved) 1페이지 테스트 ===")
    print("기존 v4 베이스 + 개선된 시간 정보 제거")
    print("답변 길이: 30-600자 (채택답변), 40-500자 (일반답변)")
    print()
    
    total_collected = crawler.crawl_pages(
        start_page=1, 
        end_page=1, 
        output_file='../data/oppadu_test_improved.jsonl'
    )
    
    print(f"\n✅ 테스트 완료: {total_collected}개 수집")
    
    if total_collected > 0:
        print("\n📊 데이터 품질 확인:")
        # 테스트 데이터 읽기
        import json
        with open('../data/oppadu_test_improved.jsonl', 'r', encoding='utf-8') as f:
            test_data = [json.loads(line) for line in f]
        
        print(f"수집된 항목: {len(test_data)}개")
        if test_data:
            avg_q_len = sum(len(item['question']) for item in test_data) / len(test_data)
            avg_a_len = sum(len(item['answer']) for item in test_data) / len(test_data)
            print(f"평균 질문 길이: {avg_q_len:.0f}자")
            print(f"평균 답변 길이: {avg_a_len:.0f}자")
            
            print(f"\n🔍 첫 번째 항목 미리보기:")
            print(f"질문: {test_data[0]['question'][:100]}...")
            print(f"답변: {test_data[0]['answer'][:100]}...")
        
        print("\n🚀 테스트 성공! 전체 수집을 시작하시겠습니까?")
        print("전체 수집 명령어:")
        print("python3 oppadu_crawler_v4_improved.py &")

if __name__ == "__main__":
    main() 