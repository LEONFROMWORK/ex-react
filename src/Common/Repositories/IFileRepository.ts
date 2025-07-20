import { Result } from "@/Common/Result";

// 도메인 엔티티
export interface FileEntity {
  id?: string;
  userId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadUrl: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 페이지네이션 인터페이스
export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Repository 인터페이스
export interface IFileRepository {
  save(file: Omit<FileEntity, 'id' | 'createdAt' | 'updatedAt'> & { metadata?: any }): Promise<Result<string>>;
  findById(id: string): Promise<Result<FileEntity | null>>;
  findByUser(userId: string, pagination?: Pagination): Promise<Result<FileEntity[]>>;
  findByUserAndId(userId: string, fileId: string): Promise<Result<FileEntity | null>>;
  findByMetadata(metadata: Record<string, any>): Promise<Result<FileEntity[]>>;
  findByStatus(status: string): Promise<Result<FileEntity[]>>;
  updateStatus(fileId: string, status: string): Promise<Result<void>>;
  updateMetadata(fileId: string, metadata: Record<string, any>): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
  count(userId?: string): Promise<Result<number>>;
}