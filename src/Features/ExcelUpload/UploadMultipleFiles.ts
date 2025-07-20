import { z } from "zod";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { randomUUID } from "crypto";
import { IFileStorage } from "./UploadExcel";
import { IFileRepository } from "@/Common/Repositories/IFileRepository";

// Request Schema for multiple files
export const UploadMultipleFilesRequestSchema = z.object({
  excelFile: z.instanceof(File),
  imageFiles: z.array(z.instanceof(File)).min(1).max(5),
  userId: z.string().min(1, "사용자 ID가 필요합니다."),
  analysisPrompt: z.string().optional(),
  sessionId: z.string().optional(),
});

export type UploadMultipleFilesRequest = z.infer<typeof UploadMultipleFilesRequestSchema>;

// Response Type
export interface UploadMultipleFilesResponse {
  sessionId: string;
  excelFile: {
    fileId: string;
    fileName: string;
    fileSize: number;
  };
  imageFiles: Array<{
    fileId: string;
    fileName: string;
    fileSize: number;
  }>;
  status: string;
  uploadedAt: Date;
}

// Enhanced Validator for multiple files
export class UploadMultipleFilesValidator {
  private static readonly validExcelTypes = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ];

  private static readonly validImageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  private static readonly maxExcelSize = 50 * 1024 * 1024; // 50MB
  private static readonly maxImageSize = 10 * 1024 * 1024; // 10MB per image

  static validate(request: UploadMultipleFilesRequest): Result<void> {
    const { excelFile, imageFiles } = request;

    // Validate Excel file
    if (!excelFile) {
      return Result.failure(ExcelErrors.EmptyFile);
    }

    if (!this.validExcelTypes.includes(excelFile.type)) {
      return Result.failure({
        ...ExcelErrors.InvalidFormat,
        message: "유효하지 않은 Excel 파일 형식입니다.",
      });
    }

    if (excelFile.size > this.maxExcelSize) {
      return Result.failure({
        ...ExcelErrors.TooLarge,
        message: `Excel 파일은 ${this.maxExcelSize / 1024 / 1024}MB를 초과할 수 없습니다.`,
      });
    }

    // Validate image files
    for (const imageFile of imageFiles) {
      if (!this.validImageTypes.includes(imageFile.type)) {
        return Result.failure({
          ...ExcelErrors.InvalidFormat,
          message: `${imageFile.name}: 유효하지 않은 이미지 형식입니다.`,
        });
      }

      if (imageFile.size > this.maxImageSize) {
        return Result.failure({
          ...ExcelErrors.TooLarge,
          message: `${imageFile.name}: 이미지는 ${this.maxImageSize / 1024 / 1024}MB를 초과할 수 없습니다.`,
        });
      }
    }

    return Result.success(undefined);
  }
}

// Handler for multiple file uploads
export class UploadMultipleFilesHandler {
  constructor(
    private fileRepository: IFileRepository,
    private fileStorage: IFileStorage
  ) {}

  async handle(
    request: UploadMultipleFilesRequest
  ): Promise<Result<UploadMultipleFilesResponse>> {
    try {
      // Validate request
      const validationResult = UploadMultipleFilesValidator.validate(request);
      if (!validationResult.isSuccess) {
        return Result.failure(validationResult.error);
      }

      const { excelFile, imageFiles, userId, analysisPrompt } = request;
      const sessionId = request.sessionId || randomUUID();

      // Upload Excel file
      const excelExtension = excelFile.name.split(".").pop();
      const excelFileName = `${sessionId}_excel.${excelExtension}`;
      
      const excelUploadResult = await this.fileStorage.uploadAsync(
        excelFile,
        excelFileName
      );
      
      if (!excelUploadResult.isSuccess) {
        return Result.failure(excelUploadResult.error);
      }

      // Save Excel file metadata
      const excelSaveResult = await this.fileRepository.save({
        userId,
        fileName: excelFileName,
        originalName: excelFile.name,
        fileSize: excelFile.size,
        mimeType: excelFile.type,
        uploadUrl: excelUploadResult.value,
        status: "PENDING",
        metadata: {
          sessionId,
          fileType: "excel",
          analysisPrompt,
        },
      });

      if (!excelSaveResult.isSuccess) {
        return Result.failure(excelSaveResult.error);
      }

      // Upload image files
      const uploadedImages = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const imageFile = imageFiles[i];
        const imageExtension = imageFile.name.split(".").pop();
        const imageFileName = `${sessionId}_image_${i + 1}.${imageExtension}`;

        const imageUploadResult = await this.fileStorage.uploadAsync(
          imageFile,
          imageFileName
        );

        if (!imageUploadResult.isSuccess) {
          // Continue with other images even if one fails
          console.error(`Failed to upload image ${i + 1}:`, imageUploadResult.error);
          continue;
        }

        // Save image file metadata
        const imageSaveResult = await this.fileRepository.save({
          userId,
          fileName: imageFileName,
          originalName: imageFile.name,
          fileSize: imageFile.size,
          mimeType: imageFile.type,
          uploadUrl: imageUploadResult.value,
          status: "PENDING",
          metadata: {
            sessionId,
            fileType: "image",
            imageIndex: i + 1,
            relatedExcelId: excelSaveResult.value,
          },
        });

        if (imageSaveResult.isSuccess) {
          uploadedImages.push({
            fileId: imageSaveResult.value,
            fileName: imageFile.name,
            fileSize: imageFile.size,
          });
        }
      }

      // Check if at least one image was uploaded successfully
      if (uploadedImages.length === 0) {
        return Result.failure({
          code: "UPLOAD_FAILED",
          message: "이미지 파일 업로드에 실패했습니다.",
        });
      }

      const response: UploadMultipleFilesResponse = {
        sessionId,
        excelFile: {
          fileId: excelSaveResult.value,
          fileName: excelFile.name,
          fileSize: excelFile.size,
        },
        imageFiles: uploadedImages,
        status: "READY_FOR_ANALYSIS",
        uploadedAt: new Date(),
      };

      return Result.success(response);
    } catch (error) {
      console.error("Upload multiple files handler error:", error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }
}

// Utility function to group files by session
export async function getFilesBySession(
  fileRepository: IFileRepository,
  sessionId: string
): Promise<Result<{
  excelFile?: any;
  imageFiles: any[];
}>> {
  try {
    const filesResult = await fileRepository.findByMetadata({
      sessionId,
    });

    if (!filesResult.isSuccess) {
      return Result.failure(filesResult.error);
    }

    const files = filesResult.value;
    const excelFile = files.find((f: any) => f.metadata?.fileType === "excel");
    const imageFiles = files
      .filter((f: any) => f.metadata?.fileType === "image")
      .sort((a: any, b: any) => (a.metadata?.imageIndex || 0) - (b.metadata?.imageIndex || 0));

    return Result.success({
      excelFile,
      imageFiles,
    });
  } catch (error) {
    console.error("Get files by session error:", error);
    return Result.failure({
      code: "FETCH_FAILED",
      message: "세션 파일 조회에 실패했습니다.",
    });
  }
}