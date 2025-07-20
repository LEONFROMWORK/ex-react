import { IFileRepository, FileEntity, Pagination } from "@/Common/Repositories/IFileRepository";
import { Result } from "@/Common/Result";
import { prisma } from "@/lib/prisma";

export class FileRepository implements IFileRepository {
  async save(file: Omit<FileEntity, 'id' | 'createdAt' | 'updatedAt'> & { metadata?: any }): Promise<Result<string>> {
    try {
      const created = await prisma.file.create({
        data: {
          userId: file.userId,
          fileName: file.fileName,
          originalName: file.originalName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          uploadUrl: file.uploadUrl,
          status: file.status,
          metadata: file.metadata || {}
        }
      });
      
      return Result.success(created.id);
    } catch (error) {
      console.error('FileRepository.save error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '파일 정보 저장에 실패했습니다.'
      });
    }
  }

  async findById(id: string): Promise<Result<FileEntity | null>> {
    try {
      const file = await prisma.file.findUnique({
        where: { id }
      });
      
      return Result.success(file);
    } catch (error) {
      console.error('FileRepository.findById error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '파일 조회에 실패했습니다.'
      });
    }
  }

  async findByUser(userId: string, pagination?: Pagination): Promise<Result<FileEntity[]>> {
    try {
      const files = await prisma.file.findMany({
        where: { userId },
        orderBy: pagination?.sortBy 
          ? { [pagination.sortBy]: pagination.sortOrder || 'desc' }
          : { createdAt: 'desc' },
        skip: pagination ? (pagination.page - 1) * pagination.limit : undefined,
        take: pagination?.limit
      });
      
      return Result.success(files);
    } catch (error) {
      console.error('FileRepository.findByUser error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '사용자 파일 조회에 실패했습니다.'
      });
    }
  }

  async findByUserAndId(userId: string, fileId: string): Promise<Result<FileEntity | null>> {
    try {
      const file = await prisma.file.findFirst({
        where: {
          id: fileId,
          userId
        }
      });
      
      return Result.success(file);
    } catch (error) {
      console.error('FileRepository.findByUserAndId error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '파일 조회에 실패했습니다.'
      });
    }
  }

  async findByMetadata(metadata: Record<string, any>): Promise<Result<FileEntity[]>> {
    try {
      const files = await prisma.file.findMany({
        where: {
          metadata: {
            path: Object.keys(metadata),
            equals: metadata
          }
        }
      });
      
      return Result.success(files);
    } catch (error) {
      console.error('FileRepository.findByMetadata error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '메타데이터로 파일 조회에 실패했습니다.'
      });
    }
  }

  async findByStatus(status: string): Promise<Result<FileEntity[]>> {
    try {
      const files = await prisma.file.findMany({
        where: { status }
      });
      
      return Result.success(files);
    } catch (error) {
      console.error('FileRepository.findByStatus error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '상태별 파일 조회에 실패했습니다.'
      });
    }
  }

  async updateStatus(fileId: string, status: string): Promise<Result<void>> {
    try {
      await prisma.file.update({
        where: { id: fileId },
        data: { status }
      });
      
      return Result.success(undefined);
    } catch (error) {
      console.error('FileRepository.updateStatus error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '파일 상태 업데이트에 실패했습니다.'
      });
    }
  }

  async updateMetadata(fileId: string, metadata: Record<string, any>): Promise<Result<void>> {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file) {
        return Result.failure({
          code: 'NOT_FOUND',
          message: '파일을 찾을 수 없습니다.'
        });
      }
      
      const updatedMetadata = {
        ...(file.metadata as object || {}),
        ...metadata
      };
      
      await prisma.file.update({
        where: { id: fileId },
        data: { metadata: updatedMetadata }
      });
      
      return Result.success(undefined);
    } catch (error) {
      console.error('FileRepository.updateMetadata error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '파일 메타데이터 업데이트에 실패했습니다.'
      });
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.file.delete({
        where: { id }
      });
      
      return Result.success(undefined);
    } catch (error) {
      console.error('FileRepository.delete error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '파일 삭제에 실패했습니다.'
      });
    }
  }

  async count(userId?: string): Promise<Result<number>> {
    try {
      const count = await prisma.file.count({
        where: userId ? { userId } : undefined
      });
      
      return Result.success(count);
    } catch (error) {
      console.error('FileRepository.count error:', error);
      return Result.failure({
        code: 'DB_ERROR',
        message: '파일 개수 조회에 실패했습니다.'
      });
    }
  }
}