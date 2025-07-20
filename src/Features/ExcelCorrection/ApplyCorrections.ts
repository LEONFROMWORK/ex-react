import { z } from "zod";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

// Request Schema
export const ApplyCorrectionRequestSchema = z.object({
  fileId: z.string().min(1, "파일 ID가 필요합니다"),
  userId: z.string().min(1, "사용자 ID가 필요합니다"),
  corrections: z.array(z.object({
    sheet: z.string(),
    cell: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
    correctionType: z.enum(["formula", "value", "format"]),
  })),
  autoApply: z.boolean().default(false),
});

export type ApplyCorrectionRequest = z.infer<typeof ApplyCorrectionRequestSchema>;

// Response Type
export interface ApplyCorrectionResponse {
  correctionId: string;
  fileId: string;
  correctedFileUrl: string;
  appliedCorrections: number;
  failedCorrections: CorrectionFailure[];
  correctedAt: Date;
}

export interface CorrectionFailure {
  sheet: string;
  cell: string;
  reason: string;
}

// Correction Strategies
export abstract class CorrectionStrategy {
  abstract apply(
    worksheet: XLSX.WorkSheet,
    cell: string,
    newValue: any
  ): Result<void>;
}

export class FormulaCorrectionStrategy extends CorrectionStrategy {
  apply(worksheet: XLSX.WorkSheet, cell: string, newValue: any): Result<void> {
    try {
      const cellObj = worksheet[cell];
      if (!cellObj) {
        return Result.failure({
          code: "Correction.CellNotFound",
          message: `셀 ${cell}을 찾을 수 없습니다`,
        });
      }

      // Apply formula correction
      cellObj.f = newValue;
      cellObj.v = undefined; // Clear cached value
      return Result.success(undefined);
    } catch (error) {
      return Result.failure({
        code: "Correction.Failed",
        message: "수식 수정 중 오류가 발생했습니다",
      });
    }
  }
}

export class ValueCorrectionStrategy extends CorrectionStrategy {
  apply(worksheet: XLSX.WorkSheet, cell: string, newValue: any): Result<void> {
    try {
      const cellObj = worksheet[cell];
      if (!cellObj) {
        worksheet[cell] = { v: newValue, t: this.getCellType(newValue) };
      } else {
        cellObj.v = newValue;
        cellObj.t = this.getCellType(newValue);
      }
      return Result.success(undefined);
    } catch (error) {
      return Result.failure({
        code: "Correction.Failed",
        message: "값 수정 중 오류가 발생했습니다",
      });
    }
  }

  private getCellType(value: any): string {
    if (typeof value === "number") return "n";
    if (typeof value === "boolean") return "b";
    if (value instanceof Date) return "d";
    return "s"; // string
  }
}

// Handler
export class ApplyCorrectionHandler {
  private strategies: Map<string, CorrectionStrategy> = new Map([
    ["formula", new FormulaCorrectionStrategy()],
    ["value", new ValueCorrectionStrategy()],
  ]);

  async handle(
    request: ApplyCorrectionRequest
  ): Promise<Result<ApplyCorrectionResponse>> {
    try {
      // Validate file ownership and get file info
      const file = await prisma.file.findFirst({
        where: {
          id: request.fileId,
          userId: request.userId,
        },
      });

      if (!file) {
        return Result.failure(ExcelErrors.NotFound);
      }

      // Load the Excel file
      const filePath = join(process.cwd(), file.uploadUrl);
      const fileBuffer = await readFile(filePath);
      const workbook = XLSX.read(fileBuffer);

      // Apply corrections
      const appliedCorrections: any[] = [];
      const failedCorrections: CorrectionFailure[] = [];

      for (const correction of request.corrections) {
        const worksheet = workbook.Sheets[correction.sheet];
        if (!worksheet) {
          failedCorrections.push({
            sheet: correction.sheet,
            cell: correction.cell,
            reason: "시트를 찾을 수 없습니다",
          });
          continue;
        }

        const strategy = this.strategies.get(correction.correctionType);
        if (!strategy) {
          failedCorrections.push({
            sheet: correction.sheet,
            cell: correction.cell,
            reason: "지원하지 않는 수정 타입입니다",
          });
          continue;
        }

        const result = strategy.apply(
          worksheet,
          correction.cell,
          correction.newValue
        );

        if (result.isSuccess) {
          appliedCorrections.push(correction);
        } else {
          failedCorrections.push({
            sheet: correction.sheet,
            cell: correction.cell,
            reason: result.error?.message || "Request failed",
          });
        }
      }

      // Save corrected file
      const correctedFileName = `corrected_${file.fileName}`;
      const correctedFilePath = join(process.cwd(), "uploads", correctedFileName);
      const correctedBuffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: "xlsx" 
      });
      await writeFile(correctedFilePath, correctedBuffer);

      // Save correction record
      const correctionRecord = await prisma.correction.create({
        data: {
          fileId: request.fileId,
          userId: request.userId,
          analysisId: "temp-analysis-id", // 분석 ID가 필요함
          corrections: JSON.stringify({
            applied: appliedCorrections,
            failed: failedCorrections,
          }),
          correctedFileUrl: `/uploads/${correctedFileName}`,
          status: failedCorrections.length === 0 ? "COMPLETED" : "PARTIAL",
          creditsUsed: 5,
          creditsCharged: 5,
        },
      });

      const response: ApplyCorrectionResponse = {
        correctionId: correctionRecord.id,
        fileId: request.fileId,
        correctedFileUrl: correctionRecord.correctedFileUrl,
        appliedCorrections: appliedCorrections.length,
        failedCorrections,
        correctedAt: correctionRecord.createdAt,
      };

      return Result.success(response);
    } catch (error) {
      console.error("Apply correction handler error:", error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }
}