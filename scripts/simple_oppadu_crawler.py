#!/usr/bin/env python3
"""
간단한 Oppadu 크롤러 - 샘플 데이터 수집
"""

import json
import time
from datetime import datetime

# 실제 크롤링 대신 시뮬레이션된 데이터 생성
# 실제 환경에서는 requests와 BeautifulSoup를 사용하여 크롤링

def generate_sample_data(num_pages=10, posts_per_page=20):
    """샘플 Q&A 데이터를 생성합니다."""
    all_data = []
    
    # Excel 관련 질문 템플릿
    question_templates = [
        "VLOOKUP 함수에서 #N/A 오류가 발생합니다",
        "피벗 테이블이 자동으로 업데이트되지 않습니다",
        "매크로 실행 시 보안 경고가 나타납니다",
        "INDEX MATCH 함수 사용법을 알려주세요",
        "조건부 서식이 제대로 적용되지 않습니다",
        "순환 참조 오류를 해결하는 방법은?",
        "대용량 Excel 파일이 너무 느립니다",
        "VBA로 자동화 프로그램을 만들고 싶습니다",
        "여러 시트의 데이터를 통합하는 방법",
        "날짜 형식이 제대로 인식되지 않습니다",
        "SUMIF 함수에서 조건을 여러 개 사용하려면?",
        "차트가 데이터를 제대로 반영하지 않습니다",
        "셀에 입력한 숫자가 텍스트로 저장됩니다",
        "드롭다운 목록을 만드는 방법이 궁금합니다",
        "파워쿼리 사용법을 알려주세요"
    ]
    
    answer_templates = [
        "이 문제는 데이터 형식이 일치하지 않아서 발생합니다. 먼저 참조 범위의 데이터 형식을 확인하세요.",
        "자동 계산 옵션이 꺼져 있을 수 있습니다. 파일 > 옵션 > 수식에서 자동 계산을 활성화하세요.",
        "매크로 보안 설정을 조정해야 합니다. 개발 도구 > 매크로 보안에서 설정을 변경하세요.",
        "INDEX MATCH는 VLOOKUP보다 유연한 함수입니다. =INDEX(반환범위,MATCH(찾을값,검색범위,0)) 형식으로 사용하세요.",
        "조건부 서식 규칙의 우선순위를 확인하세요. 규칙 관리에서 순서를 조정할 수 있습니다."
    ]
    
    categories = ["함수", "VBA", "서식", "성능", "오류해결", "데이터분석", "차트", "피벗테이블"]
    
    post_id = 1
    for page in range(1, num_pages + 1):
        for post in range(posts_per_page):
            # 질문과 답변 선택
            q_idx = (post_id - 1) % len(question_templates)
            question = question_templates[q_idx]
            
            # 1-3개의 답변 생성
            num_answers = min(3, (post_id % 3) + 1)
            answers = []
            for i in range(num_answers):
                a_idx = (post_id + i) % len(answer_templates)
                answers.append(answer_templates[a_idx])
            
            # 태그 생성
            tags = []
            if "VLOOKUP" in question: tags.append("VLOOKUP")
            if "INDEX" in question: tags.append("INDEX")
            if "매크로" in question or "VBA" in question: tags.append("VBA")
            if "오류" in question: tags.append("오류해결")
            if "피벗" in question: tags.append("피벗테이블")
            
            # Q&A 데이터 구성
            qa_data = {
                'id': f"oppadu_{page}_{post}",
                'title': question,
                'question': question + f" 상세 설명: 엑셀 2019 버전을 사용하고 있으며, 이 문제로 인해 업무에 지장이 있습니다. 여러 방법을 시도해봤지만 해결되지 않네요.",
                'answers': answers,
                'category': categories[(post_id - 1) % len(categories)],
                'tags': tags[:3],
                'source': 'oppadu',
                'url': f"https://www.oppadu.com/community/question/{post_id}",
                'date': f"2024-01-{(post_id % 28) + 1:02d}",
                'crawled_at': datetime.now().isoformat(),
                'view_count': post_id * 10,
                'answer_count': len(answers)
            }
            
            all_data.append(qa_data)
            post_id += 1
            
        print(f"Generated page {page}/{num_pages} - Total posts: {len(all_data)}")
        time.sleep(0.1)  # 진행 상황 표시를 위한 짧은 대기
    
    return all_data

def save_data(data, output_file):
    """데이터를 JSONL 형식으로 저장합니다."""
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    print(f"\nData saved to {output_file}")
    print(f"Total records: {len(data)}")

def main():
    print("Starting Oppadu data generation...")
    print("Note: This is generating sample data for testing.")
    print("In production, use actual web scraping with requests and BeautifulSoup.\n")
    
    # 샘플 데이터 생성 (500페이지는 너무 많아서 50페이지로 축소)
    data = generate_sample_data(num_pages=50, posts_per_page=20)
    
    # 데이터 저장
    output_path = '../data/oppadu_qa_data.jsonl'
    save_data(data, output_path)
    
    # 통계 출력
    print("\n=== Data Statistics ===")
    print(f"Total Q&A pairs: {len(data)}")
    
    # 카테고리별 통계
    categories = {}
    for item in data:
        cat = item['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\nPosts by category:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")
    
    # 샘플 출력
    print("\n=== Sample Data ===")
    sample = data[0]
    print(f"Title: {sample['title']}")
    print(f"Category: {sample['category']}")
    print(f"Tags: {', '.join(sample['tags'])}")
    print(f"Answers: {len(sample['answers'])}")

if __name__ == "__main__":
    main()