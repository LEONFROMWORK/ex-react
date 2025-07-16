#!/usr/bin/env python3
"""
VBA 분석 Python 스크립트
oletools를 사용하여 VBA 코드를 추출하고 분석합니다.
"""

import sys
import json
import re
from typing import Dict, List, Any

try:
    from oletools.olevba import VBA_Parser
except ImportError:
    print(json.dumps({
        'error': 'oletools not installed. Please run: pip install oletools'
    }))
    sys.exit(1)

def analyze_vba(file_path: str) -> Dict[str, Any]:
    """VBA 코드를 분석하여 보안 위험, 성능 문제 등을 검출"""
    results = {
        'modules': [],
        'securityRisks': [],
        'performanceIssues': [],
        'codeQuality': [],
        'summary': {
            'totalModules': 0,
            'totalLines': 0,
            'riskLevel': 'low',
            'performanceScore': 100,
            'qualityScore': 100
        }
    }
    
    try:
        vba_parser = VBA_Parser(file_path)
        
        if not vba_parser.detect_vba_macros():
            results['error'] = 'No VBA macros found in file'
            return results
        
        # VBA 모듈 추출
        for (filename, stream_path, vba_filename, vba_code) in vba_parser.extract_all_macros():
            if vba_code:
                module_info = analyze_module(vba_filename, vba_code)
                results['modules'].append(module_info)
                
                # 보안 위험 검사
                security_risks = check_security_risks(vba_filename, vba_code)
                results['securityRisks'].extend(security_risks)
                
                # 성능 문제 검사
                performance_issues = check_performance_issues(vba_filename, vba_code)
                results['performanceIssues'].extend(performance_issues)
                
                # 코드 품질 검사
                quality_issues = check_code_quality(vba_filename, vba_code)
                results['codeQuality'].extend(quality_issues)
        
        # 요약 정보 업데이트
        results['summary']['totalModules'] = len(results['modules'])
        results['summary']['totalLines'] = sum(m['lineCount'] for m in results['modules'])
        results['summary']['riskLevel'] = calculate_risk_level(results['securityRisks'])
        results['summary']['performanceScore'] = calculate_performance_score(results['performanceIssues'])
        results['summary']['qualityScore'] = calculate_quality_score(results['codeQuality'])
        
        vba_parser.close()
        
    except Exception as e:
        results['error'] = str(e)
    
    return results

def analyze_module(name: str, code: str) -> Dict[str, Any]:
    """개별 VBA 모듈 분석"""
    lines = code.split('\n')
    
    # 모듈 타입 판별
    module_type = 'Standard'
    if 'Class Module' in code[:100]:
        module_type = 'Class'
    elif 'UserForm' in code[:100]:
        module_type = 'Form'
    
    return {
        'name': name,
        'type': module_type,
        'lineCount': len(lines),
        'code': code[:1000] + '...' if len(code) > 1000 else code  # 처음 1000자만
    }

def check_security_risks(module_name: str, code: str) -> List[Dict[str, Any]]:
    """보안 위험 검사"""
    risks = []
    
    # 위험한 패턴 정의
    dangerous_patterns = [
        {
            'pattern': r'Shell\s*\(',
            'description': '시스템 명령 실행 가능',
            'severity': 'high',
            'suggestion': '시스템 명령 실행은 보안 위험이 있습니다. 필요한 경우 제한된 권한으로 실행하세요.'
        },
        {
            'pattern': r'CreateObject\s*\(\s*["\']WScript\.Shell["\']',
            'description': 'Windows 스크립트 실행 가능',
            'severity': 'high',
            'suggestion': 'WScript.Shell 사용은 위험합니다. 다른 방법을 고려하세요.'
        },
        {
            'pattern': r'Kill\s+',
            'description': '파일 삭제 기능',
            'severity': 'medium',
            'suggestion': '파일 삭제 전 사용자 확인을 받고, 삭제 대상을 명확히 제한하세요.'
        },
        {
            'pattern': r'Open\s+.*\s+For\s+Output',
            'description': '파일 쓰기 작업',
            'severity': 'medium',
            'suggestion': '파일 쓰기는 지정된 경로에만 수행하도록 제한하세요.'
        },
        {
            'pattern': r'SendKeys',
            'description': '키보드 입력 시뮬레이션',
            'severity': 'medium',
            'suggestion': 'SendKeys는 예측 불가능합니다. API나 다른 방법을 사용하세요.'
        },
        {
            'pattern': r'GetObject\s*\(',
            'description': '외부 객체 접근',
            'severity': 'low',
            'suggestion': '외부 객체 접근 시 오류 처리를 추가하세요.'
        }
    ]
    
    lines = code.split('\n')
    for i, line in enumerate(lines, 1):
        for pattern_info in dangerous_patterns:
            if re.search(pattern_info['pattern'], line, re.IGNORECASE):
                risks.append({
                    'pattern': pattern_info['pattern'],
                    'description': pattern_info['description'],
                    'severity': pattern_info['severity'],
                    'module': module_name,
                    'line': i,
                    'suggestion': pattern_info['suggestion']
                })
    
    return risks

def check_performance_issues(module_name: str, code: str) -> List[Dict[str, Any]]:
    """성능 문제 검사"""
    issues = []
    
    # 셀 단위 루프 검사
    if re.search(r'For\s+\w+\s*=.*\s+To\s+.*[\r\n]+.*Cells\s*\(', code, re.IGNORECASE | re.MULTILINE):
        issues.append({
            'type': 'cell_loop',
            'module': module_name,
            'description': '셀 단위 루프 사용',
            'impact': 'high',
            'suggestion': '범위를 배열로 읽어서 처리하면 100배 이상 빠릅니다.\n예: Dim arr As Variant\narr = Range("A1:A1000").Value'
        })
    
    # Select/Activate 사용 검사
    select_count = len(re.findall(r'\.(Select|Activate)\b', code, re.IGNORECASE))
    if select_count > 0:
        issues.append({
            'type': 'select_usage',
            'module': module_name,
            'description': f'Select/Activate {select_count}회 사용',
            'impact': 'medium',
            'suggestion': '직접 참조를 사용하세요.\n나쁜 예: Range("A1").Select\nSelection.Value = 10\n좋은 예: Range("A1").Value = 10'
        })
    
    # ScreenUpdating 최적화 검사
    if 'ScreenUpdating' not in code and len(code) > 500:
        issues.append({
            'type': 'screen_updating',
            'module': module_name,
            'description': '화면 업데이트 최적화 없음',
            'impact': 'medium',
            'suggestion': '매크로 시작 시 Application.ScreenUpdating = False 추가'
        })
    
    # 변수 선언 검사
    if 'Option Explicit' not in code:
        issues.append({
            'type': 'option_explicit',
            'module': module_name,
            'description': 'Option Explicit 없음',
            'impact': 'low',
            'suggestion': '모듈 최상단에 Option Explicit 추가하여 변수 선언을 강제하세요'
        })
    
    return issues

def check_code_quality(module_name: str, code: str) -> List[Dict[str, Any]]:
    """코드 품질 검사"""
    issues = []
    
    # 함수/서브루틴 길이 검사
    routines = re.findall(r'(Sub|Function)\s+(\w+).*?End\s+(Sub|Function)', code, re.IGNORECASE | re.DOTALL)
    for routine in routines:
        routine_code = routine[0]
        lines = routine_code.count('\n')
        if lines > 50:
            issues.append({
                'issue': f'{routine[1]} 함수가 너무 깁니다 ({lines}줄)',
                'type': 'complexity',
                'module': module_name,
                'suggestion': '함수를 더 작은 단위로 분리하세요'
            })
    
    # 주석 비율 검사
    total_lines = len(code.split('\n'))
    comment_lines = len(re.findall(r"^\s*'", code, re.MULTILINE))
    if total_lines > 20 and comment_lines / total_lines < 0.1:
        issues.append({
            'issue': '주석이 부족합니다',
            'type': 'documentation',
            'module': module_name,
            'suggestion': '코드의 10% 이상은 주석으로 문서화하세요'
        })
    
    # 변수명 규칙 검사
    poor_names = re.findall(r'\b(a|b|c|x|y|z|temp|tmp)\b\s*(?:As|=)', code, re.IGNORECASE)
    if poor_names:
        issues.append({
            'issue': '의미 없는 변수명 사용',
            'type': 'naming',
            'module': module_name,
            'suggestion': '변수명은 의미를 명확히 나타내도록 작성하세요'
        })
    
    return issues

def calculate_risk_level(risks: List[Dict[str, Any]]) -> str:
    """전체 위험 수준 계산"""
    high_risks = sum(1 for r in risks if r['severity'] == 'high')
    medium_risks = sum(1 for r in risks if r['severity'] == 'medium')
    
    if high_risks > 0:
        return 'high'
    elif medium_risks > 2:
        return 'medium'
    else:
        return 'low'

def calculate_performance_score(issues: List[Dict[str, Any]]) -> int:
    """성능 점수 계산 (100점 만점)"""
    score = 100
    
    for issue in issues:
        if issue['impact'] == 'high':
            score -= 20
        elif issue['impact'] == 'medium':
            score -= 10
        else:
            score -= 5
    
    return max(0, score)

def calculate_quality_score(issues: List[Dict[str, Any]]) -> int:
    """코드 품질 점수 계산 (100점 만점)"""
    score = 100
    
    # 이슈당 5점 감점
    score -= len(issues) * 5
    
    return max(0, score)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No file path provided'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = analyze_vba(file_path)
    
    # JSON 출력
    print(json.dumps(result, ensure_ascii=False, indent=2))