import { Result } from '@/Common/Result'
import ExcelJS from 'exceljs'
import { Readable, Transform, PassThrough } from 'stream'
import { promisify } from 'util'
import { pipeline } from 'stream/promises'

export interface StreamProgress {
  phase: 'initializing' | 'processing' | 'finalizing' | 'completed'
  currentSheet: number
  totalSheets: number
  currentRow: number
  totalRows: number
  percentage: number
  bytesProcessed: number
  estimatedTimeRemaining?: number
}

export interface StreamOptions {
  chunkSize?: number // 한 번에 처리할 행 수
  memoryLimit?: number // 메모리 제한 (MB)
  progressCallback?: (progress: StreamProgress) => void
  errorCallback?: (error: Error) => void
}

export class ExcelStreamBuilderService {
  private defaultChunkSize = 1000
  private memoryThreshold = 50 * 1024 * 1024 // 50MB

  // 스트리밍 방식으로 Excel 생성
  async buildStream(
    structure: any,
    options: StreamOptions = {}
  ): Promise<Result<Readable>> {
    try {
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: new PassThrough(),
        useStyles: true,
        useSharedStrings: true,
      })

      const chunkSize = options.chunkSize || this.defaultChunkSize
      const progressCallback = options.progressCallback
      const startTime = Date.now()

      // 진행률 추적
      let totalRows = 0
      let processedRows = 0
      structure.sheets.forEach((sheet: any) => {
        totalRows += sheet.rows?.length || 0
      })

      // 시트별 처리
      for (let sheetIndex = 0; sheetIndex < structure.sheets.length; sheetIndex++) {
        const sheetData = structure.sheets[sheetIndex]
        const worksheet = workbook.addWorksheet(sheetData.name || `Sheet${sheetIndex + 1}`)

        // 컬럼 설정
        if (sheetData.columns) {
          worksheet.columns = sheetData.columns.map((col: any) => ({
            header: col.header,
            key: col.key,
            width: col.width || 15,
          }))
        }

        // 청크 단위로 행 추가
        if (sheetData.rows && sheetData.rows.length > 0) {
          for (let i = 0; i < sheetData.rows.length; i += chunkSize) {
            const chunk = sheetData.rows.slice(i, i + chunkSize)
            
            // 각 청크 처리
            for (const row of chunk) {
              const excelRow = worksheet.addRow(row)
              
              // 스타일 적용 (선택적)
              if (sheetData.styles) {
                this.applyRowStyles(excelRow, sheetData.styles)
              }
              
              processedRows++
            }

            // 진행률 콜백
            if (progressCallback) {
              const percentage = Math.round((processedRows / totalRows) * 100)
              const elapsedTime = Date.now() - startTime
              const estimatedTotal = (elapsedTime / processedRows) * totalRows
              const estimatedRemaining = Math.max(0, estimatedTotal - elapsedTime)

              progressCallback({
                phase: 'processing',
                currentSheet: sheetIndex + 1,
                totalSheets: structure.sheets.length,
                currentRow: processedRows,
                totalRows,
                percentage,
                bytesProcessed: worksheet.stream.bytesWritten || 0,
                estimatedTimeRemaining: Math.round(estimatedRemaining / 1000),
              })
            }

            // 메모리 체크 및 가비지 컬렉션 힌트
            if (global.gc && i % (chunkSize * 10) === 0) {
              global.gc()
            }

            // 워크시트 커밋 (메모리 해제)
            await worksheet.commit()
          }
        }

        // 수식 추가 (있는 경우)
        if (sheetData.formulas) {
          for (const formula of sheetData.formulas) {
            worksheet.getCell(formula.cell).formula = formula.formula
          }
        }

        // 차트 추가 (있는 경우)
        if (sheetData.charts) {
          await this.addChartsToWorksheet(worksheet, sheetData.charts)
        }
      }

      // 최종 진행률
      if (progressCallback) {
        progressCallback({
          phase: 'finalizing',
          currentSheet: structure.sheets.length,
          totalSheets: structure.sheets.length,
          currentRow: totalRows,
          totalRows,
          percentage: 100,
          bytesProcessed: workbook.stream.bytesWritten || 0,
        })
      }

      // 워크북 커밋
      await workbook.commit()

      if (progressCallback) {
        progressCallback({
          phase: 'completed',
          currentSheet: structure.sheets.length,
          totalSheets: structure.sheets.length,
          currentRow: totalRows,
          totalRows,
          percentage: 100,
          bytesProcessed: workbook.stream.bytesWritten || 0,
        })
      }

      return Result.success(workbook.stream as Readable)
    } catch (error) {
      console.error('Excel 스트림 생성 오류:', error)
      if (options.errorCallback) {
        options.errorCallback(error as Error)
      }
      return Result.failure({
        code: 'EXCEL_STREAM.BUILD_ERROR',
        message: 'Excel 스트림 생성에 실패했습니다',
      })
    }
  }

  // 대용량 데이터 스트리밍 처리
  async processLargeDataStream(
    dataStream: Readable,
    template: any,
    options: StreamOptions = {}
  ): Promise<Result<Readable>> {
    try {
      const output = new PassThrough()
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: output,
        useStyles: true,
        useSharedStrings: true,
      })

      const worksheet = workbook.addWorksheet(template.sheetName || 'Data')
      
      // 헤더 설정
      if (template.headers) {
        worksheet.columns = template.headers.map((header: string, index: number) => ({
          header,
          key: `col${index}`,
          width: 15,
        }))
      }

      let rowCount = 0
      const chunkSize = options.chunkSize || this.defaultChunkSize
      const progressCallback = options.progressCallback
      const startTime = Date.now()

      // Transform 스트림 생성 - JSON Lines 파싱
      const parser = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          try {
            const lines = chunk.toString().split('\n').filter(Boolean)
            lines.forEach((line: string) => {
              try {
                const data = JSON.parse(line)
                this.push(data)
              } catch (e) {
                // 파싱 실패한 라인은 건너뛰기
              }
            })
            callback()
          } catch (error) {
            callback(error as Error)
          }
        },
      })

      // 배치 처리를 위한 버퍼
      let buffer: any[] = []

      // 데이터 스트림 처리
      parser.on('data', async (data) => {
        buffer.push(data)
        
        if (buffer.length >= chunkSize) {
          parser.pause() // 백프레셔 적용
          
          // 배치 처리
          for (const item of buffer) {
            const row = template.mapper ? template.mapper(item) : item
            worksheet.addRow(row)
            rowCount++
          }
          
          // 진행률 업데이트
          if (progressCallback) {
            progressCallback({
              phase: 'processing',
              currentSheet: 1,
              totalSheets: 1,
              currentRow: rowCount,
              totalRows: 0, // 스트림이므로 총 개수를 모름
              percentage: 0,
              bytesProcessed: worksheet.stream.bytesWritten || 0,
              estimatedTimeRemaining: undefined,
            })
          }
          
          // 워크시트 커밋 (메모리 해제)
          await worksheet.commit()
          
          buffer = []
          parser.resume()
        }
      })

      parser.on('end', async () => {
        // 남은 데이터 처리
        if (buffer.length > 0) {
          for (const item of buffer) {
            const row = template.mapper ? template.mapper(item) : item
            worksheet.addRow(row)
            rowCount++
          }
          await worksheet.commit()
        }
        
        // 워크북 완료
        await workbook.commit()
        
        if (progressCallback) {
          progressCallback({
            phase: 'completed',
            currentSheet: 1,
            totalSheets: 1,
            currentRow: rowCount,
            totalRows: rowCount,
            percentage: 100,
            bytesProcessed: workbook.stream.bytesWritten || 0,
          })
        }
      })

      // 파이프라인 연결
      dataStream.pipe(parser)

      return Result.success(output)
    } catch (error) {
      console.error('대용량 데이터 스트림 처리 오류:', error)
      return Result.failure({
        code: 'EXCEL_STREAM.PROCESS_ERROR',
        message: '대용량 데이터 스트림 처리에 실패했습니다',
      })
    }
  }

  // CSV to Excel 스트리밍 변환
  async csvToExcelStream(
    csvStream: Readable,
    options: StreamOptions & { delimiter?: string } = {}
  ): Promise<Result<Readable>> {
    try {
      const output = new PassThrough()
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: output,
        useStyles: true,
      })

      const worksheet = workbook.addWorksheet('Data')
      const delimiter = options.delimiter || ','
      let isFirstRow = true
      let rowCount = 0

      // CSV 파싱 Transform 스트림
      const csvParser = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          const lines = chunk.toString().split('\n')
          
          for (const line of lines) {
            if (!line.trim()) continue
            
            const values = line.split(delimiter).map(v => 
              v.trim().replace(/^"|"$/g, '') // 따옴표 제거
            )
            
            if (isFirstRow) {
              // 첫 행은 헤더로 처리
              worksheet.columns = values.map((header, index) => ({
                header,
                key: `col${index}`,
                width: 15,
              }))
              isFirstRow = false
            } else {
              worksheet.addRow(values)
              rowCount++
              
              // 주기적으로 커밋
              if (rowCount % 1000 === 0) {
                worksheet.commit()
              }
            }
          }
          
          callback()
        },
      })

      csvParser.on('end', async () => {
        await worksheet.commit()
        await workbook.commit()
      })

      // 파이프라인 연결
      csvStream.pipe(csvParser)

      return Result.success(output)
    } catch (error) {
      console.error('CSV to Excel 스트림 변환 오류:', error)
      return Result.failure({
        code: 'EXCEL_STREAM.CSV_CONVERT_ERROR',
        message: 'CSV to Excel 스트림 변환에 실패했습니다',
      })
    }
  }

  // 행 스타일 적용
  private applyRowStyles(row: ExcelJS.Row, styles: any): void {
    if (styles.font) {
      row.font = styles.font
    }
    if (styles.alignment) {
      row.alignment = styles.alignment
    }
    if (styles.fill) {
      row.fill = styles.fill
    }
    if (styles.border) {
      row.border = styles.border
    }
  }

  // 차트 추가 (스트림 모드에서는 제한적)
  private async addChartsToWorksheet(
    worksheet: any,
    charts: any[]
  ): Promise<void> {
    // ExcelJS 스트림 모드에서는 차트 지원이 제한적
    // 필요시 차트는 별도 후처리로 추가
    console.warn('스트림 모드에서 차트 추가는 제한적입니다')
  }

  // 메모리 사용량 모니터링
  getMemoryUsage(): {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  } {
    const memoryUsage = process.memoryUsage()
    return {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
    }
  }
}