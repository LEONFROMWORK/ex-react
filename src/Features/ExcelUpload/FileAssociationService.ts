import { Result } from "@/Common/Result";
import { IFileRepository } from "@/Common/Repositories/IFileRepository";

export interface FileAssociation {
  sessionId: string;
  excelFileId: string;
  imageFileIds: string[];
  analysisPrompt?: string;
  createdAt: Date;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
}

export interface AssociatedFiles {
  excel: {
    id: string;
    fileName: string;
    originalName: string;
    uploadUrl: string;
    fileSize: number;
  };
  images: Array<{
    id: string;
    fileName: string;
    originalName: string;
    uploadUrl: string;
    fileSize: number;
    index: number;
  }>;
  analysisPrompt?: string;
}

export class FileAssociationService {
  constructor(private fileRepository: IFileRepository) {}

  /**
   * 세션 ID로 연관된 파일들을 조회
   */
  async getAssociatedFiles(sessionId: string): Promise<Result<AssociatedFiles>> {
    try {
      // 세션 ID로 파일들 조회
      const filesResult = await this.fileRepository.findByMetadata({
        sessionId,
      });

      if (!filesResult.isSuccess) {
        return Result.failure({
          code: "FILES_NOT_FOUND",
          message: "연관된 파일을 찾을 수 없습니다.",
        });
      }

      const files = filesResult.value;
      
      // Excel 파일 찾기
      const excelFile = files.find((f: any) => f.metadata?.fileType === "excel");
      if (!excelFile) {
        return Result.failure({
          code: "EXCEL_NOT_FOUND",
          message: "Excel 파일을 찾을 수 없습니다.",
        });
      }

      // 이미지 파일들 찾기 및 정렬
      const imageFiles = files
        .filter((f: any) => f.metadata?.fileType === "image")
        .sort((a: any, b: any) => 
          (a.metadata?.imageIndex || 0) - (b.metadata?.imageIndex || 0)
        )
        .map((f: any) => ({
          id: f.id,
          fileName: f.fileName,
          originalName: f.originalName,
          uploadUrl: f.uploadUrl,
          fileSize: f.fileSize,
          index: f.metadata?.imageIndex || 0,
        }));

      if (imageFiles.length === 0) {
        return Result.failure({
          code: "IMAGES_NOT_FOUND",
          message: "이미지 파일을 찾을 수 없습니다.",
        });
      }

      return Result.success({
        excel: {
          id: excelFile.id,
          fileName: excelFile.fileName,
          originalName: excelFile.originalName,
          uploadUrl: excelFile.uploadUrl,
          fileSize: excelFile.fileSize,
        },
        images: imageFiles,
        analysisPrompt: excelFile.metadata?.analysisPrompt,
      });
    } catch (error) {
      console.error("Get associated files error:", error);
      return Result.failure({
        code: "ASSOCIATION_ERROR",
        message: "파일 연관 정보 조회 중 오류가 발생했습니다.",
      });
    }
  }

  /**
   * 파일 연관 관계 생성
   */
  async createAssociation(
    sessionId: string,
    excelFileId: string,
    imageFileIds: string[],
    analysisPrompt?: string
  ): Promise<Result<FileAssociation>> {
    try {
      const association: FileAssociation = {
        sessionId,
        excelFileId,
        imageFileIds,
        analysisPrompt,
        createdAt: new Date(),
        status: 'pending',
      };

      // 실제 구현에서는 별도의 Association 테이블에 저장할 수 있음
      // 현재는 파일 메타데이터에 저장된 정보를 활용

      return Result.success(association);
    } catch (error) {
      console.error("Create association error:", error);
      return Result.failure({
        code: "ASSOCIATION_FAILED",
        message: "파일 연관 관계 생성에 실패했습니다.",
      });
    }
  }

  /**
   * 연관 관계 상태 업데이트
   */
  async updateAssociationStatus(
    sessionId: string,
    status: FileAssociation['status']
  ): Promise<Result<void>> {
    try {
      // 세션의 모든 파일 상태 업데이트
      const filesResult = await this.fileRepository.findByMetadata({
        sessionId,
      });

      if (!filesResult.isSuccess) {
        return Result.failure(filesResult.error);
      }

      const files = filesResult.value;
      
      // 각 파일의 상태 업데이트
      for (const file of files) {
        await this.fileRepository.updateStatus(file.id, status.toUpperCase());
      }

      return Result.success(undefined);
    } catch (error) {
      console.error("Update association status error:", error);
      return Result.failure({
        code: "STATUS_UPDATE_FAILED",
        message: "상태 업데이트에 실패했습니다.",
      });
    }
  }

  /**
   * Excel 파일과 이미지의 매핑 정보 생성
   */
  async createFileMapping(
    sessionId: string,
    mappings: Array<{
      imageIndex: number;
      excelRange?: string; // e.g., "A1:D10"
      description?: string;
    }>
  ): Promise<Result<void>> {
    try {
      // 매핑 정보를 파일 메타데이터에 추가
      const filesResult = await this.getAssociatedFiles(sessionId);
      
      if (!filesResult.isSuccess) {
        return Result.failure(filesResult.error);
      }

      const { images } = filesResult.value;

      for (const mapping of mappings) {
        const image = images.find(img => img.index === mapping.imageIndex);
        if (image) {
          // 이미지 파일의 메타데이터 업데이트
          await this.fileRepository.updateMetadata(image.id, {
            excelRange: mapping.excelRange,
            mappingDescription: mapping.description,
          });
        }
      }

      return Result.success(undefined);
    } catch (error) {
      console.error("Create file mapping error:", error);
      return Result.failure({
        code: "MAPPING_FAILED",
        message: "파일 매핑 생성에 실패했습니다.",
      });
    }
  }

  /**
   * 분석 준비 상태 확인
   */
  async isReadyForAnalysis(sessionId: string): Promise<Result<boolean>> {
    try {
      const filesResult = await this.getAssociatedFiles(sessionId);
      
      if (!filesResult.isSuccess) {
        return Result.success(false);
      }

      const { excel, images } = filesResult.value;
      
      // Excel 파일과 최소 1개 이상의 이미지가 있어야 분석 가능
      const isReady = excel && images.length > 0;
      
      return Result.success(isReady);
    } catch (error) {
      console.error("Check analysis ready error:", error);
      return Result.success(false);
    }
  }

  /**
   * 세션 정리 (오래된 임시 파일 제거용)
   */
  async cleanupOldSessions(olderThanHours: number = 24): Promise<Result<number>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

      // 오래된 pending 상태 파일들 조회 및 삭제
      const oldFilesResult = await this.fileRepository.findByStatus("PENDING");
      
      if (!oldFilesResult.isSuccess) {
        return Result.success(0);
      }

      const oldFiles = oldFilesResult.value.filter(
        (f: any) => new Date(f.createdAt) < cutoffDate
      );

      let deletedCount = 0;
      for (const file of oldFiles) {
        const deleteResult = await this.fileRepository.delete(file.id);
        if (deleteResult.isSuccess) {
          deletedCount++;
        }
      }

      return Result.success(deletedCount);
    } catch (error) {
      console.error("Cleanup old sessions error:", error);
      return Result.failure({
        code: "CLEANUP_FAILED",
        message: "세션 정리에 실패했습니다.",
      });
    }
  }
}