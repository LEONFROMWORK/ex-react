import { test, expect } from '@playwright/test'

test.describe('통합2 시스템 E2E 테스트', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 환경 설정
    await page.goto('http://localhost:3000')
    
    // 테스트 사용자로 로그인 (mock 세션)
    await page.addInitScript(() => {
      localStorage.setItem('testUser', JSON.stringify({
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      }))
    })
  })

  test.describe('홈페이지', () => {
    test('FAQ 섹션이 표시되어야 함', async ({ page }) => {
      await page.goto('/')
      
      // FAQ 섹션 확인
      await expect(page.locator('text=자주 묻는 질문')).toBeVisible()
      
      // 아코디언 항목 확인
      await expect(page.locator('text=할 수 있는 것')).toBeVisible()
      await expect(page.locator('text=부분적으로 가능한 것')).toBeVisible()
      await expect(page.locator('text=할 수 없는 것')).toBeVisible()
      
      // 아코디언 동작 테스트
      await page.click('text=할 수 있는 것')
      await expect(page.locator('text=순환 참조 오류 감지')).toBeVisible()
    })

    test('Excel 분석기로 이동 가능해야 함', async ({ page }) => {
      await page.goto('/')
      
      // 분석 시작 버튼 클릭
      await page.click('text=Excel 분석 시작')
      
      // /dashboard/excel-analyzer로 이동 확인
      await expect(page).toHaveURL(/.*dashboard.*excel-analyzer/)
    })
  })

  test.describe('파일 분석 기능', () => {
    test('Excel 파일 업로드 및 분석', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      
      // 파일 분석 탭 선택
      await page.click('text=파일 분석')
      
      // 테스트 Excel 파일 생성
      const buffer = Buffer.from('test excel content')
      const file = {
        name: 'test.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: buffer
      }
      
      // 파일 업로드
      await page.setInputFiles('input[type="file"]', {
        name: file.name,
        mimeType: file.mimeType,
        buffer: file.buffer
      })
      
      // 분석 버튼 클릭
      await page.click('button:has-text("분석 시작")')
      
      // 결과 대기 (mock 응답)
      await page.waitForSelector('text=분석 완료', { timeout: 5000 })
    })

    test('VBA 파일 특별 처리', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      
      // VBA 파일 업로드
      const vbaFile = {
        name: 'macro.xlsm',
        mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
        buffer: Buffer.from('vba content')
      }
      
      await page.setInputFiles('input[type="file"]', {
        name: vbaFile.name,
        mimeType: vbaFile.mimeType,
        buffer: vbaFile.buffer
      })
      
      await page.click('button:has-text("분석 시작")')
      
      // VBA 분석 결과 확인
      await expect(page.locator('text=VBA 분석')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Q&A 기능', () => {
    test('질문 입력 및 답변 받기', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      
      // Q&A 탭 선택
      await page.click('text=질문하기')
      
      // 질문 입력
      await page.fill('textarea[placeholder*="Excel 관련 질문"]', 'VLOOKUP에서 #N/A 오류가 발생합니다')
      
      // 검색 버튼 클릭
      await page.click('button:has-text("검색")')
      
      // 답변 대기
      await expect(page.locator('text=답변')).toBeVisible({ timeout: 5000 })
      
      // 관련 키워드 확인
      await expect(page.locator('text=VLOOKUP')).toBeVisible()
      await expect(page.locator('text=#N/A')).toBeVisible()
    })

    test('카테고리 분류 확인', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      await page.click('text=질문하기')
      
      // 다양한 질문 테스트
      const testCases = [
        { question: '순환 참조 오류 해결', category: '오류해결' },
        { question: '피벗 테이블 만들기', category: '피벗' },
        { question: 'VBA 매크로 실행 오류', category: 'VBA' }
      ]
      
      for (const testCase of testCases) {
        await page.fill('textarea[placeholder*="Excel 관련 질문"]', testCase.question)
        await page.click('button:has-text("검색")')
        
        // 카테고리 표시 확인
        await expect(page.locator(`text=카테고리: ${testCase.category}`)).toBeVisible({ timeout: 5000 })
        
        // 다음 테스트를 위해 입력 초기화
        await page.fill('textarea[placeholder*="Excel 관련 질문"]', '')
      }
    })
  })

  test.describe('통합 시나리오', () => {
    test('파일 분석 후 관련 Q&A 제안', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      
      // 1. 파일 업로드
      await page.setInputFiles('input[type="file"]', {
        name: 'circular-ref.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('circular reference test')
      })
      
      await page.click('button:has-text("분석 시작")')
      
      // 2. 순환 참조 오류 감지
      await expect(page.locator('text=순환 참조')).toBeVisible({ timeout: 5000 })
      
      // 3. 관련 Q&A 제안 확인
      await expect(page.locator('text=관련 해결 방법')).toBeVisible()
      await expect(page.locator('text=수식 추적')).toBeVisible()
    })

    test('오류 해결 신뢰도 표시', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      await page.click('text=질문하기')
      
      // 해결 가능한 질문
      await page.fill('textarea[placeholder*="Excel 관련 질문"]', '순환 참조 오류를 해결하고 싶습니다')
      await page.click('button:has-text("검색")')
      
      // 높은 신뢰도 표시
      await expect(page.locator('text=해결 가능성: 높음')).toBeVisible({ timeout: 5000 })
      
      // 해결 어려운 질문
      await page.fill('textarea[placeholder*="Excel 관련 질문"]', '차트 이미지가 깨져서 보입니다')
      await page.click('button:has-text("검색")')
      
      // 낮은 신뢰도 표시
      await expect(page.locator('text=해결 가능성: 낮음')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('성능 테스트', () => {
    test('대용량 파일 처리', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      
      // 5MB 파일 생성
      const largeBuffer = Buffer.alloc(5 * 1024 * 1024, 'x')
      
      await page.setInputFiles('input[type="file"]', {
        name: 'large.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: largeBuffer
      })
      
      const startTime = Date.now()
      await page.click('button:has-text("분석 시작")')
      
      // 타임아웃 내 완료 확인 (30초)
      await expect(page.locator('text=분석 완료')).toBeVisible({ timeout: 30000 })
      
      const endTime = Date.now()
      const processingTime = endTime - startTime
      
      // 성능 기준: 30초 이내 처리
      expect(processingTime).toBeLessThan(30000)
    })

    test('연속 질문 처리', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      await page.click('text=질문하기')
      
      // 10개 연속 질문
      for (let i = 0; i < 10; i++) {
        await page.fill('textarea[placeholder*="Excel 관련 질문"]', `테스트 질문 ${i}: VLOOKUP 오류`)
        await page.click('button:has-text("검색")')
        
        // 각 답변이 1초 이내 표시
        await expect(page.locator('text=답변')).toBeVisible({ timeout: 1000 })
      }
    })
  })

  test.describe('오류 처리', () => {
    test('잘못된 파일 형식 처리', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      
      // 이미지 파일 업로드 시도
      await page.setInputFiles('input[type="file"]', {
        name: 'image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('PNG image data')
      })
      
      await page.click('button:has-text("분석 시작")')
      
      // 오류 메시지 확인
      await expect(page.locator('text=Excel 파일만 업로드 가능합니다')).toBeVisible({ timeout: 5000 })
    })

    test('네트워크 오류 처리', async ({ page, context }) => {
      // 네트워크 차단
      await context.route('**/api/analyze', route => route.abort())
      
      await page.goto('/dashboard/excel-analyzer')
      await page.click('text=질문하기')
      
      await page.fill('textarea[placeholder*="Excel 관련 질문"]', '테스트 질문')
      await page.click('button:has-text("검색")')
      
      // 오류 메시지 확인
      await expect(page.locator('text=네트워크 오류가 발생했습니다')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('접근성', () => {
    test('키보드 네비게이션', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      
      // Tab 키로 이동
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Enter로 탭 전환
      await page.keyboard.press('Enter')
      
      // 포커스 확인
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    })

    test('스크린 리더 지원', async ({ page }) => {
      await page.goto('/dashboard/excel-analyzer')
      
      // ARIA 레이블 확인
      await expect(page.locator('[aria-label="파일 업로드"]')).toBeVisible()
      await expect(page.locator('[aria-label="질문 입력"]')).toBeVisible()
      
      // 역할 확인
      await expect(page.locator('[role="tablist"]')).toBeVisible()
      await expect(page.locator('[role="tab"]')).toHaveCount(2)
    })
  })
})

// 모바일 반응형 테스트
test.describe('모바일 반응형', () => {
  test.use({ viewport: { width: 375, height: 667 } })
  
  test('모바일에서 UI 동작', async ({ page }) => {
    await page.goto('/dashboard/excel-analyzer')
    
    // 탭이 세로로 표시되는지 확인
    const tabsBox = await page.locator('[role="tablist"]').boundingBox()
    expect(tabsBox?.width).toBeLessThan(375)
    
    // 파일 업로드 버튼이 전체 너비인지 확인
    const uploadButton = await page.locator('button:has-text("파일 선택")').boundingBox()
    expect(uploadButton?.width).toBeGreaterThan(300)
  })
})