import { z } from "zod";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

// Request Schema
export const UploadExcelRequestSchema = z.object({
  file: z.instanceof(File),
  userId: z.string().min(1, "사용자 ID가 필요합니다."),
});

export type UploadExcelRequest = z.infer<typeof UploadExcelRequestSchema>;

// Response Type
export interface UploadExcelResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  status: string;
  uploadedAt: Date;
}

// Validator
export class UploadExcelValidator {
  private static readonly validContentTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  private static readonly maxFileSize = 50 * 1024 * 1024; // 50MB

  static validate(request: UploadExcelRequest): Result<void> {
    const { file } = request;

    if (!file) {
      return Result.failure(ExcelErrors.EmptyFile);
    }

    if (!this.validContentTypes.includes(file.type)) {
      return Result.failure(ExcelErrors.InvalidFormat);
    }

    if (file.size > this.maxFileSize) {
      return Result.failure(ExcelErrors.TooLarge);
    }

    return Result.success(undefined);
  }
}

// File Storage Interface
export interface IFileStorage {
  uploadAsync(
    file: File,
    fileName: string
  ): Promise<Result<string>>;
}

// Local File Storage Implementation (for development)
export class LocalFileStorage implements IFileStorage {
  private uploadDir = join(process.cwd(), "uploads");

  async uploadAsync(
    file: File,
    fileName: string
  ): Promise<Result<string>> {
    try {
      // Create uploads directory if it doesn't exist
      await mkdir(this.uploadDir, { recursive: true });

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Write file
      const filePath = join(this.uploadDir, fileName);
      await writeFile(filePath, buffer);

      return Result.success(`/uploads/${fileName}`);
    } catch (error) {
      console.error("File storage error:", error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }
}

// Handler
export class UploadExcelHandler {
  constructor(
    private fileStorage: IFileStorage = new LocalFileStorage()
  ) {}

  async handle(
    request: UploadExcelRequest
  ): Promise<Result<UploadExcelResponse>> {
    try {
      // Validate request
      const validationResult = UploadExcelValidator.validate(request);
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error);
      }

      const { file, userId } = request;

      // Generate unique file identifier
      const fileExtension = file.name.split(".").pop();
      const fileName = `${randomUUID()}.${fileExtension}`;

      // Upload file to storage
      const uploadResult = await this.fileStorage.uploadAsync(file, fileName);
      if (!uploadResult.isSuccess) {
        return Result.failure(uploadResult.error);
      }

      // Save file metadata to database
      const fileRecord = await prisma.file.create({
        data: {
          userId,
          fileName,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadUrl: uploadResult.value,
          status: "PENDING",
        },
      });

      const response: UploadExcelResponse = {
        fileId: fileRecord.id,
        fileName: fileRecord.originalName,
        fileSize: fileRecord.fileSize,
        status: fileRecord.status,
        uploadedAt: fileRecord.createdAt,
      };

      return Result.success(response);
    } catch (error) {
      console.error("Upload Excel handler error:", error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }
}