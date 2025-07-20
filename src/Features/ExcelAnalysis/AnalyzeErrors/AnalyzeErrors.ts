import { z } from "zod";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { analyzeExcelFile } from "@/lib/excel/analyzer-enhanced";
import { AnalysisResult as ExcelAnalysisResult } from "@/types/excel";
import { SaveErrorPatternHandler } from "@/Features/ErrorPatterns/SaveErrorPattern";
import { IFileRepository } from "@/Common/Repositories/IFileRepository";
import { IAnalysisRepository } from "@/Common/Repositories/IAnalysisRepository";
import { TransactionManager } from "@/Common/Database/TransactionUtils";
import { prisma } from "@/lib/prisma";
import fs from "fs";

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
  private transactionManager: TransactionManager;

  constructor(
    private fileRepository: IFileRepository,
    private analysisRepository: IAnalysisRepository
  ) {
    this.transactionManager = new TransactionManager(prisma);
  }

  async handle(
    request: AnalyzeErrorsRequest
  ): Promise<Result<AnalyzeErrorsResponse>> {
    try {
      // Validate file ownership using repository
      const fileResult = await this.fileRepository.findByUserAndId(request.userId, request.fileId);
      if (!fileResult.isSuccess) {
        return Result.failure(fileResult.error);
      }

      const file = fileResult.value;
      if (!file) {
        return Result.failure(ExcelErrors.NotFound);
      }

      // 트랜잭션으로 분석 프로세스 전체를 감싸기
      const transactionResult = await this.transactionManager.withRetryableTransaction(
        async (tx) => {
          // Update file status to processing
          await tx.file.update({
            where: { id: request.fileId },
            data: { status: "PROCESSING" }
          });

          // Perform analysis based on type
          const analysisResult = await this.performAnalysis(
            file.uploadUrl,
            request.analysisType
          );

          if (!analysisResult.isSuccess) {
            // Update file status to failed in transaction
            await tx.file.update({
              where: { id: request.fileId },
              data: { status: "FAILED" }
            });
            throw new Error(analysisResult.error?.message || 'Analysis failed');
          }

          // Save analysis results in transaction
          const analysisData = {
            fileId: request.fileId,
            userId: request.userId,
            errors: JSON.stringify([]), // 임시로 빈 배열
            corrections: JSON.stringify([]), // 임시로 빈 배열
            report: JSON.stringify(analysisResult.value),
            aiTier: "TIER1",
            confidence: 0.8,
            creditsUsed: 10,
            promptTokens: 100,
            completionTokens: 50,
            estimatedCost: 0.01,
            processingPath: "standard_analysis"
          };

          const analysis = await tx.analysis.create({
            data: analysisData
          });

          // Update file status to completed
          await tx.file.update({
            where: { id: request.fileId },
            data: { status: "COMPLETED" }
          });

          return {
            analysis,
            analysisResult: analysisResult.value
          };
        },
        {
          maxWait: 10000, // 10초 대기
          timeout: 30000, // 30초 타임아웃
          isolationLevel: 'ReadCommitted'
        }
      );

      if (!transactionResult.isSuccess) {
        return Result.failure(transactionResult.error);
      }

      const { analysis, analysisResult } = transactionResult.value;

      // Transform to response
      const errors = this.transformErrors(analysisResult);
      const response: AnalyzeErrorsResponse = {
        analysisId: analysis.id,
        fileId: request.fileId,
        errors,
        summary: this.generateSummary(analysisResult),
        status: "COMPLETED",
        analyzedAt: analysis.createdAt,
      };

      // Save error patterns for future analysis (별도 트랜잭션)
      try {
        await this.saveErrorPatterns(request.fileId, request.userId, errors);
      } catch (error) {
        console.warn('Failed to save error patterns, but analysis completed successfully:', error);
      }

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
      // analyzeExcelFile expects a Buffer, not a file path
      const fileBuffer = fs.readFileSync(filePath);
      const result = await analyzeExcelFile(fileBuffer);
      return Result.success(result);
    } catch (error) {
      console.error("Analysis error:", error);
      return Result.failure(ExcelErrors.AnalysisFailed);
    }
  }

  private transformErrors(analysisResult: ExcelAnalysisResult): ErrorDetail[] {
    const errors: ErrorDetail[] = [];

    // Transform errors from AnalysisResult
    analysisResult.errors?.forEach(error => {
      errors.push({
        type: error.type.toLowerCase() as any,
        severity: this.mapSeverity(error.severity),
        location: {
          sheet: this.extractSheetFromLocation(error.location),
          cell: this.extractCellFromLocation(error.location),
        },
        message: error.description,
        suggestion: error.suggestion || this.getSuggestion(error.description),
      });
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

    analysisResult.errors?.forEach(error => {
      const sheetName = this.extractSheetFromLocation(error.location);
      affectedSheets.add(sheetName);
      
      const errorType = error.type.toLowerCase();
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: Object.values(errorsBySeverity).reduce((a, b) => a + b, 0),
      errorsByType,
      errorsBySeverity,
      affectedSheets: Array.from(affectedSheets),
    };
  }

  private extractSheetFromLocation(location: string): string {
    // location 형태: "Sheet1!A1" 또는 "A1"
    const parts = location.split('!');
    return parts.length > 1 ? parts[0] : 'Sheet1';
  }

  private extractCellFromLocation(location: string): string {
    // location 형태: "Sheet1!A1" 또는 "A1"
    const parts = location.split('!');
    return parts.length > 1 ? parts[1] : parts[0];
  }

  private mapSeverity(severity: "low" | "medium" | "high"): "error" | "warning" | "info" {
    switch (severity) {
      case "high": return "error";
      case "medium": return "warning";
      case "low": return "info";
      default: return "info";
    }
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