#!/usr/bin/env python3
"""
데이터 정리 및 재시작 스크립트
- 기존 저품질 데이터 완전 삭제
- 새로운 고품질 크롤링 준비
"""

import os
import json
from datetime import datetime



def clean_data_directory():
    """잘못 수집된 저품질 데이터를 완전히 삭제합니다."""
    data_dir = '../data'
    
    # 삭제할 오빠두 저품질 파일들 (Reddit 데이터는 유지)
    files_to_remove = [
        'oppadu_qa_data.jsonl',           # 원본 저품질 오빠두 데이터
        'oppadu_qa_data_simple.jsonl',    # 변환된 저품질 오빠두 데이터
        'oppadu_simple_qa.jsonl',         # 변환된 저품질 오빠두 데이터
    ]
    
    removed_count = 0
    for filename in files_to_remove:
        filepath = os.path.join(data_dir, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f"✗ 삭제됨: {filename}")
            removed_count += 1
    
    print(f"\n총 {removed_count}개 저품질 파일 완전 삭제 완료")

def wait_for_new_data():
    """새로운 크롤링 데이터를 기다립니다."""
    data_dir = '../data'
    new_file = os.path.join(data_dir, 'oppadu_precise_qa.jsonl')
    
    print(f"\n새로운 고품질 데이터 대기 중...")
    print(f"대상 파일: {new_file}")
    
    if os.path.exists(new_file):
        with open(new_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            print(f"✓ 새로운 데이터 발견: {len(lines)}개 Q&A")
            
            # 샘플 출력
            if lines:
                sample = json.loads(lines[0])
                print(f"\n샘플 품질 확인:")
                print(f"Question: {sample['question'][:100]}...")
                print(f"Answer: {sample['answer'][:100]}...")
                return True
    else:
        print("아직 새로운 데이터가 생성되지 않았습니다.")
        print("oppadu_crawler_v2.py가 실행 중인지 확인하세요.")
        return False

def validate_new_data():
    """새로운 데이터의 품질을 검증합니다."""
    data_dir = '../data'
    new_file = os.path.join(data_dir, 'oppadu_precise_qa.jsonl')
    
    if not os.path.exists(new_file):
        print("새로운 데이터 파일이 없습니다.")
        return False
    
    try:
        with open(new_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        if len(lines) == 0:
            print("데이터 파일이 비어있습니다.")
            return False
        
        # 샘플 검증
        valid_count = 0
        for i, line in enumerate(lines[:10]):  # 처음 10개 샘플 검증
            try:
                data = json.loads(line)
                if ('question' in data and 'answer' in data and 
                    len(data['question']) > 20 and len(data['answer']) > 20):
                    valid_count += 1
            except:
                pass
        
        quality_ratio = valid_count / min(10, len(lines))
        
        print(f"\n=== 데이터 품질 검증 ===")
        print(f"총 라인 수: {len(lines)}")
        print(f"샘플 검증: {valid_count}/10")
        print(f"품질 비율: {quality_ratio*100:.1f}%")
        
        if quality_ratio >= 0.8:
            print("✓ 고품질 데이터 확인됨")
            return True
        else:
            print("✗ 데이터 품질이 낮습니다")
            return False
            
    except Exception as e:
        print(f"데이터 검증 중 오류: {e}")
        return False

def create_final_dataset():
    """최종 AI 학습용 데이터셋을 생성합니다."""
    data_dir = '../data'
    
    # 모든 고품질 데이터 수집
    sources = [
        ('oppadu_precise_qa.jsonl', 'oppadu_v2'),
        ('reddit_qa_data.jsonl', 'reddit'),
        ('reddit_qa_data_part2.jsonl', 'reddit')
    ]
    
    final_data = []
    
    for filename, source in sources:
        filepath = os.path.join(data_dir, filename)
        if os.path.exists(filepath):
            print(f"Processing {filename}...")
            
            with open(filepath, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    try:
                        data = json.loads(line.strip())
                        
                        # 오빠두 v2 데이터는 이미 정리됨
                        if source == 'oppadu_v2':
                            if 'question' in data and 'answer' in data:
                                final_data.append({
                                    'question': data['question'],
                                    'answer': data['answer']
                                })
                        
                        # Reddit 데이터는 기존 형식에서 변환
                        else:
                            question_parts = []
                            if 'title' in data and data['title']:
                                question_parts.append(data['title'])
                            if 'question' in data and data['question']:
                                question_parts.append(data['question'])
                            
                            question = '\n'.join(question_parts)
                            
                            answer = ""
                            if 'answers' in data and data['answers']:
                                if isinstance(data['answers'], list):
                                    answer = '\n\n'.join(data['answers'])
                                else:
                                    answer = str(data['answers'])
                            
                            if len(question) > 20 and len(answer) > 20:
                                final_data.append({
                                    'question': question,
                                    'answer': answer
                                })
                        
                    except Exception as e:
                        print(f"  Error processing line {line_num}: {e}")
            
            print(f"  Added {len([d for d in final_data if d]) - len(final_data)} items from {filename}")
    
    # 최종 파일 저장
    final_file = os.path.join(data_dir, 'final_ai_training_data.jsonl')
    with open(final_file, 'w', encoding='utf-8') as f:
        for item in final_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    print(f"\n=== 최종 데이터셋 생성 완료 ===")
    print(f"파일: {final_file}")
    print(f"총 Q&A 쌍: {len(final_data)}")
    
    # 품질 통계
    if final_data:
        avg_q_len = sum(len(item['question']) for item in final_data) / len(final_data)
        avg_a_len = sum(len(item['answer']) for item in final_data) / len(final_data)
        print(f"평균 질문 길이: {avg_q_len:.0f}자")
        print(f"평균 답변 길이: {avg_a_len:.0f}자")
    
    return final_file

def main():
    print("=== 오빠두 데이터 정리 및 재시작 ===\n")
    
    # 1. 저품질 데이터 완전 삭제
    print("1. 저품질 데이터 완전 삭제...")
    clean_data_directory()
    
    # 2. 새로운 데이터 확인
    print("\n2. 새로운 크롤링 데이터 확인...")
    if wait_for_new_data():
        # 3. 데이터 품질 검증
        print("\n3. 데이터 품질 검증...")
        if validate_new_data():
            # 4. 최종 데이터셋 생성
            print("\n4. 최종 AI 학습용 데이터셋 생성...")
            final_file = create_final_dataset()
            
            print(f"\n🎉 모든 작업 완료!")
            print(f"최종 데이터: {final_file}")
        else:
            print("\n❌ 데이터 품질이 기준에 미달합니다.")
    else:
        print("\n⏳ 새로운 크롤링이 완료될 때까지 기다려주세요.")

if __name__ == "__main__":
    main() 