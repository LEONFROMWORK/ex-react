#!/usr/bin/env python3
"""
개선된 크롤러 실시간 모니터링
"""

import os
import json
import time
from datetime import datetime

def monitor_crawler():
    data_file = '../data/oppadu_improved_qa.jsonl'
    log_file = 'crawler_improved.log'
    
    print("🔍 개선된 오빠두 크롤러 실시간 모니터링")
    print("=" * 60)
    
    start_time = datetime.now()
    
    while True:
        try:
            # 현재 시간
            current_time = datetime.now()
            elapsed = current_time - start_time
            
            print(f"\n⏰ 현재 시간: {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"⌛ 경과 시간: {elapsed}")
            
            # 프로세스 상태 확인
            if os.system("ps aux | grep oppadu_crawler_v4_improved | grep -v grep > /dev/null") == 0:
                print("🟢 크롤러 상태: 실행 중")
            else:
                print("🔴 크롤러 상태: 정지됨")
            
            # 데이터 파일 확인
            if os.path.exists(data_file):
                with open(data_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    total_count = len(lines)
                
                print(f"📊 현재 수집량: {total_count}개 Q&A")
                
                if total_count > 0:
                    # 최근 데이터 분석
                    try:
                        recent_data = [json.loads(line) for line in lines[-min(10, total_count):]]
                        
                        avg_q_len = sum(len(item['question']) for item in recent_data) / len(recent_data)
                        avg_a_len = sum(len(item['answer']) for item in recent_data) / len(recent_data)
                        
                        print(f"📝 최근 10개 평균 질문 길이: {avg_q_len:.0f}자")
                        print(f"💬 최근 10개 평균 답변 길이: {avg_a_len:.0f}자")
                        
                        # 수집 속도 추정
                        if total_count > 0 and elapsed.total_seconds() > 0:
                            rate = total_count / (elapsed.total_seconds() / 3600)  # 시간당
                            estimated_total_time = 300 * 7 / rate if rate > 0 else 0  # 예상 총 시간 (7개/페이지 가정)
                            
                            print(f"🚀 수집 속도: {rate:.1f}개/시간")
                            if estimated_total_time > 0:
                                print(f"⏱️  예상 완료 시간: {estimated_total_time:.1f}시간")
                    
                    except Exception as e:
                        print(f"⚠️  데이터 분석 오류: {e}")
                
                # 파일 크기
                file_size = os.path.getsize(data_file)
                print(f"💾 파일 크기: {file_size / 1024:.1f} KB")
            else:
                print("⚠️  데이터 파일이 아직 생성되지 않았습니다")
            
            # 로그 파일 확인 (마지막 5줄)
            if os.path.exists(log_file):
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    if lines:
                        print(f"\n📋 최근 로그 (마지막 3줄):")
                        for line in lines[-3:]:
                            print(f"   {line.strip()}")
            
            print("\n" + "=" * 60)
            print("💡 종료하려면 Ctrl+C를 누르세요")
            
            # 30초 대기
            time.sleep(30)
            
        except KeyboardInterrupt:
            print(f"\n👋 모니터링을 종료합니다.")
            
            # 최종 통계
            if os.path.exists(data_file):
                with open(data_file, 'r', encoding='utf-8') as f:
                    final_count = len(f.readlines())
                print(f"🎯 최종 수집량: {final_count}개 Q&A")
            
            break
        except Exception as e:
            print(f"❌ 모니터링 오류: {e}")
            time.sleep(10)

if __name__ == "__main__":
    monitor_crawler() 