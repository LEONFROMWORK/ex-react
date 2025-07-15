import { z } from "zod";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { writeFile } from "fs/promises";
import { join } from "path";

// Request Schema
export const GenerateErrorReportRequestSchema = z.object({
  analysisId: z.string().min(1, "분석 ID가 필요합니다"),
  userId: z.string().min(1, "사용자 ID가 필요합니다"),
  format: z.enum(["xlsx", "pdf", "html"]).default("xlsx"),
  includeDetails: z.boolean().default(true),
  includeSuggestions: z.boolean().default(true),
});

export type GenerateErrorReportRequest = z.infer<typeof GenerateErrorReportRequestSchema>;

// Response Type
export interface GenerateErrorReportResponse {
  reportId: string;
  reportUrl: string;
  format: string;
  generatedAt: Date;
  summary: {
    totalErrors: number;
    criticalErrors: number;
    warnings: number;
  };
}

// Report Generator Strategy Pattern
export abstract class ReportGenerator {
  abstract generate(
    analysis: any,
    options: ReportOptions
  ): Promise<Result<string>>;
}

export interface ReportOptions {
  includeDetails: boolean;
  includeSuggestions: boolean;
}

// Excel Report Generator
export class ExcelReportGenerator extends ReportGenerator {
  async generate(
    analysis: any,
    options: ReportOptions
  ): Promise<Result<string>> {
    try {
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = this.createSummaryData(analysis);
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "요약");

      // Errors Detail Sheet
      if (options.includeDetails) {
        const errorsData = this.createErrorsData(analysis, options);
        const errorsSheet = XLSX.utils.json_to_sheet(errorsData);
        XLSX.utils.book_append_sheet(workbook, errorsSheet, "오류 상세");
      }

      // Generate file
      const fileName = `error_report_${analysis.id}_${Date.now()}.xlsx`;
      const filePath = join(process.cwd(), "uploads", fileName);
      
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      await writeFile(filePath, buffer);

      return Result.success(`/uploads/${fileName}`);
    } catch (error) {
      console.error("Excel report generation error:", error);
      return Result.failure({
        code: "Report.GenerationFailed",
        message: "보고서 생성 중 오류가 발생했습니다",
      });
    }
  }

  private createSummaryData(analysis: any): any[] {
    const results = analysis.results;
    return [
      { 항목: "총 오류 수", 값: results.totalErrors || 0 },
      { 항목: "심각한 오류", 값: results.criticalErrors || 0 },
      { 항목: "경고", 값: results.warnings || 0 },
      { 항목: "분석 날짜", 값: new Date(analysis.createdAt).toLocaleString("ko-KR") },
      { 항목: "파일명", 값: analysis.file?.originalName || "알 수 없음" },
    ];
  }

  private createErrorsData(analysis: any, options: ReportOptions): any[] {
    const errors: any[] = [];
    const results = analysis.results;

    if (results.sheets) {
      results.sheets.forEach((sheet: any) => {
        sheet.formulaErrors?.forEach((error: any) => {
          const errorRow: any = {
            시트: sheet.name,
            셀: error.cell,
            오류유형: "수식 오류",
            오류내용: error.error,
            심각도: "높음",
          };

          if (options.includeSuggestions) {
            errorRow.해결방안 = this.getSuggestion(error.error);
          }

          errors.push(errorRow);
        });
      });
    }

    return errors;
  }

  private getSuggestion(error: string): string {
    const suggestions: Record<string, string> = {
      "#DIV/0!": "0으로 나누기를 확인하세요. IF 함수로 0 체크를 추가하세요.",
      "#VALUE!": "잘못된 데이터 타입입니다. 숫자가 필요한 곳을 확인하세요.",
      "#REF!": "참조가 유효하지 않습니다. 삭제된 셀/시트를 확인하세요.",
      "#NAME?": "함수명이나 범위 이름의 철자를 확인하세요.",
      "#NUM!": "숫자가 너무 크거나 작습니다.",
      "#N/A": "VLOOKUP이나 MATCH의 검색 값을 확인하세요.",
      "#NULL!": "범위 참조를 확인하세요.",
    };
    return suggestions[error] || "수식을 다시 확인해주세요.";
  }
}

// Handler
export class GenerateErrorReportHandler {
  private generators: Map<string, ReportGenerator> = new Map([
    ["xlsx", new ExcelReportGenerator()],
    // ["pdf", new PdfReportGenerator()], // Future implementation
    // ["html", new HtmlReportGenerator()], // Future implementation
  ]);

  async handle(
    request: GenerateErrorReportRequest
  ): Promise<Result<GenerateErrorReportResponse>> {
    try {
      // Validate analysis ownership
      const analysis = await prisma.analysis.findFirst({
        where: {
          id: request.analysisId,
          userId: request.userId,
        },
        include: {
          file: true,
        },
      });

      if (!analysis) {
        return Result.failure(ExcelErrors.NotFound);
      }

      // Get appropriate generator
      const generator = this.generators.get(request.format);
      if (!generator) {
        return Result.failure({
          code: "Report.UnsupportedFormat",
          message: "지원하지 않는 보고서 형식입니다",
        });
      }

      // Generate report
      const reportResult = await generator.generate(analysis, {
        includeDetails: request.includeDetails,
        includeSuggestions: request.includeSuggestions,
      });

      if (!reportResult.isSuccess) {
        return Result.failure(reportResult.error);
      }

      // Save report record
      const report = await prisma.report.create({
        data: {
          analysisId: request.analysisId,
          userId: request.userId,
          format: request.format,
          reportUrl: reportResult.value,
          metadata: {
            includeDetails: request.includeDetails,
            includeSuggestions: request.includeSuggestions,
          },
        },
      });

      // Calculate summary
      const results = analysis.results as any;
      const summary = {
        totalErrors: results.totalErrors || 0,
        criticalErrors: results.criticalErrors || 0,
        warnings: results.warnings || 0,
      };

      const response: GenerateErrorReportResponse = {
        reportId: report.id,
        reportUrl: report.reportUrl,
        format: report.format,
        generatedAt: report.createdAt,
        summary,
      };

      return Result.success(response);
    } catch (error) {
      console.error("Generate report handler error:", error);
      return Result.failure({
        code: "Report.GenerationFailed",
        message: "보고서 생성 중 오류가 발생했습니다",
      });
    }
  }
}