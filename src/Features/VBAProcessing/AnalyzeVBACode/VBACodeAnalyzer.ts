import { Result } from '@/Common/Result'

export interface VBAAnalysisResult {
  complexity: {
    cyclomaticComplexity: number
    linesOfCode: number
    commentLines: number
    emptyLines: number
    functions: number
    subroutines: number
    variables: number
  }
  quality: {
    score: number // 0-100
    issues: Array<{
      type: 'naming' | 'structure' | 'performance' | 'maintainability'
      severity: 'info' | 'warning' | 'error'
      line: number
      message: string
      suggestion?: string
    }>
  }
  dependencies: {
    externalReferences: string[]
    apiCalls: string[]
    fileOperations: string[]
    registryAccess: string[]
  }
  metrics: {
    readabilityIndex: number
    maintainabilityIndex: number
    testabilityIndex: number
  }
}

export class VBACodeAnalyzer {
  analyze(code: string, moduleName: string): Result<VBAAnalysisResult> {
    try {
      const lines = code.split('\n')
      
      // 기본 메트릭 계산
      const complexity = this.calculateComplexity(lines)
      const quality = this.assessQuality(lines, moduleName)
      const dependencies = this.extractDependencies(lines)
      const metrics = this.calculateMetrics(complexity, quality, dependencies)

      return Result.success({
        complexity,
        quality,
        dependencies,
        metrics,
      })
    } catch (error) {
      console.error('VBA 코드 분석 오류:', error)
      return Result.failure({
        code: 'VBA_ANALYSIS.FAILED',
        message: 'VBA 코드 분석에 실패했습니다',
      })
    }
  }

  private calculateComplexity(lines: string[]) {
    let cyclomaticComplexity = 1 // 기본값
    let linesOfCode = 0
    let commentLines = 0
    let emptyLines = 0
    let functions = 0
    let subroutines = 0
    let variables = 0

    const variableDeclarations = new Set<string>()

    lines.forEach((line) => {
      const trimmed = line.trim()

      // 빈 줄
      if (trimmed === '') {
        emptyLines++
        return
      }

      // 주석
      if (trimmed.startsWith("'") || trimmed.toLowerCase().startsWith('rem ')) {
        commentLines++
        return
      }

      linesOfCode++

      // 조건문과 반복문 (복잡도 증가)
      if (/^\s*(if|elseif|select case|case)\s+/i.test(line)) {
        cyclomaticComplexity++
      }
      if (/^\s*(for|while|do)\s+/i.test(line)) {
        cyclomaticComplexity++
      }

      // 함수와 서브루틴
      if (/^\s*function\s+\w+/i.test(line)) {
        functions++
        cyclomaticComplexity++
      }
      if (/^\s*sub\s+\w+/i.test(line)) {
        subroutines++
        cyclomaticComplexity++
      }

      // 변수 선언
      const dimMatch = line.match(/dim\s+(\w+)/gi)
      if (dimMatch) {
        dimMatch.forEach(match => {
          const varName = match.replace(/dim\s+/i, '').split(/\s+/)[0]
          variableDeclarations.add(varName.toLowerCase())
        })
      }
    })

    variables = variableDeclarations.size

    return {
      cyclomaticComplexity,
      linesOfCode,
      commentLines,
      emptyLines,
      functions,
      subroutines,
      variables,
    }
  }

  private assessQuality(lines: string[], moduleName: string) {
    const issues: VBAAnalysisResult['quality']['issues'] = []
    
    // 명명 규칙 검사
    lines.forEach((line, index) => {
      // 헝가리안 표기법 미사용
      const varMatch = line.match(/dim\s+(\w+)/i)
      if (varMatch) {
        const varName = varMatch[1]
        if (!/^[a-z]{1,3}[A-Z]/.test(varName)) {
          issues.push({
            type: 'naming',
            severity: 'info',
            line: index + 1,
            message: `변수 '${varName}'가 헝가리안 표기법을 따르지 않습니다`,
            suggestion: '예: strName (문자열), intCount (정수), bIsValid (불린)',
          })
        }
      }

      // Option Explicit 미사용
      if (index === 0 && !/option explicit/i.test(line)) {
        issues.push({
          type: 'structure',
          severity: 'warning',
          line: 1,
          message: 'Option Explicit가 선언되지 않았습니다',
          suggestion: '모듈 최상단에 "Option Explicit"를 추가하여 변수 선언을 강제하세요',
        })
      }

      // 너무 긴 줄
      if (line.length > 100) {
        issues.push({
          type: 'maintainability',
          severity: 'info',
          line: index + 1,
          message: `코드 줄이 너무 깁니다 (${line.length}자)`,
          suggestion: '가독성을 위해 100자 이내로 줄이세요',
        })
      }

      // On Error Resume Next 사용
      if (/on error resume next/i.test(line)) {
        issues.push({
          type: 'structure',
          severity: 'error',
          line: index + 1,
          message: 'On Error Resume Next는 오류를 숨길 수 있습니다',
          suggestion: '구체적인 오류 처리를 구현하세요',
        })
      }

      // Select * 사용
      if (/select\s+\*/i.test(line)) {
        issues.push({
          type: 'performance',
          severity: 'warning',
          line: index + 1,
          message: 'SELECT *는 성능에 영향을 줄 수 있습니다',
          suggestion: '필요한 열만 명시적으로 선택하세요',
        })
      }
    })

    // 품질 점수 계산
    let score = 100
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'error':
          score -= 10
          break
        case 'warning':
          score -= 5
          break
        case 'info':
          score -= 2
          break
      }
    })
    score = Math.max(0, score)

    return { score, issues }
  }

  private extractDependencies(lines: string[]) {
    const externalReferences = new Set<string>()
    const apiCalls = new Set<string>()
    const fileOperations = new Set<string>()
    const registryAccess = new Set<string>()

    lines.forEach(line => {
      // 외부 참조
      const createObjectMatch = line.match(/CreateObject\s*\(\s*["']([^"']+)["']\s*\)/i)
      if (createObjectMatch) {
        externalReferences.add(createObjectMatch[1])
      }

      // Windows API 호출
      if (/declare\s+(function|sub)/i.test(line)) {
        const apiMatch = line.match(/declare\s+(?:function|sub)\s+(\w+)/i)
        if (apiMatch) {
          apiCalls.add(apiMatch[1])
        }
      }

      // 파일 작업
      if (/\b(Open|Close|Print|Write|Input|Line Input|Get|Put)\s+#?\d+/i.test(line)) {
        fileOperations.add('File I/O')
      }
      if (/FileSystemObject/i.test(line)) {
        fileOperations.add('FileSystemObject')
      }

      // 레지스트리 접근
      if (/\b(RegRead|RegWrite|RegDelete)\b/i.test(line)) {
        registryAccess.add('Registry Access')
      }
      if (/WScript\.Shell/i.test(line) && /Reg/i.test(line)) {
        registryAccess.add('WScript.Shell Registry')
      }
    })

    return {
      externalReferences: Array.from(externalReferences),
      apiCalls: Array.from(apiCalls),
      fileOperations: Array.from(fileOperations),
      registryAccess: Array.from(registryAccess),
    }
  }

  private calculateMetrics(
    complexity: VBAAnalysisResult['complexity'],
    quality: VBAAnalysisResult['quality'],
    dependencies: VBAAnalysisResult['dependencies']
  ) {
    // 가독성 지수 (0-100)
    const avgLinesPerUnit = complexity.linesOfCode / 
      Math.max(1, complexity.functions + complexity.subroutines)
    const commentRatio = complexity.commentLines / 
      Math.max(1, complexity.linesOfCode)
    
    let readabilityIndex = 100
    if (avgLinesPerUnit > 50) readabilityIndex -= 20
    else if (avgLinesPerUnit > 30) readabilityIndex -= 10
    
    if (commentRatio < 0.1) readabilityIndex -= 15
    readabilityIndex = Math.max(0, readabilityIndex)

    // 유지보수성 지수 (0-100)
    let maintainabilityIndex = quality.score
    if (complexity.cyclomaticComplexity > 20) maintainabilityIndex -= 20
    else if (complexity.cyclomaticComplexity > 10) maintainabilityIndex -= 10
    
    const dependencyCount = 
      dependencies.externalReferences.length +
      dependencies.apiCalls.length +
      dependencies.fileOperations.length +
      dependencies.registryAccess.length
    
    if (dependencyCount > 10) maintainabilityIndex -= 15
    else if (dependencyCount > 5) maintainabilityIndex -= 7
    maintainabilityIndex = Math.max(0, maintainabilityIndex)

    // 테스트 가능성 지수 (0-100)
    let testabilityIndex = 100
    if (complexity.cyclomaticComplexity > 15) testabilityIndex -= 30
    else if (complexity.cyclomaticComplexity > 10) testabilityIndex -= 15
    
    if (dependencyCount > 5) testabilityIndex -= 20
    if (dependencies.fileOperations.length > 0) testabilityIndex -= 10
    if (dependencies.registryAccess.length > 0) testabilityIndex -= 15
    testabilityIndex = Math.max(0, testabilityIndex)

    return {
      readabilityIndex: Math.round(readabilityIndex),
      maintainabilityIndex: Math.round(maintainabilityIndex),
      testabilityIndex: Math.round(testabilityIndex),
    }
  }
}