import { Result } from "@/Common/Result";
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

export interface ProcessedExcelData {
  sheets: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
    data: any[][];
    formulas: Array<{
      cell: string;
      formula: string;
      value: any;
      error?: string;
    }>;
    errors: Array<{
      cell: string;
      type: string;
      message: string;
    }>;
    formatting: Array<{
      range: string;
      style: any;
    }>;
  }>;
  summary: {
    totalSheets: number;
    totalCells: number;
    totalFormulas: number;
    totalErrors: number;
  };
}

export interface ExcelModification {
  sheetName: string;
  cell: string;
  newValue?: any;
  newFormula?: string;
  newFormat?: any;
}

export class ExcelProcessingService {
  /**
   * Excel 파일을 파싱하여 구조화된 데이터로 변환
   */
  async parseExcelFile(fileBuffer: Buffer): Promise<Result<ProcessedExcelData>> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      const sheets: ProcessedExcelData['sheets'] = [];
      let totalCells = 0;
      let totalFormulas = 0;
      let totalErrors = 0;

      // 각 시트 처리
      workbook.eachSheet((worksheet) => {
        const sheetData: any[][] = [];
        const formulas: any[] = [];
        const errors: any[] = [];
        const formatting: any[] = [];

        // 행과 열 수 계산
        let maxRow = 0;
        let maxCol = 0;

        worksheet.eachRow((row, rowNumber) => {
          const rowData: any[] = [];
          maxRow = Math.max(maxRow, rowNumber);

          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            maxCol = Math.max(maxCol, colNumber);
            totalCells++;

            // 셀 값 추출
            let cellValue = cell.value;
            
            // 수식 처리
            if (cell.formula) {
              totalFormulas++;
              formulas.push({
                cell: cell.address,
                formula: cell.formula,
                value: cell.value,
                error: cell.formulaType === ExcelJS.ValueType.Error ? cell.value : undefined
              });
            }

            // 오류 검출
            if (cell.type === ExcelJS.ValueType.Error) {
              totalErrors++;
              errors.push({
                cell: cell.address,
                type: 'FORMULA_ERROR',
                message: this.getErrorMessage(cell.value)
              });
            }

            // 포맷 정보 수집 (주요 속성만)
            if (cell.style && Object.keys(cell.style).length > 0) {
              formatting.push({
                range: cell.address,
                style: {
                  font: cell.style.font,
                  fill: cell.style.fill,
                  border: cell.style.border,
                  numFmt: cell.style.numFmt
                }
              });
            }

            rowData[colNumber - 1] = cellValue;
          });

          sheetData[rowNumber - 1] = rowData;
        });

        sheets.push({
          name: worksheet.name,
          rowCount: maxRow,
          columnCount: maxCol,
          data: sheetData,
          formulas,
          errors,
          formatting
        });
      });

      const processedData: ProcessedExcelData = {
        sheets,
        summary: {
          totalSheets: sheets.length,
          totalCells,
          totalFormulas,
          totalErrors
        }
      };

      return Result.success(processedData);
    } catch (error) {
      console.error("Excel parsing error:", error);
      return Result.failure({
        code: "PARSE_ERROR",
        message: "Excel 파일 파싱 중 오류가 발생했습니다."
      });
    }
  }

  /**
   * Excel 데이터에서 특정 범위 추출
   */
  extractRange(
    data: ProcessedExcelData,
    sheetName: string,
    range: string
  ): Result<any[][]> {
    try {
      const sheet = data.sheets.find(s => s.name === sheetName);
      if (!sheet) {
        return Result.failure({
          code: "SHEET_NOT_FOUND",
          message: `시트 '${sheetName}'을 찾을 수 없습니다.`
        });
      }

      // 범위 파싱 (예: "A1:D10")
      const rangeMatch = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if (!rangeMatch) {
        return Result.failure({
          code: "INVALID_RANGE",
          message: "유효하지 않은 범위 형식입니다."
        });
      }

      const [, startCol, startRow, endCol, endRow] = rangeMatch;
      const startColNum = this.columnToNumber(startCol);
      const endColNum = this.columnToNumber(endCol);
      const startRowNum = parseInt(startRow) - 1;
      const endRowNum = parseInt(endRow) - 1;

      const extractedData: any[][] = [];
      for (let row = startRowNum; row <= endRowNum; row++) {
        const rowData: any[] = [];
        for (let col = startColNum; col <= endColNum; col++) {
          rowData.push(sheet.data[row]?.[col] || null);
        }
        extractedData.push(rowData);
      }

      return Result.success(extractedData);
    } catch (error) {
      console.error("Range extraction error:", error);
      return Result.failure({
        code: "EXTRACTION_ERROR",
        message: "범위 추출 중 오류가 발생했습니다."
      });
    }
  }

  /**
   * Excel 파일 수정 적용
   */
  async applyModifications(
    fileBuffer: Buffer,
    modifications: ExcelModification[]
  ): Promise<Result<Buffer>> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      // 각 수정 사항 적용
      for (const mod of modifications) {
        const worksheet = workbook.getWorksheet(mod.sheetName);
        if (!worksheet) {
          console.warn(`시트 '${mod.sheetName}'을 찾을 수 없습니다.`);
          continue;
        }

        const cell = worksheet.getCell(mod.cell);

        // 값 또는 수식 수정
        if (mod.newFormula !== undefined) {
          cell.value = { formula: mod.newFormula };
        } else if (mod.newValue !== undefined) {
          cell.value = mod.newValue;
        }

        // 포맷 적용
        if (mod.newFormat) {
          Object.assign(cell.style, mod.newFormat);
        }
      }

      // 수정된 파일을 버퍼로 변환
      const buffer = await workbook.xlsx.writeBuffer();
      return Result.success(Buffer.from(buffer));
    } catch (error) {
      console.error("Excel modification error:", error);
      return Result.failure({
        code: "MODIFICATION_ERROR",
        message: "Excel 파일 수정 중 오류가 발생했습니다."
      });
    }
  }

  /**
   * 이미지 분석 결과를 바탕으로 수정 제안 생성
   */
  generateModificationSuggestions(
    excelData: ProcessedExcelData,
    analysisResult: any
  ): ExcelModification[] {
    const suggestions: ExcelModification[] = [];

    // AI 분석 결과에서 수정 제안 추출
    if (analysisResult.corrections) {
      for (const correction of analysisResult.corrections) {
        if (correction.cell && correction.suggestion) {
          suggestions.push({
            sheetName: correction.sheetName || excelData.sheets[0]?.name || 'Sheet1',
            cell: correction.cell,
            newValue: correction.newValue,
            newFormula: correction.newFormula
          });
        }
      }
    }

    // 오류가 있는 셀에 대한 자동 수정 제안
    for (const sheet of excelData.sheets) {
      for (const error of sheet.errors) {
        if (error.type === 'FORMULA_ERROR') {
          suggestions.push({
            sheetName: sheet.name,
            cell: error.cell,
            newValue: 0, // 임시 안전 값
            newFormat: {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF0000' } // 빨간색 배경
              }
            }
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Excel 데이터와 이미지 분석 결과 매칭
   */
  matchDataWithImage(
    excelData: ProcessedExcelData,
    imageAnalysis: any
  ): Result<Array<{
    excelCell: string;
    imageLocation: string;
    match: boolean;
    difference?: string;
  }>> {
    try {
      const matches: any[] = [];

      // 이미지 분석에서 셀 위치 추출
      const cellMentions = this.extractCellReferences(imageAnalysis.content);

      for (const cellRef of cellMentions) {
        const { sheetName, cell } = this.parseCellReference(cellRef);
        const sheet = excelData.sheets.find(s => s.name === sheetName);
        
        if (sheet) {
          const cellData = this.getCellValue(sheet, cell);
          matches.push({
            excelCell: cell,
            imageLocation: cellRef,
            match: cellData !== null,
            difference: cellData === null ? "셀이 Excel 파일에 없습니다" : undefined
          });
        }
      }

      return Result.success(matches);
    } catch (error) {
      console.error("Data matching error:", error);
      return Result.failure({
        code: "MATCHING_ERROR",
        message: "데이터 매칭 중 오류가 발생했습니다."
      });
    }
  }

  // 유틸리티 함수들
  private getErrorMessage(errorValue: any): string {
    const errorMessages: Record<string, string> = {
      '#DIV/0!': '0으로 나누기 오류',
      '#N/A': '값을 사용할 수 없음',
      '#NAME?': '인식할 수 없는 이름',
      '#NULL!': '잘못된 셀 참조',
      '#NUM!': '잘못된 숫자',
      '#REF!': '유효하지 않은 참조',
      '#VALUE!': '잘못된 값 유형'
    };
    return errorMessages[errorValue] || '알 수 없는 오류';
  }

  private columnToNumber(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 64);
    }
    return result - 1;
  }

  private extractCellReferences(text: string): string[] {
    const cellPattern = /[A-Z]+\d+/g;
    return text.match(cellPattern) || [];
  }

  private parseCellReference(cellRef: string): { sheetName: string; cell: string } {
    // 시트명이 포함된 경우 (예: "Sheet1!A1")
    const parts = cellRef.split('!');
    if (parts.length === 2) {
      return { sheetName: parts[0], cell: parts[1] };
    }
    return { sheetName: 'Sheet1', cell: cellRef };
  }

  private getCellValue(sheet: any, cellAddress: string): any {
    const match = cellAddress.match(/([A-Z]+)(\d+)/);
    if (!match) return null;

    const colNum = this.columnToNumber(match[1]);
    const rowNum = parseInt(match[2]) - 1;

    return sheet.data[rowNum]?.[colNum] || null;
  }
}