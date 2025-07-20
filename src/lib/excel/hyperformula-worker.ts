/**
 * Web Worker for parallel HyperFormula processing
 * 병렬 처리를 통한 성능 최적화
 */

import { HyperFormula, ConfigParams } from 'hyperformula'

// Worker 메시지 타입
export interface WorkerMessage {
  type: 'INIT' | 'PROCESS_CHUNK' | 'EVALUATE' | 'DESTROY'
  id: string
  payload?: any
}

export interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS'
  id: string
  result?: any
  error?: string
  progress?: number
}

// 청크 처리 요청
export interface ProcessChunkRequest {
  sheetData: any[][]
  sheetIndex: number
  startRow: number
  endRow: number
  config?: Partial<ConfigParams>
}

// 청크 처리 결과
export interface ProcessChunkResult {
  sheetIndex: number
  startRow: number
  endRow: number
  formulas: Array<{
    row: number
    col: number
    formula: string
    value: any
    error?: string
  }>
  errors: Array<{
    row: number
    col: number
    error: string
    type: string
  }>
  cellsProcessed: number
  formulasProcessed: number
  processingTime: number
}

class HyperFormulaWorker {
  private hf: HyperFormula | null = null
  private config: ConfigParams = {
    licenseKey: 'gpl-v3',
    useColumnIndex: false,
    useStats: true,
    binarySearchThreshold: 20,
    dateFormats: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    timeFormats: ['hh:mm', 'hh:mm:ss'],
    functionArgSeparator: ',',
    decimalSeparator: '.',
    thousandSeparator: ','
  }

  /**
   * Worker 초기화
   */
  init(config?: Partial<ConfigParams>): void {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    
    try {
      this.hf = HyperFormula.buildEmpty(this.config)
      console.log('HyperFormula Worker 초기화 완료')
    } catch (error) {
      throw new Error(`HyperFormula 초기화 실패: ${error}`)
    }
  }

  /**
   * 청크 단위로 시트 데이터 처리
   */
  processChunk(request: ProcessChunkRequest): ProcessChunkResult {
    if (!this.hf) {
      throw new Error('HyperFormula가 초기화되지 않았습니다')
    }

    const startTime = performance.now()
    const { sheetData, sheetIndex, startRow, endRow } = request
    
    const result: ProcessChunkResult = {
      sheetIndex,
      startRow,
      endRow,
      formulas: [],
      errors: [],
      cellsProcessed: 0,
      formulasProcessed: 0,
      processingTime: 0
    }

    try {
      // 시트가 없으면 생성
      if (sheetIndex >= this.hf.getSheetNames().length) {
        this.hf.addSheet(`Sheet${sheetIndex + 1}`)
      }

      // 청크 데이터 처리
      for (let row = startRow; row <= endRow && row < sheetData.length; row++) {
        const rowData = sheetData[row]
        if (!rowData) continue

        for (let col = 0; col < rowData.length; col++) {
          const cellValue = rowData[col]
          result.cellsProcessed++

          // 수식인 경우
          if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
            result.formulasProcessed++
            
            try {
              // HyperFormula에 셀 설정
              this.hf.setCellContents({ sheet: sheetIndex, row, col }, cellValue)
              
              // 수식 평가
              const evaluatedValue = this.hf.getCellValue({ sheet: sheetIndex, row, col })
              
              // 오류 체크
              if (evaluatedValue && typeof evaluatedValue === 'object' && evaluatedValue.type === 'ERROR') {
                result.errors.push({
                  row,
                  col,
                  error: evaluatedValue.value,
                  type: evaluatedValue.type
                })
              }
              
              result.formulas.push({
                row,
                col,
                formula: cellValue,
                value: evaluatedValue,
                error: (evaluatedValue && typeof evaluatedValue === 'object' && 'type' in evaluatedValue && evaluatedValue.type === 'ERROR') ? (evaluatedValue as any).value : undefined
              })
              
            } catch (error: any) {
              result.errors.push({
                row,
                col,
                error: error.message || '수식 처리 오류',
                type: 'PROCESSING_ERROR'
              })
            }
          } else {
            // 일반 값
            try {
              this.hf.setCellContents({ sheet: sheetIndex, row, col }, cellValue)
            } catch (error) {
              // 값 설정 오류는 무시
            }
          }
        }
      }

      result.processingTime = performance.now() - startTime
      return result

    } catch (error: any) {
      throw new Error(`청크 처리 실패: ${error.message}`)
    }
  }

  /**
   * 단일 수식 평가
   */
  evaluateFormula(formula: string, context?: { sheet: number, row: number, col: number }): any {
    if (!this.hf) {
      throw new Error('HyperFormula가 초기화되지 않았습니다')
    }

    try {
      if (context) {
        this.hf.setCellContents(context, formula)
        return this.hf.getCellValue(context)
      } else {
        // 임시 셀에서 평가
        const tempCell = { sheet: 0, row: 0, col: 0 }
        this.hf.setCellContents(tempCell, formula)
        const result = this.hf.getCellValue(tempCell)
        this.hf.setCellContents(tempCell, null) // 정리
        return result
      }
    } catch (error: any) {
      return { type: 'ERROR', value: error.message }
    }
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    if (this.hf) {
      this.hf.destroy()
      this.hf = null
    }
  }
}

// Worker 인스턴스
const worker = new HyperFormulaWorker()

// 메시지 핸들러
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data
  
  try {
    let result: any
    
    switch (type) {
      case 'INIT':
        worker.init(payload)
        result = { initialized: true }
        break
        
      case 'PROCESS_CHUNK':
        result = worker.processChunk(payload as ProcessChunkRequest)
        break
        
      case 'EVALUATE':
        result = worker.evaluateFormula(payload.formula, payload.context)
        break
        
      case 'DESTROY':
        worker.destroy()
        result = { destroyed: true }
        break
        
      default:
        throw new Error(`알 수 없는 메시지 타입: ${type}`)
    }
    
    const response: WorkerResponse = {
      type: 'SUCCESS',
      id,
      result
    }
    
    self.postMessage(response)
    
  } catch (error: any) {
    const response: WorkerResponse = {
      type: 'ERROR',
      id,
      error: error.message || '처리 중 오류 발생'
    }
    
    self.postMessage(response)
  }
})

// Worker가 정상적으로 로드되었음을 알림
self.postMessage({ type: 'READY' })