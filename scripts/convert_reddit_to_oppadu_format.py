#!/usr/bin/env python3
"""
Reddit Excel pain points 데이터를 Oppadu Q&A 형식으로 변환
"""

import json
import os
from datetime import datetime

def convert_reddit_to_qa_format(input_file, output_file):
    """Reddit 데이터를 Q&A 형식으로 변환합니다."""
    
    # 입력 파일 읽기
    with open(input_file, 'r', encoding='utf-8') as f:
        reddit_data = json.load(f)
    
    converted_data = []
    
    for i, post in enumerate(reddit_data['posts']):
        # 카테고리 매핑
        category_map = {
            'Pivot Table': '피벗테이블',
            'Formula/Function': '함수',
            'General': '일반',
            'Data Import/Export': '데이터처리',
            'VBA/Macro': 'VBA',
            'Formatting': '서식'
        }
        
        # 태그 추출 (제목과 내용에서 키워드 추출)
        tags = []
        title_lower = post['title'].lower()
        content_lower = post['content'].lower()
        
        # Excel 함수 검색
        excel_functions = ['vlookup', 'index', 'match', 'sumif', 'countif', 'pivot', 'average', 'sum']
        for func in excel_functions:
            if func in title_lower or func in content_lower:
                tags.append(func.upper())
        
        # 오류 관련 태그
        if 'error' in title_lower or 'error' in content_lower:
            tags.append('오류')
        if '#n/a' in content_lower or 'n/a' in content_lower:
            tags.append('#N/A')
        
        # VBA 관련
        if 'vba' in title_lower or 'macro' in title_lower:
            tags.append('VBA')
            
        # 차트 관련
        if 'chart' in title_lower or 'graph' in title_lower:
            tags.append('차트')
            
        # 시간/날짜 관련
        if 'date' in title_lower or 'time' in title_lower:
            tags.append('날짜/시간')
        
        # 기본 답변 생성 (실제로는 AI가 생성해야 하지만, 여기서는 템플릿 사용)
        answer = generate_answer_template(post['title'], post['content'], post['pain_point_type'])
        
        # Q&A 형식으로 변환
        qa_item = {
            'id': f"reddit_{i+1}",
            'title': post['title'],
            'question': post['content'][:1000],  # 최대 1000자
            'answers': [answer],  # 답변은 배열 형식
            'category': category_map.get(post['pain_point_type'], '일반'),
            'tags': list(set(tags))[:5],  # 중복 제거, 최대 5개
            'source': 'reddit_excel',
            'url': post['url'],
            'date': post['created_at'],
            'crawled_at': datetime.now().isoformat(),
            'view_count': post['upvotes'] * 10,  # 추정치
            'answer_count': post['comments']
        }
        
        converted_data.append(qa_item)
    
    # JSONL 형식으로 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in converted_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    print(f"Converted {len(converted_data)} Reddit posts to Q&A format")
    print(f"Output saved to: {output_file}")
    
    return converted_data

def generate_answer_template(title, content, pain_type):
    """문제 유형에 따른 템플릿 답변 생성"""
    
    if 'pivot' in title.lower():
        return """피벗 테이블/차트 문제 해결 방법:
1. 데이터 범위 확인: 피벗 테이블의 데이터 소스가 올바른지 확인하세요.
2. 빈 셀 확인: 데이터에 빈 셀이 있으면 피벗 차트가 제대로 표시되지 않을 수 있습니다.
3. 그룹화 확인: 날짜나 숫자 필드가 올바르게 그룹화되어 있는지 확인하세요.
4. 필터 확인: 피벗 테이블에 필터가 적용되어 일부 데이터가 숨겨져 있을 수 있습니다.
5. 차트 유형: 라인 차트의 경우 연속된 데이터가 필요합니다. 데이터 구조를 확인하세요."""
    
    elif 'time' in title.lower() or 'date' in title.lower():
        return """시간/날짜 형식 변환 방법:
1. 시간을 숫자로 변환: 시간 값에 24를 곱하면 시간 단위의 숫자가 됩니다.
2. 예시: =A1*24 (A1이 시간 형식인 경우)
3. 급여 계산: =(시간*24)*시급
4. TEXT 함수 사용: =TEXT(A1,"[h]:mm")로 시간 형식 유지
5. 날짜 차이 계산: =DATEDIF(시작일,종료일,"D")"""
    
    elif 'match' in content.lower() or 'lookup' in content.lower():
        return """데이터 매칭/검색 해결 방법:
1. INDEX/MATCH 조합 사용: =INDEX(반환범위,MATCH(찾는값,검색범위,1))
2. 근사 일치: MATCH 함수의 세 번째 인수를 1로 설정 (오름차순 정렬 필요)
3. XLOOKUP 사용 (Excel 365): =XLOOKUP(찾는값,검색범위,반환범위,,"근사일치")
4. 날짜 비교시 주의: 날짜 형식이 일치하는지 확인
5. 배열 수식 활용: Ctrl+Shift+Enter로 배열 수식 입력"""
    
    elif 'vba' in content.lower() or 'macro' in content.lower():
        return """VBA/매크로 문제 해결:
1. 보안 설정 확인: 파일 > 옵션 > 보안 센터에서 매크로 설정 확인
2. 신뢰할 수 있는 위치에 파일 저장
3. 디지털 서명 확인
4. VBA 에디터에서 디버그: F8 키로 한 줄씩 실행
5. 참조 확인: VBA 에디터 > 도구 > 참조에서 누락된 참조 확인"""
    
    else:
        return """일반적인 Excel 문제 해결 방법:
1. 데이터 형식 확인: 셀 서식이 올바른지 확인하세요.
2. 수식 확인: 수식에 오류가 없는지, 참조가 올바른지 확인하세요.
3. 필터/정렬 확인: 숨겨진 행이나 필터가 적용되어 있는지 확인하세요.
4. 계산 옵션: 파일 > 옵션 > 수식에서 자동 계산이 활성화되어 있는지 확인하세요.
5. Excel 재시작: 때로는 Excel을 재시작하면 문제가 해결됩니다."""

def main():
    # 경로 설정
    input_file = '/Users/kevin/excel_pain_points_simple.json'
    output_file = '/Users/kevin/excelapp/data/reddit_qa_data.jsonl'
    
    # 디렉토리 확인
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # 변환 실행
    converted_data = convert_reddit_to_qa_format(input_file, output_file)
    
    # 통계 출력
    print("\n=== Conversion Statistics ===")
    print(f"Total posts converted: {len(converted_data)}")
    
    # 카테고리별 통계
    categories = {}
    for item in converted_data:
        cat = item['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\nPosts by category:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")
    
    # 샘플 출력
    if converted_data:
        print("\n=== Sample Converted Data ===")
        sample = converted_data[0]
        print(f"Title: {sample['title']}")
        print(f"Category: {sample['category']}")
        print(f"Tags: {', '.join(sample['tags'])}")
        print(f"Answer preview: {sample['answers'][0][:200]}...")

if __name__ == "__main__":
    main()