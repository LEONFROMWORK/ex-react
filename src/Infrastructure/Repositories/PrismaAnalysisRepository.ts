import { PrismaClient, AITier } from "@prisma/client";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { IAnalysisRepository, AnalysisEntity, AnalysisWithFile } from "@/Common/Repositories/IAnalysisRepository";

export class PrismaAnalysisRepository implements IAnalysisRepository {
  constructor(private db: PrismaClient) {}

  async save(analysis: Omit<AnalysisEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<string>> {
    try {
      const result = await this.db.analysis.create({
        data: {
          fileId: analysis.fileId,
          userId: analysis.userId,
          errors: analysis.errors,
          corrections: analysis.corrections,
          report: analysis.report,
          aiTier: analysis.aiTier as string,
          confidence: analysis.confidence,
          creditsUsed: analysis.creditsUsed,
          promptTokens: analysis.promptTokens,
          completionTokens: analysis.completionTokens,
          estimatedCost: analysis.estimatedCost,
          processingPath: analysis.processingPath,
        },
      });

      return Result.success(result.id);
    } catch (error) {
      console.error('Analysis save error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async findById(id: string): Promise<Result<AnalysisEntity | null>> {
    try {
      const analysis = await this.db.analysis.findUnique({
        where: { id },
      });

      if (!analysis) {
        return Result.success(null);
      }

      const analysisEntity: AnalysisEntity = {
        id: analysis.id,
        fileId: analysis.fileId,
        userId: analysis.userId,
        errors: analysis.errors,
        corrections: analysis.corrections,
        report: analysis.report,
        aiTier: analysis.aiTier as string,
        confidence: analysis.confidence,
        creditsUsed: analysis.creditsUsed,
        promptTokens: analysis.promptTokens,
        completionTokens: analysis.completionTokens,
        estimatedCost: analysis.estimatedCost,
        processingPath: analysis.processingPath,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
      };

      return Result.success(analysisEntity);
    } catch (error) {
      console.error('Analysis findById error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async findByFileId(fileId: string): Promise<Result<AnalysisEntity[]>> {
    try {
      const analyses = await this.db.analysis.findMany({
        where: { fileId },
        orderBy: { createdAt: 'desc' },
      });

      const analysisEntities: AnalysisEntity[] = analyses.map(analysis => ({
        id: analysis.id,
        fileId: analysis.fileId,
        userId: analysis.userId,
        errors: analysis.errors,
        corrections: analysis.corrections,
        report: analysis.report,
        aiTier: analysis.aiTier as string,
        confidence: analysis.confidence,
        creditsUsed: analysis.creditsUsed,
        promptTokens: analysis.promptTokens,
        completionTokens: analysis.completionTokens,
        estimatedCost: analysis.estimatedCost,
        processingPath: analysis.processingPath,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
      }));

      return Result.success(analysisEntities);
    } catch (error) {
      console.error('Analysis findByFileId error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async findByUserId(userId: string, pagination?: { page: number; limit: number }): Promise<Result<AnalysisWithFile[]>> {
    try {
      const { page = 1, limit = 10 } = pagination || {};
      const skip = (page - 1) * limit;

      const analyses = await this.db.analysis.findMany({
        where: { userId },
        include: {
          file: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              fileSize: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const analysisEntities: AnalysisWithFile[] = analyses.map(analysis => ({
        id: analysis.id,
        fileId: analysis.fileId,
        userId: analysis.userId,
        errors: analysis.errors,
        corrections: analysis.corrections,
        report: analysis.report,
        aiTier: analysis.aiTier as string,
        confidence: analysis.confidence,
        creditsUsed: analysis.creditsUsed,
        promptTokens: analysis.promptTokens,
        completionTokens: analysis.completionTokens,
        estimatedCost: analysis.estimatedCost,
        processingPath: analysis.processingPath,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
        file: analysis.file,
      }));

      return Result.success(analysisEntities);
    } catch (error) {
      console.error('Analysis findByUserId error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async findLatestByFileId(fileId: string): Promise<Result<AnalysisEntity | null>> {
    try {
      const analysis = await this.db.analysis.findFirst({
        where: { fileId },
        orderBy: { createdAt: 'desc' },
      });

      if (!analysis) {
        return Result.success(null);
      }

      const analysisEntity: AnalysisEntity = {
        id: analysis.id,
        fileId: analysis.fileId,
        userId: analysis.userId,
        errors: analysis.errors,
        corrections: analysis.corrections,
        report: analysis.report,
        aiTier: analysis.aiTier as string,
        confidence: analysis.confidence,
        creditsUsed: analysis.creditsUsed,
        promptTokens: analysis.promptTokens,
        completionTokens: analysis.completionTokens,
        estimatedCost: analysis.estimatedCost,
        processingPath: analysis.processingPath,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
      };

      return Result.success(analysisEntity);
    } catch (error) {
      console.error('Analysis findLatestByFileId error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async updateConfidence(id: string, confidence: number): Promise<Result<void>> {
    try {
      await this.db.analysis.update({
        where: { id },
        data: { confidence },
      });

      return Result.success(undefined);
    } catch (error) {
      console.error('Analysis updateConfidence error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      await this.db.analysis.delete({
        where: { id },
      });

      return Result.success(undefined);
    } catch (error) {
      console.error('Analysis delete error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async getUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<Result<{
    totalAnalyses: number;
    totalCreditsUsed: number;
    totalCost: number;
    averageConfidence: number;
  }>> {
    try {
      const whereClause: any = { userId };
      
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const analyses = await this.db.analysis.findMany({
        where: whereClause,
        select: {
          creditsUsed: true,
          estimatedCost: true,
          confidence: true,
        },
      });

      const totalAnalyses = analyses.length;
      const totalCreditsUsed = analyses.reduce((sum, a) => sum + a.creditsUsed, 0);
      const totalCost = analyses.reduce((sum, a) => sum + a.estimatedCost, 0);
      const averageConfidence = totalAnalyses > 0 
        ? analyses.reduce((sum, a) => sum + a.confidence, 0) / totalAnalyses 
        : 0;

      return Result.success({
        totalAnalyses,
        totalCreditsUsed,
        totalCost,
        averageConfidence,
      });
    } catch (error) {
      console.error('Analysis getUsageStats error:', error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }
}