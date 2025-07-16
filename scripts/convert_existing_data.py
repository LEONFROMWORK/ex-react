#!/usr/bin/env python3
"""
기존 수집된 QA 데이터를 AI 학습용 간단한 형식으로 변환합니다.
기존 형식: {id, title, question, answers, category, tags, source, url, date, ...}
새 형식: {question, answer}
"""

import json
import os
import re
from datetime import datetime

def clean_text(text):
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
    special_chars = ['🏠', '📢', '🖐️', '💬', '🚨', '💾', '🎯', '📚', '🟢', '📅', '👁', '📁', '📄', '💜', '✓', '✗']
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

def convert_file(input_file, output_file):
    """개별 파일을 변환합니다."""
    converted_count = 0
    skipped_count = 0
    
    print(f"Converting {input_file}...")
    
    # 백업 생성
    backup_file = f"{input_file}.backup"
    if not os.path.exists(backup_file):
        os.rename(input_file, backup_file)
        print(f"Original file backed up as {backup_file}")
    
    converted_data = []
    
    try:
        with open(backup_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line.strip())
                    
                    # 질문 생성 (제목 + 내용)
                    question_parts = []
                    if 'title' in data and data['title']:
                        question_parts.append(data['title'])
                    if 'question' in data and data['question']:
                        question_parts.append(data['question'])
                    
                    question = '\n'.join(question_parts)
                    question = clean_text(question)
                    
                    # 답변 생성
                    answer = ""
                    if 'answers' in data and data['answers']:
                        if isinstance(data['answers'], list):
                            answer = '\n\n'.join(data['answers'])
                        else:
                            answer = str(data['answers'])
                    
                    answer = clean_text(answer)
                    
                    # 유효한 질문과 답변이 있는 경우만 저장
                    if len(question) > 30 and len(answer) > 20:
                        converted_item = {
                            'question': question,
                            'answer': answer
                        }
                        converted_data.append(converted_item)
                        converted_count += 1
                    else:
                        skipped_count += 1
                        
                except json.JSONDecodeError as e:
                    print(f"  Warning: JSON decode error at line {line_num}: {e}")
                    skipped_count += 1
                except Exception as e:
                    print(f"  Warning: Error processing line {line_num}: {e}")
                    skipped_count += 1
    
    except Exception as e:
        print(f"Error reading file {backup_file}: {e}")
        return 0, 0
    
    # 변환된 데이터 저장
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            for item in converted_data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        print(f"  ✓ Converted: {converted_count} items")
        print(f"  ✗ Skipped: {skipped_count} items")
        print(f"  → Output: {output_file}")
    except Exception as e:
        print(f"Error writing to {output_file}: {e}")
        return 0, 0
    
    return converted_count, skipped_count

def main():
    data_dir = '../data'
    
    # 변환할 파일 목록
    files_to_convert = [
        'oppadu_qa_data.jsonl',
        'reddit_qa_data.jsonl',
        'reddit_qa_data_part2.jsonl'
    ]
    
    total_converted = 0
    total_skipped = 0
    
    print("=== AI 학습용 데이터 변환 시작 ===\n")
    
    for filename in files_to_convert:
        input_path = os.path.join(data_dir, filename)
        
        if not os.path.exists(input_path):
            print(f"File not found: {input_path}")
            continue
        
        # 출력 파일명 생성
        base_name = filename.replace('.jsonl', '')
        output_filename = f"{base_name}_simple.jsonl"
        output_path = os.path.join(data_dir, output_filename)
        
        converted, skipped = convert_file(input_path, output_path)
        total_converted += converted
        total_skipped += skipped
        
        print()
    
    print("=== 변환 완료 ===")
    print(f"총 변환된 항목: {total_converted}")
    print(f"총 건너뛴 항목: {total_skipped}")
    
    # 변환된 파일들의 샘플 출력
    print("\n=== 변환 결과 샘플 ===")
    
    simple_files = []
    for filename in files_to_convert:
        base_name = filename.replace('.jsonl', '')
        output_filename = f"{base_name}_simple.jsonl"
        output_path = os.path.join(data_dir, output_filename)
        if os.path.exists(output_path):
            simple_files.append(output_path)
    
    for simple_file in simple_files:
        print(f"\n--- {os.path.basename(simple_file)} ---")
        try:
            with open(simple_file, 'r', encoding='utf-8') as f:
                first_line = f.readline()
                if first_line:
                    sample = json.loads(first_line)
                    print(f"Question: {sample['question'][:150]}...")
                    print(f"Answer: {sample['answer'][:150]}...")
        except Exception as e:
            print(f"Error reading sample: {e}")

if __name__ == "__main__":
    main() 