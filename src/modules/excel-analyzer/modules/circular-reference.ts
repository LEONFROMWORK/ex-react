import ExcelJS from 'exceljs'
import { AnalysisModule, AnalysisResult } from '../types'

export class CircularReferenceModule implements AnalysisModule {
  name = 'circular-reference'
  
  async analyze(workbook: ExcelJS.Workbook): Promise<AnalysisResult[]> {
    const graph = new Map<string, Set<string>>()
    const results: AnalysisResult[] = []
    
    // 1. 모든 수식 수집 및 의존성 그래프 구축
    workbook.eachSheet(worksheet => {
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          if (cell.formula) {
            const cellAddr = `${worksheet.name}!${cell.address}`
            const deps = this.extractDependencies(cell.formula, worksheet.name)
            graph.set(cellAddr, new Set(deps))
          }
        })
      })
    })
    
    // 2. DFS로 순환 참조 검출
    const cycles = this.detectCycles(graph)
    
    // 3. 결과 생성
    for (const cycle of cycles) {
      results.push({
        type: 'error',
        severity: 'high',
        location: cycle.join(' → '),
        message: '순환 참조가 감지되었습니다',
        suggestion: '수식 구조를 변경하여 순환 참조를 제거하세요. 예: 중간 계산 셀을 추가하거나 수식을 재구성하세요.',
        code: 'CIRCULAR_REF',
        metadata: {
          cycle: cycle,
          affectedCells: cycle.length
        }
      })
    }
    
    return results
  }
  
  private extractDependencies(formula: string, currentSheet: string): string[] {
    const deps: string[] = []
    
    // 단순 셀 참조 패턴 (A1, B2 등)
    const cellPattern = /([A-Z]+\d+)/g
    const cellMatches = formula.match(cellPattern) || []
    
    for (const match of cellMatches) {
      // 시트 이름이 없으면 현재 시트로 가정
      deps.push(`${currentSheet}!${match}`)
    }
    
    // 다른 시트 참조 패턴 (Sheet1!A1)
    const sheetCellPattern = /([^!]+)!([A-Z]+\d+)/g
    let sheetMatch
    while ((sheetMatch = sheetCellPattern.exec(formula)) !== null) {
      const sheetName = sheetMatch[1].replace(/'/g, '')
      const cellAddr = sheetMatch[2]
      deps.push(`${sheetName}!${cellAddr}`)
    }
    
    // 범위 참조 확장 (A1:A3 → A1, A2, A3)
    const rangePattern = /([A-Z]+\d+):([A-Z]+\d+)/g
    let rangeMatch
    while ((rangeMatch = rangePattern.exec(formula)) !== null) {
      const expandedCells = this.expandRange(rangeMatch[1], rangeMatch[2])
      for (const cell of expandedCells) {
        deps.push(`${currentSheet}!${cell}`)
      }
    }
    
    // 중복 제거
    return [...new Set(deps)]
  }
  
  private expandRange(startCell: string, endCell: string): string[] {
    const cells: string[] = []
    
    // 간단한 구현: 같은 열의 범위만 처리
    const startMatch = startCell.match(/([A-Z]+)(\d+)/)
    const endMatch = endCell.match(/([A-Z]+)(\d+)/)
    
    if (!startMatch || !endMatch) return []
    
    const col = startMatch[1]
    const startRow = parseInt(startMatch[2])
    const endRow = parseInt(endMatch[2])
    
    if (startMatch[1] === endMatch[1]) {
      // 같은 열
      for (let row = startRow; row <= endRow; row++) {
        cells.push(`${col}${row}`)
      }
    }
    
    return cells
  }
  
  private detectCycles(graph: Map<string, Set<string>>): string[][] {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycles: string[][] = []
    
    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node)
      recursionStack.add(node)
      path.push(node)
      
      const neighbors = graph.get(node) || new Set()
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, [...path])) {
            return true
          }
        } else if (recursionStack.has(neighbor)) {
          // 순환 발견
          const cycleStart = path.indexOf(neighbor)
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart)
            // 중복 순환 제거
            const cycleStr = cycle.sort().join(',')
            const isDuplicate = cycles.some(c => c.sort().join(',') === cycleStr)
            if (!isDuplicate) {
              cycles.push(cycle)
            }
          }
          return true
        }
      }
      
      recursionStack.delete(node)
      return false
    }
    
    // 모든 노드에서 DFS 시작
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }
    
    return cycles
  }
}