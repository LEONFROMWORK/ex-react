import { z } from "zod";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import { analyzeExcelFile } from "@/lib/excel/analyzer-enhanced";
import { ExcelAnalysisResult } from "@/types/excel";
import { SaveErrorPatternHandler } from "@/Features/ErrorPatterns/SaveErrorPattern";

// Request Schema
export const AnalyzeErrorsRequestSchema = z.object({
  fileId: z.string().min(1, "파일 ID가 필요합니다."),
  userId: z.string().min(1, "사용자 ID가 필요합니다."),
  analysisType: z.enum(["basic", "advanced", "ai"]).default("basic"),
});

export type AnalyzeErrorsRequest = z.infer<typeof AnalyzeErrorsRequestSchema>;

// Response Type
export interface AnalyzeErrorsResponse {
  analysisId: string;
  fileId: string;
  errors: ErrorDetail[];
  summary: AnalysisSummary;
  status: string;
  analyzedAt: Date;
}

export interface ErrorDetail {
  type: string;
  severity: "error" | "warning" | "info";
  location: {
    sheet: string;
    cell?: string;
    row?: number;
    column?: string;
  };
  message: string;
  suggestion?: string;
}

export interface AnalysisSummary {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  affectedSheets: string[];
}

// Error Detection Rules (feature-specific)
export class ErrorDetectionRules {
  static readonly rules = {
    formulaErrors: {
      patterns: ["#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A", "#NULL!"],
      severity: "error" as const,
    },
    dataValidation: {
      checkEmptyCells: true,
      checkDataTypes: true,
      severity: "warning" as const,
    },
    formatting: {
      checkInconsistentFormats: true,
      severity: "info" as const,
    },
  };
}

// Handler
export class AnalyzeErrorsHandler {
  async handle(
    request: AnalyzeErrorsRequest
  ): Promise<Result<AnalyzeErrorsResponse>> {
    try {
      // Validate file ownership
      const file = await prisma.file.findFirst({
        where: {
          id: request.fileId,
          userId: request.userId,
        },
      });

      if (!file) {
        return Result.failure(ExcelErrors.NotFound);
      }

      // Update file status
      await prisma.file.update({
        where: { id: request.fileId },
        data: { status: "PROCESSING" },
      });

      // Perform analysis based on type
      const analysisResult = await this.performAnalysis(
        file.uploadUrl,
        request.analysisType
      );

      if (!analysisResult.isSuccess) {
        await prisma.file.update({
          where: { id: request.fileId },
          data: { status: "FAILED" },
        });
        return Result.failure(analysisResult.error);
      }

      // Save analysis results
      const analysis = await prisma.analysis.create({
        data: {
          fileId: request.fileId,
          userId: request.userId,
          type: request.analysisType,
          results: analysisResult.value,
          status: "COMPLETED",
        },
      });

      // Update file status
      await prisma.file.update({
        where: { id: request.fileId },
        data: { 
          status: "COMPLETED",
          analysisId: analysis.id,
        },
      });

      // Transform to response
      const errors = this.transformErrors(analysisResult.value);
      const response: AnalyzeErrorsResponse = {
        analysisId: analysis.id,
        fileId: request.fileId,
        errors,
        summary: this.generateSummary(analysisResult.value),
        status: analysis.status,
        analyzedAt: analysis.createdAt,
      };

      // Save error patterns for future analysis
      await this.saveErrorPatterns(request.fileId, request.userId, errors);

      return Result.success(response);
    } catch (error) {
      console.error("Analyze errors handler error:", error);
      return Result.failure(ExcelErrors.AnalysisFailed);
    }
  }

  private async performAnalysis(
    filePath: string,
    analysisType: string
  ): Promise<Result<ExcelAnalysisResult>> {
    try {
      // Use existing analyzer
      const result = await analyzeExcelFile(filePath);
      return Result.success(result);
    } catch (error) {
      console.error("Analysis error:", error);
      return Result.failure(ExcelErrors.AnalysisFailed);
    }
  }

  private transformErrors(analysisResult: ExcelAnalysisResult): ErrorDetail[] {
    const errors: ErrorDetail[] = [];

    // Transform formula errors
    analysisResult.sheets.forEach(sheet => {
      sheet.formulaErrors?.forEach(error => {
        errors.push({
          type: "formula",
          severity: "error",
          location: {
            sheet: sheet.name,
            cell: error.cell,
          },
          message: error.error,
          suggestion: this.getSuggestion(error.error),
        });
      });

      // Transform other error types as needed
    });

    return errors;
  }

  private generateSummary(analysisResult: ExcelAnalysisResult): AnalysisSummary {
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {
      error: 0,
      warning: 0,
      info: 0,
    };
    const affectedSheets = new Set<string>();

    analysisResult.sheets.forEach(sheet => {
      if (sheet.formulaErrors?.length > 0) {
        affectedSheets.add(sheet.name);
        errorsByType.formula = (errorsByType.formula || 0) + sheet.formulaErrors.length;
        errorsBySeverity.error += sheet.formulaErrors.length;
      }
    });

    return {
      totalErrors: Object.values(errorsBySeverity).reduce((a, b) => a + b, 0),
      errorsByType,
      errorsBySeverity,
      affectedSheets: Array.from(affectedSheets),
    };
  }

  private getSuggestion(error: string): string {
    const suggestions: Record<string, string> = {
      "#DIV/0!": "0으로 나누기를 확인하세요. IF 함수를 사용하여 0 체크를 추가하세요.",
      "#VALUE!": "잘못된 데이터 타입입니다. 숫자가 필요한 곳에 텍스트가 있는지 확인하세요.",
      "#REF!": "참조가 유효하지 않습니다. 삭제된 셀이나 시트를 참조하고 있는지 확인하세요.",
      "#NAME?": "함수명이나 범위 이름이 잘못되었습니다. 철자를 확인하세요.",
      "#NUM!": "숫자가 너무 크거나 작습니다. 계산 결과를 확인하세요.",
      "#N/A": "값을 찾을 수 없습니다. VLOOKUP이나 MATCH 함수의 검색 값을 확인하세요.",
      "#NULL!": "교차 영역이 없습니다. 범위 참조를 확인하세요.",
    };

    return suggestions[error] || "수식을 다시 확인해주세요.";
  }

  private async saveErrorPatterns(
    fileId: string,
    userId: string,
    errors: ErrorDetail[]
  ): Promise<void> {
    const saveHandler = new SaveErrorPatternHandler();
    
    for (const error of errors) {
      try {
        await saveHandler.handle({
          fileId,
          userId,
          errorType: error.type,
          errorMessage: error.message,
          cellLocation: error.location.cell,
          sheetName: error.location.sheet,
          category: this.categorizeErrorType(error.type),
          severity: error.severity === "error" ? "HIGH" : error.severity === "warning" ? "MEDIUM" : "LOW",
          resolved: false,
          aiSuggestion: error.suggestion,
        });
      } catch (err) {
        console.error("Failed to save error pattern:", err);
      }
    }
  }

  private categorizeErrorType(type: string): string {
    const typeMap: Record<string, string> = {
      formula: "FORMULA",
      data: "DATA_TYPE",
      reference: "REFERENCE",
      format: "FORMAT",
      validation: "VALIDATION",
    };
    
    return typeMap[type] || "OTHER";
  }
}