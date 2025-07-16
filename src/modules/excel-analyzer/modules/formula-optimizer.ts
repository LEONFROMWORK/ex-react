import ExcelJS from 'exceljs'
import { AnalysisModule, AnalysisResult } from '../types'

export class FormulaOptimizerModule implements AnalysisModule {
  name = 'formula-optimizer'
  
  private optimizationPatterns = [
    {
      name: 'VLOOKUP을 INDEX/MATCH로 변환',
      pattern: /VLOOKUP\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i,
      check: (formula: string) => formula.toUpperCase().includes('VLOOKUP'),
      suggestion: (match: RegExpMatchArray) => {
        const [, lookup, table, col, exact] = match
        return {
          original: match[0],
          optimized: `INDEX(${table},MATCH(${lookup},INDEX(${table},0,1),${exact}),${col})`,
          reason: 'INDEX/MATCH가 VLOOKUP보다 40% 더 빠르고, 왼쪽 조회도 가능합니다'
        }
      }
    },
    {
      name: '중첩된 IF문 단순화',
      pattern: /IF\s*\(.*?IF\s*\(.*?IF/i,
      check: (formula: string) => {
        const ifCount = (formula.match(/IF\s*\(/gi) || []).length
        return ifCount >= 3
      },
      suggestion: () => ({
        original: '중첩된 IF문',
        optimized: 'IFS() 또는 SWITCH() 함수',
        reason: '중첩된 IF문은 가독성이 떨어지고 오류 가능성이 높습니다. Excel 365에서는 IFS()나 SWITCH()를 사용하세요'
      })
    },
    {
      name: '휘발성 함수 사용 경고',
      pattern: /(TODAY|NOW|RAND|RANDBETWEEN|INDIRECT|OFFSET)\s*\(/i,
      check: (formula: string) => {
        const volatileFunctions = ['TODAY', 'NOW', 'RAND', 'RANDBETWEEN', 'INDIRECT', 'OFFSET']
        return volatileFunctions.some(func => formula.toUpperCase().includes(func))
      },
      suggestion: (match: RegExpMatchArray) => ({
        original: match[0],
        optimized: '정적 값 또는 다른 함수',
        reason: '휘발성 함수는 시트가 재계산될 때마다 실행되어 성능을 저하시킵니다. 가능하면 정적 값이나 다른 함수를 사용하세요'
      })
    },
    {
      name: 'SUMIF/COUNTIF 대신 SUMIFS/COUNTIFS 사용',
      pattern: /(SUMIF|COUNTIF)\s*\(/i,
      check: (formula: string) => {
        return formula.toUpperCase().includes('SUMIF(') || formula.toUpperCase().includes('COUNTIF(')
      },
      suggestion: (match: RegExpMatchArray) => ({
        original: match[0],
        optimized: match[0].replace(/IF\s*\(/i, 'IFS('),
        reason: 'SUMIFS/COUNTIFS는 더 유연하고 여러 조건을 처리할 수 있습니다'
      })
    },
    {
      name: '전체 열 참조 최적화',
      pattern: /([A-Z]+:[A-Z]+)/,
      check: (formula: string) => {
        return /[A-Z]+:[A-Z]+/.test(formula) && !formula.includes('$')
      },
      suggestion: (match: RegExpMatchArray) => ({
        original: match[0],
        optimized: '특정 범위 (예: A1:A1000)',
        reason: '전체 열 참조는 100만 개 이상의 셀을 검사합니다. 실제 데이터 범위만 참조하세요'
      })
    },
    {
      name: '배열 수식 최적화',
      pattern: /\{.*?\}/,
      check: (formula: string) => {
        return formula.includes('{') && formula.includes('}')
      },
      suggestion: () => ({
        original: '배열 수식',
        optimized: 'SUMPRODUCT() 또는 동적 배열 함수',
        reason: '레거시 배열 수식보다 SUMPRODUCT나 Excel 365의 동적 배열 함수가 더 효율적입니다'
      })
    }
  ]
  
  async analyze(workbook: ExcelJS.Workbook): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = []
    const processedFormulas = new Set<string>()
    
    workbook.eachSheet(worksheet => {
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula) {
            const location = `${worksheet.name}!${cell.address}`
            const formula = String(cell.formula)
            
            // 중복 수식 체크 방지
            const formulaKey = `${formula}::${location}`
            if (processedFormulas.has(formulaKey)) return
            processedFormulas.add(formulaKey)
            
            // 각 최적화 패턴 검사
            for (const pattern of this.optimizationPatterns) {
              if (pattern.check(formula)) {
                const match = formula.match(pattern.pattern)
                if (match) {
                  const suggestion = pattern.suggestion(match)
                  
                  results.push({
                    type: 'suggestion',
                    severity: pattern.name.includes('휘발성') ? 'medium' : 'low',
                    location,
                    message: `${pattern.name} 최적화 가능`,
                    suggestion: suggestion.reason,
                    code: 'FORMULA_OPTIMIZATION',
                    metadata: {
                      currentFormula: formula,
                      optimizedFormula: suggestion.optimized,
                      pattern: pattern.name
                    }
                  })
                }
              }
            }
            
            // 수식 복잡도 검사
            const complexity = this.calculateFormulaComplexity(formula)
            if (complexity > 10) {
              results.push({
                type: 'warning',
                severity: 'medium',
                location,
                message: '매우 복잡한 수식입니다',
                suggestion: '수식을 여러 셀로 나누어 단계별로 계산하면 디버깅과 유지보수가 쉬워집니다',
                code: 'COMPLEX_FORMULA',
                metadata: {
                  complexity,
                  formula: formula.substring(0, 100) + (formula.length > 100 ? '...' : '')
                }
              })
            }
          }
        })
      })
    })
    
    return results
  }
  
  private calculateFormulaComplexity(formula: string): number {
    let complexity = 0
    
    // 함수 호출 수
    const functionCalls = (formula.match(/[A-Z]+\s*\(/gi) || []).length
    complexity += functionCalls * 2
    
    // 중첩 깊이
    let maxDepth = 0
    let currentDepth = 0
    for (const char of formula) {
      if (char === '(') {
        currentDepth++
        maxDepth = Math.max(maxDepth, currentDepth)
      } else if (char === ')') {
        currentDepth--
      }
    }
    complexity += maxDepth * 3
    
    // 연산자 수
    const operators = (formula.match(/[\+\-\*\/\^&<>=]/g) || []).length
    complexity += operators
    
    // 조건문 수
    const conditions = (formula.match(/IF|AND|OR|NOT/gi) || []).length
    complexity += conditions * 2
    
    return complexity
  }
}