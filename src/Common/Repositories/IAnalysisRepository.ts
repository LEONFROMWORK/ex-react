import { Result } from "@/Common/Result";

// 도메인 엔티티
export interface AnalysisEntity {
  id?: string;
  fileId: string;
  userId: string;
  errors: string; // JSON string
  corrections: string; // JSON string
  report: string; // JSON string
  aiTier: string; // AITier enum value as string
  confidence: number;
  creditsUsed: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  processingPath: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AnalysisWithFile extends AnalysisEntity {
  file?: {
    id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
  };
}

// Repository 인터페이스
export interface IAnalysisRepository {
  save(analysis: Omit<AnalysisEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<string>>;
  findById(id: string): Promise<Result<AnalysisEntity | null>>;
  findByFileId(fileId: string): Promise<Result<AnalysisEntity[]>>;
  findByUserId(userId: string, pagination?: { page: number; limit: number }): Promise<Result<AnalysisWithFile[]>>;
  findLatestByFileId(fileId: string): Promise<Result<AnalysisEntity | null>>;
  updateConfidence(id: string, confidence: number): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
  getUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<Result<{
    totalAnalyses: number;
    totalCreditsUsed: number;
    totalCost: number;
    averageConfidence: number;
  }>>;
}