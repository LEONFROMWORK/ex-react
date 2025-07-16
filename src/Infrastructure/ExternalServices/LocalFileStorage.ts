import { IFileStorage as IFileStorageFromUpload } from "@/Features/ExcelUpload/UploadExcel";
import { IFileStorage } from "@/Infrastructure/DependencyInjection/Container";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export class LocalFileStorage implements IFileStorage, IFileStorageFromUpload {
  private uploadDir = join(process.cwd(), "uploads");

  // IFileStorage implementation (from Container)
  async save(file: Buffer, key: string): Promise<string> {
    await this.ensureDirectoryExists();
    
    // Create subdirectories if key contains path separators
    const keyParts = key.split('/');
    if (keyParts.length > 1) {
      const subDir = join(this.uploadDir, ...keyParts.slice(0, -1));
      await mkdir(subDir, { recursive: true });
    }
    
    const filePath = join(this.uploadDir, key);
    await writeFile(filePath, file);
    return `/api/uploads/${key}`;
  }

  async get(key: string): Promise<Buffer> {
    const filePath = join(this.uploadDir, key);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return await readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.uploadDir, key);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  // IFileStorageFromUpload implementation
  async uploadAsync(
    file: File,
    fileName: string
  ): Promise<Result<string>> {
    try {
      // Ensure upload directory exists
      await this.ensureDirectoryExists();

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Write file
      const filePath = join(this.uploadDir, fileName);
      await writeFile(filePath, buffer);

      // Return relative URL
      return Result.success(`/uploads/${fileName}`);
    } catch (error) {
      console.error("File storage error:", error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async downloadAsync(fileName: string): Promise<Result<Buffer>> {
    try {
      const filePath = join(this.uploadDir, fileName);
      
      if (!existsSync(filePath)) {
        return Result.failure(ExcelErrors.NotFound);
      }

      const buffer = await readFile(filePath);
      return Result.success(buffer);
    } catch (error) {
      console.error("File download error:", error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  async deleteAsync(fileName: string): Promise<Result<void>> {
    try {
      const filePath = join(this.uploadDir, fileName);
      
      if (!existsSync(filePath)) {
        return Result.failure(ExcelErrors.NotFound);
      }

      await unlink(filePath);
      return Result.success(undefined);
    } catch (error) {
      console.error("File deletion error:", error);
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }
}

// Future implementation for cloud storage
export class AzureBlobStorage implements IFileStorage {
  constructor(private connectionString: string, private containerName: string) {}

  async uploadAsync(
    file: File,
    fileName: string
  ): Promise<Result<string>> {
    // Azure Blob Storage implementation
    // This would use @azure/storage-blob
    throw new Error("Azure Blob Storage not implemented yet");
  }
}

// Future implementation for AWS S3
export class S3Storage implements IFileStorage {
  constructor(private bucketName: string, private region: string) {}

  async uploadAsync(
    file: File,
    fileName: string
  ): Promise<Result<string>> {
    // AWS S3 implementation
    // This would use @aws-sdk/client-s3
    throw new Error("S3 Storage not implemented yet");
  }
}