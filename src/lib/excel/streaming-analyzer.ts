import ExcelJS from "exceljs";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { ExcelError, ErrorType, AnalysisResult } from "@/types/excel";

/**
 * 스트리밍 방식으로 Excel 파일을 분석하는 클래스
 * 메모리 사용량을 최적화하고 대용량 파일 처리를 지원합니다.
 */
export class StreamingExcelAnalyzer {
  private errors: ExcelError[] = [];
  private totalRows = 0;
  private totalCells = 0;
  private processedSheets = 0;

  async analyzeFileStream(filePath: string): Promise<Result<AnalysisResult>> {
    try {
      // 스트림으로 파일 읽기 시작
      const readStream = createReadStream(filePath, { 
        highWaterMark: 16 * 1024 // 16KB 청크로 읽기
      });

      // ExcelJS 스트리밍 워크북 리더 생성
      const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(readStream);

      // 워크시트별 처리
      workbookReader.on('worksheet', (worksheetReader) => {
        this.processWorksheetStream(worksheetReader);
      });

      workbookReader.on('end', () => {
        console.log(`Streaming analysis completed. Processed ${this.processedSheets} sheets.`);
      });

      workbookReader.on('error', (error) => {
        console.error('Workbook reader error:', error);
        throw error;
      });

      // 스트림 파이프라인 실행
      await pipeline(readStream, workbookReader);

      // 분석 결과 반환
      const result: AnalysisResult = {
        errors: this.errors,
        metadata: {
          totalSheets: this.processedSheets,
          totalRows: this.totalRows,
          totalCells: this.totalCells,
          memoryUsage: process.memoryUsage(),
          analysisMethod: 'streaming'
        },
        performance: {
          analysisTime: 0, // 별도로 측정 필요
          memoryPeak: process.memoryUsage().heapUsed
        }
      };

      return Result.success(result);
    } catch (error) {
      console.error('Streaming analysis error:', error);
      return Result.failure(ExcelErrors.AnalysisFailed);
    } finally {
      // 명시적 가비지 컬렉션 힌트
      if (global.gc) {
        global.gc();
      }
    }
  }

  private processWorksheetStream(worksheetReader: ExcelJS.stream.xlsx.WorksheetReader): void {
    let currentRow = 0;
    
    worksheetReader.on('row', (row) => {
      currentRow++;
      this.totalRows++;
      this.processRowStream(row, worksheetReader.name, currentRow);
    });

    worksheetReader.on('end', () => {
      this.processedSheets++;
      console.log(`Completed analysis of sheet: ${worksheetReader.name} (${currentRow} rows)`);
    });

    worksheetReader.on('error', (error) => {
      console.error(`Error processing sheet ${worksheetReader.name}:`, error);
      this.addError(
        ErrorType.PROCESSING_ERROR,
        `Sheet processing error: ${error.message}`,
        `${worksheetReader.name}!A1`,
        'high'
      );
    });
  }

  private processRowStream(row: ExcelJS.Row, sheetName: string, rowNumber: number): void {
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      this.totalCells++;
      this.analyzeCellStream(cell, sheetName, rowNumber, colNumber);
    });
  }

  private analyzeCellStream(
    cell: ExcelJS.Cell, 
    sheetName: string, 
    rowNumber: number, 
    colNumber: number
  ): void {
    const cellAddress = `${sheetName}!${this.getColumnLetter(colNumber)}${rowNumber}`;

    try {
      // 1. 수식 오류 검사
      if (cell.formula) {
        this.checkFormulaErrorsStream(cell, cellAddress);
      }

      // 2. 값 오류 검사
      if (cell.value !== null && cell.value !== undefined) {
        this.checkValueErrorsStream(cell, cellAddress);
      }

      // 3. 데이터 타입 검사
      this.checkDataTypeConsistencyStream(cell, cellAddress, colNumber);

    } catch (error) {
      this.addError(
        ErrorType.PROCESSING_ERROR,
        `Cell analysis error: ${error}`,
        cellAddress,
        'medium'
      );
    }
  }

  private checkFormulaErrorsStream(cell: ExcelJS.Cell, cellAddress: string): void {
    const formula = cell.formula as string;
    
    // 일반적인 수식 오류 패턴 검사
    const errorPatterns = [
      { pattern: /#DIV\/0!/, type: ErrorType.DIVISION_BY_ZERO },
      { pattern: /#VALUE!/, type: ErrorType.VALUE_ERROR },
      { pattern: /#REF!/, type: ErrorType.REFERENCE_ERROR },
      { pattern: /#NAME\?/, type: ErrorType.NAME_ERROR },
      { pattern: /#NUM!/, type: ErrorType.NUMBER_ERROR },
      { pattern: /#N\/A/, type: ErrorType.NOT_AVAILABLE },
      { pattern: /#NULL!/, type: ErrorType.NULL_ERROR }
    ];

    for (const { pattern, type } of errorPatterns) {
      if (pattern.test(String(cell.value)) || pattern.test(formula)) {
        this.addError(
          type,
          `Formula error detected: ${cell.value}`,
          cellAddress,
          'high'
        );
      }
    }

    // 순환 참조 간단 검사 (완전하지 않음)
    if (formula.includes(cellAddress.split('!')[1])) {
      this.addError(
        ErrorType.CIRCULAR_REFERENCE,
        'Potential circular reference detected',
        cellAddress,
        'high'
      );
    }
  }

  private checkValueErrorsStream(cell: ExcelJS.Cell, cellAddress: string): void {
    const value = cell.value;

    // 숫자 범위 검사
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        this.addError(
          ErrorType.NUMBER_ERROR,
          'Invalid number (Infinity or NaN)',
          cellAddress,
          'medium'
        );
      }
      
      if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        this.addError(
          ErrorType.NUMBER_ERROR,
          'Number exceeds safe integer range',
          cellAddress,
          'medium'
        );
      }
    }

    // 날짜 유효성 검사
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        this.addError(
          ErrorType.DATE_ERROR,
          'Invalid date value',
          cellAddress,
          'medium'
        );
      }
    }
  }

  private checkDataTypeConsistencyStream(
    cell: ExcelJS.Cell, 
    cellAddress: string, 
    colNumber: number
  ): void {
    // 간단한 데이터 타입 일관성 검사
    // 실제 구현에서는 열별 데이터 타입 히스토리를 유지해야 함
    const value = cell.value;
    
    if (typeof value === 'string' && value.trim() === '') {
      this.addError(
        ErrorType.EMPTY_CELL,
        'Empty cell detected',
        cellAddress,
        'low'
      );
    }
  }

  private addError(
    type: ErrorType,
    description: string,
    location: string,
    severity: 'low' | 'medium' | 'high',
    value: any = null
  ): void {
    this.errors.push({
      type,
      description,
      location,
      severity,
      value,
      suggestion: this.getSuggestionForError(type)
    });
  }

  private getSuggestionForError(type: ErrorType): string {
    const suggestions: Record<ErrorType, string> = {
      [ErrorType.DIVISION_BY_ZERO]: 'Use IF function to check for zero before division',
      [ErrorType.VALUE_ERROR]: 'Check data types in formula arguments',
      [ErrorType.REFERENCE_ERROR]: 'Verify cell references are valid',
      [ErrorType.NAME_ERROR]: 'Check function names and range names',
      [ErrorType.NUMBER_ERROR]: 'Verify numeric values are within valid range',
      [ErrorType.NOT_AVAILABLE]: 'Check lookup functions for missing values',
      [ErrorType.NULL_ERROR]: 'Verify range intersections in formulas',
      [ErrorType.CIRCULAR_REFERENCE]: 'Remove circular references in formulas',
      [ErrorType.DATE_ERROR]: 'Verify date format and values',
      [ErrorType.EMPTY_CELL]: 'Consider filling empty cells with appropriate values',
      [ErrorType.PROCESSING_ERROR]: 'Review cell content and formatting'
    };

    return suggestions[type] || 'Review and correct the issue';
  }

  private getColumnLetter(colNumber: number): string {
    let result = '';
    while (colNumber > 0) {
      const remainder = (colNumber - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      colNumber = Math.floor((colNumber - 1) / 26);
    }
    return result;
  }

  /**
   * 메모리 사용량을 모니터링하고 임계값을 초과하면 가비지 컬렉션 실행
   */
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const memoryLimitMB = 200; // 200MB 임계값
    
    if (memUsage.heapUsed > memoryLimitMB * 1024 * 1024) {
      console.warn(`Memory usage high: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      
      if (global.gc) {
        global.gc();
        console.log('Forced garbage collection');
      }
    }
  }

  /**
   * 분석 진행상황을 추적하기 위한 상태 반환
   */
  getAnalysisProgress(): {
    processedSheets: number;
    totalRows: number;
    totalCells: number;
    errorsFound: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      processedSheets: this.processedSheets,
      totalRows: this.totalRows,
      totalCells: this.totalCells,
      errorsFound: this.errors.length,
      memoryUsage: process.memoryUsage()
    };
  }
}