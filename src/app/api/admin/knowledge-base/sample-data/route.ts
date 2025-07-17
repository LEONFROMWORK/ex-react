import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { AuthPermissionService } from '@/lib/services/auth-permission.service'

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 권한 확인
    const permissionService = AuthPermissionService.getInstance()
    const userRole = await permissionService.getUserRole(session.user.id)
    
    if (!permissionService.hasPermission(userRole, 'canAccessAdmin')) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    // URL 파라미터로 형식 확인
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'jsonl'

    if (format === 'bigdata') {
      // BigData 수집기 형식 샘플
      const bigDataSample = generateBigDataSample()
      const jsonContent = JSON.stringify(bigDataSample, null, 2)
      
      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="sample-bigdata-format.json"',
        },
      })
    } else {
      // 기존 JSONL 형식
      const sampleData = generateSampleData()
      const jsonlContent = sampleData.map(item => JSON.stringify(item)).join('\n')
      
      return new NextResponse(jsonlContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="sample-excel-qa-data.jsonl"',
        },
      })
    }
  } catch (error) {
    console.error('샘플 데이터 생성 실패:', error)
    return NextResponse.json(
      { error: '샘플 데이터 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}

function generateSampleData() {
  return [
    {
      id: "excel_qa_001",
      question: "VLOOKUP 함수에서 #N/A 오류가 발생합니다. 어떻게 해결하나요?",
      answer: "VLOOKUP #N/A 오류는 다음과 같은 원인으로 발생할 수 있습니다:\n\n1. **데이터 형식 불일치**: 찾는 값과 검색 범위의 데이터 형식이 다른 경우\n   - 해결: =VLOOKUP(TRIM(A1), B:D, 2, FALSE)\n   - 또는 =VLOOKUP(VALUE(A1), B:D, 2, FALSE)\n\n2. **공백 문자 존재**: 보이지 않는 공백이나 특수 문자\n   - 해결: TRIM 함수 사용\n\n3. **정확한 일치 없음**: 검색 값이 테이블에 존재하지 않는 경우\n   - 해결: =IFERROR(VLOOKUP(A1, B:D, 2, FALSE), \"찾을 수 없음\")\n\n4. **절대 참조 문제**: 수식 복사 시 범위가 변경되는 경우\n   - 해결: =VLOOKUP(A1, $B$1:$D$100, 2, FALSE)",
      category: "함수오류",
      quality_score: 0.92,
      source: "oppadu",
      tags: ["vlookup", "na오류", "함수오류", "데이터형식"],
      metadata: {
        difficulty: "intermediate",
        excel_version: "all",
        view_count: 1523,
        helpful_votes: 45
      }
    },
    {
      id: "excel_qa_002",
      question: "피벗 테이블이 자동으로 업데이트되지 않습니다. 새로운 데이터를 추가했는데 반영이 안 돼요.",
      answer: "피벗 테이블 자동 업데이트 문제는 다음과 같이 해결할 수 있습니다:\n\n**수동 새로고침 방법:**\n1. 피벗 테이블 클릭 → 우클릭 → '새로 고침'\n2. 또는 데이터 탭 → '모두 새로 고침'\n3. 단축키: Alt + F5\n\n**자동 새로고침 설정:**\n1. 피벗 테이블 우클릭 → '피벗 테이블 옵션'\n2. '데이터' 탭에서 '파일을 열 때 새로 고침' 체크\n3. '새로 고침할 때마다 열 너비 자동 조정' 체크\n\n**데이터 범위 확장:**\n- 테이블 형식으로 변환 (Ctrl+T)\n- 또는 동적 범위 사용: =OFFSET($A$1,0,0,COUNTA($A:$A),3)\n\n**VBA 자동화:**\n```vba\nPrivate Sub Worksheet_Change(ByVal Target As Range)\n    ThisWorkbook.RefreshAll\nEnd Sub\n```",
      category: "피벗테이블",
      quality_score: 0.89,
      source: "oppadu",
      tags: ["피벗테이블", "새로고침", "자동업데이트", "데이터범위"],
      metadata: {
        difficulty: "intermediate",
        excel_version: "2016+",
        view_count: 2341,
        helpful_votes: 67
      }
    },
    {
      id: "excel_qa_003",
      question: "VBA 매크로를 실행하면 '매크로가 비활성화되었습니다' 메시지가 나옵니다.",
      answer: "VBA 매크로 비활성화 문제 해결 방법:\n\n**1. 매크로 보안 설정 변경:**\n- 파일 → 옵션 → 보안 센터 → 보안 센터 설정\n- 매크로 설정에서 '알림과 함께 모든 매크로 사용 안 함' 선택\n- 또는 '디지털 서명된 매크로 제외하고 모든 매크로 사용 안 함'\n\n**2. 현재 세션에서만 활성화:**\n- 노란색 보안 경고 바에서 '콘텐츠 사용' 클릭\n- 또는 파일 → 정보 → '콘텐츠 사용' 버튼 클릭\n\n**3. 신뢰할 수 있는 위치 추가:**\n- 보안 센터 → 신뢰할 수 있는 위치\n- '새 위치 추가'로 매크로 파일이 있는 폴더 등록\n\n**4. 파일 확장자 확인:**\n- .xlsm (매크로 포함 통합 문서)\n- .xlam (매크로 포함 추가 기능)\n- .xls (이전 버전 형식)\n\n**주의사항:**\n- 신뢰할 수 없는 출처의 매크로는 실행하지 마세요\n- 매크로 실행 전 코드 검토를 권장합니다",
      category: "VBA",
      quality_score: 0.87,
      source: "reddit",
      tags: ["vba", "매크로", "보안", "활성화"],
      metadata: {
        difficulty: "beginner",
        excel_version: "all",
        view_count: 892,
        helpful_votes: 23
      }
    },
    {
      id: "excel_qa_004",
      question: "조건부 서식이 적용된 셀을 복사하면 서식이 함께 복사되지 않습니다.",
      answer: "조건부 서식 복사 문제 해결 방법:\n\n**1. 선택하여 붙여넣기 사용:**\n- 원본 셀 복사 (Ctrl+C)\n- 대상 셀 선택\n- 우클릭 → '선택하여 붙여넣기' → '서식' 또는 '조건부 서식'\n- 또는 홈 탭 → 서식 복사 도구 사용\n\n**2. 서식 브러시 사용:**\n- 조건부 서식이 적용된 셀 선택\n- 홈 탭 → 서식 브러시 (또는 Ctrl+Shift+C)\n- 대상 셀에 클릭 (또는 Ctrl+Shift+V)\n\n**3. 조건부 서식 규칙 복사:**\n- 홈 탭 → 조건부 서식 → 규칙 관리\n- 기존 규칙 복사 → 새 규칙 생성\n- 적용 범위 수정\n\n**4. 상대 참조 문제 해결:**\n- 조건부 서식 규칙에서 절대 참조($) 사용\n- 예: =$A$1>100 (절대) vs =A1>100 (상대)\n\n**5. 일괄 적용 방법:**\n- 전체 범위 선택 → 조건부 서식 → 새 규칙\n- 수식 사용하여 서식을 지정할 셀 결정\n- 범위 전체에 일괄 적용",
      category: "서식",
      quality_score: 0.85,
      source: "oppadu",
      tags: ["조건부서식", "복사", "서식브러시", "규칙관리"],
      metadata: {
        difficulty: "intermediate",
        excel_version: "all",
        view_count: 1156,
        helpful_votes: 34
      }
    },
    {
      id: "excel_qa_005",
      question: "대용량 Excel 파일이 너무 느려서 작업하기 어렵습니다. 성능을 개선하는 방법이 있나요?",
      answer: "Excel 성능 최적화 방법:\n\n**1. 수식 최적화:**\n- VLOOKUP 대신 INDEX/MATCH 사용\n- 배열 수식 최소화\n- 휘발성 함수 (NOW, TODAY, RAND) 사용 줄이기\n- 계산 모드를 수동으로 변경 (F9로 수동 계산)\n\n**2. 데이터 정리:**\n- 불필요한 행/열 삭제\n- 사용하지 않는 시트 삭제\n- 빈 셀에 입력된 공백 제거\n- 조건부 서식 규칙 정리\n\n**3. 파일 최적화:**\n- 파일 → 옵션 → 고급 → '파일 저장' 섹션\n- '빠른 저장' 옵션 해제\n- 이미지 압축 (그림 도구 → 압축)\n- 파일 형식을 .xlsx로 변경\n\n**4. 메모리 관리:**\n- 다른 프로그램 종료\n- Excel 재시작\n- 64비트 Excel 사용 (대용량 파일)\n\n**5. 하드웨어 최적화:**\n- SSD 사용\n- RAM 증설\n- 파일을 로컬 드라이브에 저장\n\n**6. 분할 작업:**\n- 큰 파일을 여러 개로 분할\n- 파워 쿼리 사용하여 외부 데이터 연결\n- 데이터베이스 사용 고려",
      category: "성능",
      quality_score: 0.91,
      source: "reddit",
      tags: ["성능최적화", "대용량파일", "속도개선", "메모리관리"],
      metadata: {
        difficulty: "advanced",
        excel_version: "all",
        view_count: 3241,
        helpful_votes: 89
      }
    }
  ]
}

function generateBigDataSample() {
  return {
    metadata: {
      exportDate: new Date().toISOString(),
      version: "1.0.0",
      totalItems: 7,
      stats: {
        stackOverflow: {
          totalQuestions: 3,
          processedQuestions: 3,
          averageQuality: 87.3
        },
        reddit: {
          totalPosts: 2,
          processedPosts: 2,
          averageQuality: 84.5
        },
        synthetic: {
          generatedItems: 2,
          averageQuality: 90.0
        }
      }
    },
    qaData: [
      {
        id: "so_789456123",
        source: "stackoverflow",
        question: "VLOOKUP 함수에서 #N/A 오류가 발생합니다. 어떻게 해결하나요?",
        answer: "VLOOKUP #N/A 오류는 여러 원인으로 발생할 수 있습니다:\n\n1. **데이터 형식 불일치**: 찾는 값과 검색 범위의 데이터 형식이 다른 경우\n   - 해결: `=VLOOKUP(TRIM(A1), B:D, 2, FALSE)`\n   - 또는 `=VLOOKUP(VALUE(A1), B:D, 2, FALSE)`\n\n2. **공백 문자 존재**: 보이지 않는 공백이나 특수 문자\n   - 해결: TRIM 함수 사용\n\n3. **정확한 일치 없음**: 검색 값이 테이블에 존재하지 않는 경우\n   - 해결: `=IFERROR(VLOOKUP(A1, B:D, 2, FALSE), \"찾을 수 없음\")`",
        metadata: {
          originalId: "789456123",
          url: "https://stackoverflow.com/questions/789456123",
          author: "excel_expert_2023",
          score: 45,
          tags: ["excel", "vlookup", "error-handling", "na-error"],
          category: "함수오류",
          difficulty: "intermediate",
          hasCode: true,
          hasFormula: true,
          language: "ko"
        },
        qualityScore: {
          technical: 88,
          completeness: 92,
          clarity: 85,
          usefulness: 90,
          total: 89
        },
        createdAt: "2024-01-15T10:30:00.000Z",
        updatedAt: "2024-01-15T10:30:00.000Z"
      },
      {
        id: "reddit_r_excel_abc123",
        source: "reddit",
        question: "피벗 테이블이 자동으로 업데이트되지 않습니다. 새로운 데이터를 추가했는데 반영이 안 돼요.",
        answer: "피벗 테이블 자동 업데이트 문제는 다음과 같이 해결할 수 있습니다:\n\n**수동 새로고침 방법:**\n1. 피벗 테이블 클릭 → 우클릭 → '새로 고침'\n2. 또는 데이터 탭 → '모두 새로 고침'\n3. 단축키: Alt + F5\n\n**자동 새로고침 설정:**\n1. 피벗 테이블 우클릭 → '피벗 테이블 옵션'\n2. '데이터' 탭에서 '파일을 열 때 새로 고침' 체크\n\n**데이터 범위 확장:**\n- 테이블 형식으로 변환 (Ctrl+T)\n- 또는 동적 범위 사용",
        metadata: {
          originalId: "abc123",
          url: "https://reddit.com/r/excel/comments/abc123",
          author: "data_analyst_pro",
          score: 67,
          tags: ["pivot-table", "refresh", "automation", "data-range"],
          category: "피벗테이블",
          difficulty: "intermediate",
          hasCode: false,
          hasFormula: false,
          language: "ko"
        },
        qualityScore: {
          technical: 82,
          completeness: 88,
          clarity: 90,
          usefulness: 85,
          total: 86
        },
        createdAt: "2024-01-16T14:22:00.000Z",
        updatedAt: "2024-01-16T14:22:00.000Z"
      },
      {
        id: "synthetic_001",
        source: "synthetic",
        question: "조건부 서식에서 여러 조건을 동시에 적용하는 방법이 궁금합니다.",
        answer: "조건부 서식에서 여러 조건을 적용하는 방법:\n\n**1. AND 조건 (모든 조건 만족):**\n```\n=AND($A1>100, $B1<50)\n```\n\n**2. OR 조건 (하나 이상 조건 만족):**\n```\n=OR($A1>100, $B1<50)\n```\n\n**3. 복합 조건 예시:**\n```\n=AND($A1>100, $B1<50, $C1=\"완료\")\n```\n\n**4. 여러 규칙 설정:**\n- 홈 탭 → 조건부 서식 → 새 규칙\n- 각 조건에 대해 별도 규칙 생성\n- 우선순위는 규칙 관리에서 조정",
        metadata: {
          originalId: "synthetic_001",
          author: "ai_system",
          score: 0,
          tags: ["conditional-formatting", "multiple-conditions", "and-or", "rules"],
          category: "서식",
          difficulty: "intermediate",
          hasCode: true,
          hasFormula: true,
          language: "ko"
        },
        qualityScore: {
          technical: 90,
          completeness: 88,
          clarity: 92,
          usefulness: 89,
          total: 90
        },
        createdAt: "2024-01-17T09:15:00.000Z",
        updatedAt: "2024-01-17T09:15:00.000Z"
      }
    ],
    chainSolutions: [
      {
        id: "chain_reddit_xyz789",
        steps: [
          {
            stepNumber: 1,
            author: "user1",
            content: "VBA 매크로가 실행되지 않습니다. 보안 설정을 확인했는데도 안 되네요.",
            score: 2,
            timestamp: "2024-01-18T10:00:00.000Z"
          },
          {
            stepNumber: 2,
            author: "excel_master",
            content: "매크로 보안 설정 외에도 몇 가지 확인해야 할 것들이 있습니다. 먼저 파일 확장자가 .xlsm인지 확인해보세요.",
            score: 5,
            timestamp: "2024-01-18T10:15:00.000Z"
          },
          {
            stepNumber: 3,
            author: "user1",
            content: "파일 확장자는 .xlsm이 맞습니다. 그런데 여전히 안 되네요.",
            score: 1,
            timestamp: "2024-01-18T10:20:00.000Z"
          },
          {
            stepNumber: 4,
            author: "vba_expert",
            content: "그럼 개발자 탭이 활성화되어 있는지 확인해보세요. 파일 → 옵션 → 리본 사용자 지정에서 개발자 탭을 체크하세요. 그리고 매크로 설정도 다시 한번 확인해보시기 바랍니다.",
            score: 8,
            timestamp: "2024-01-18T10:30:00.000Z"
          },
          {
            stepNumber: 5,
            author: "user1",
            content: "개발자 탭을 활성화하니까 됐습니다! 감사합니다.",
            score: 3,
            timestamp: "2024-01-18T10:35:00.000Z"
          }
        ],
        participants: ["user1", "excel_master", "vba_expert"],
        totalScore: 19,
        chainLength: 5,
        integratedContent: "VBA 매크로 실행 문제 해결 가이드:\n\n1. **파일 확장자 확인**: .xlsm 형식인지 확인\n2. **매크로 보안 설정**: 파일 → 옵션 → 보안 센터에서 매크로 설정 확인\n3. **개발자 탭 활성화**: 파일 → 옵션 → 리본 사용자 지정에서 개발자 탭 체크\n4. **신뢰할 수 있는 위치**: 파일이 있는 폴더를 신뢰할 수 있는 위치로 추가\n\n이 단계들을 순서대로 확인하면 대부분의 VBA 매크로 실행 문제를 해결할 수 있습니다.",
        metadata: {
          sourceUrl: "https://reddit.com/r/excel/comments/xyz789",
          originalPostId: "xyz789",
          isComplete: true,
          hasAcceptedAnswer: true,
          qualityScore: 85
        }
      }
    ]
  }
}