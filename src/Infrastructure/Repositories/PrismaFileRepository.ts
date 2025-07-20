import { PrismaClient } from "@prisma/client";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { IFileRepository, FileEntity, Pagination } from "@/Common/Repositories/IFileRepository";

export class PrismaFileRepository implements IFileRepository {
  constructor(private db: PrismaClient) {}

  async save(file: Omit<FileEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<string>> {
    try {
      const result = await this.db.file.create({
        data: {
          userId: file.userId,
          fileName: file.fileName,
          originalName: file.originalName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadUrl: file.uploadUrl,
          status: file.status,
        },
      });

      return Result.success(result.id);
    } catch (error) {
      console.error('File save error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async findById(id: string): Promise<Result<FileEntity | null>> {
    try {
      const file = await this.db.file.findUnique({
        where: { id },
      });

      if (!file) {
        return Result.success(null);
      }

      const fileEntity: FileEntity = {
        id: file.id,
        userId: file.userId,
        fileName: file.fileName,
        originalName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadUrl: file.uploadUrl,
        status: file.status,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };

      return Result.success(fileEntity);
    } catch (error) {
      console.error('File findById error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async findByUser(userId: string, pagination?: Pagination): Promise<Result<FileEntity[]>> {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination || {};
      const skip = (page - 1) * limit;

      const files = await this.db.file.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      });

      const fileEntities: FileEntity[] = files.map(file => ({
        id: file.id,
        userId: file.userId,
        fileName: file.fileName,
        originalName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadUrl: file.uploadUrl,
        status: file.status,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      }));

      return Result.success(fileEntities);
    } catch (error) {
      console.error('File findByUser error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async findByUserAndId(userId: string, fileId: string): Promise<Result<FileEntity | null>> {
    try {
      const file = await this.db.file.findFirst({
        where: {
          id: fileId,
          userId: userId,
        },
      });

      if (!file) {
        return Result.success(null);
      }

      const fileEntity: FileEntity = {
        id: file.id,
        userId: file.userId,
        fileName: file.fileName,
        originalName: file.originalName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadUrl: file.uploadUrl,
        status: file.status,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };

      return Result.success(fileEntity);
    } catch (error) {
      console.error('File findByUserAndId error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async updateStatus(fileId: string, status: string): Promise<Result<void>> {
    try {
      await this.db.file.update({
        where: { id: fileId },
        data: { status },
      });

      return Result.success(undefined);
    } catch (error) {
      console.error('File updateStatus error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await this.db.file.delete({
        where: { id },
      });

      return Result.success(undefined);
    } catch (error) {
      console.error('File delete error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async count(userId?: string): Promise<Result<number>> {
    try {
      const count = await this.db.file.count({
        where: userId ? { userId } : undefined,
      });

      return Result.success(count);
    } catch (error) {
      console.error('File count error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }
}