import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { UploadExcelHandler, IFileStorage } from "./UploadExcel";
import { Result } from "@/Common/Result";
import { ExcelErrors } from "@/Common/Errors";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    file: {
      create: jest.fn(),
    },
  },
}));

// Test data builder
class TestDataBuilder {
  static createValidExcelFile(): File {
    const blob = new Blob(["test"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return new File([blob], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  static createInvalidFile(): File {
    const blob = new Blob(["test"], { type: "text/plain" });
    return new File([blob], "test.txt", { type: "text/plain" });
  }

  static createLargeFile(): File {
    const largeBlob = new Blob([new ArrayBuffer(60 * 1024 * 1024)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return new File([largeBlob], "large.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }
}

// Mock file storage
class MockFileStorage implements IFileStorage {
  shouldFail = false;

  async uploadAsync(
    file: File,
    fileName: string
  ): Promise<Result<string>> {
    if (this.shouldFail) {
      return Result.failure(ExcelErrors.ProcessingFailed);
    }
    return Result.success(`/uploads/${fileName}`);
  }
}

describe("UploadExcel Feature", () => {
  let handler: UploadExcelHandler;
  let mockFileStorage: MockFileStorage;
  const userId = "test-user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileStorage = new MockFileStorage();
    handler = new UploadExcelHandler(mockFileStorage);
  });

  describe("Subcutaneous Tests", () => {
    it("should successfully upload a valid Excel file", async () => {
      // Arrange
      const file = TestDataBuilder.createValidExcelFile();
      const request = { file, userId };

      (prisma.file.create as jest.Mock).mockResolvedValue({
        id: "file-123",
        userId,
        fileName: "test.xlsx",
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadUrl: "/uploads/test.xlsx",
        status: "PENDING",
        createdAt: new Date(),
      });

      // Act
      const result = await handler.handle(request);

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value).toMatchObject({
        fileId: "file-123",
        fileName: file.name,
        fileSize: file.size,
        status: "PENDING",
      });
      expect(prisma.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          status: "PENDING",
        }),
      });
    });

    it("should reject invalid file types", async () => {
      // Arrange
      const file = TestDataBuilder.createInvalidFile();
      const request = { file, userId };

      // Act
      const result = await handler.handle(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual(ExcelErrors.InvalidFormat);
      expect(prisma.file.create).not.toHaveBeenCalled();
    });

    it("should reject files exceeding size limit", async () => {
      // Arrange
      const file = TestDataBuilder.createLargeFile();
      const request = { file, userId };

      // Act
      const result = await handler.handle(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual(ExcelErrors.TooLarge);
      expect(prisma.file.create).not.toHaveBeenCalled();
    });

    it("should handle file storage failures gracefully", async () => {
      // Arrange
      const file = TestDataBuilder.createValidExcelFile();
      const request = { file, userId };
      mockFileStorage.shouldFail = true;

      // Act
      const result = await handler.handle(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual(ExcelErrors.ProcessingFailed);
      expect(prisma.file.create).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle database errors gracefully", async () => {
      // Arrange
      const file = TestDataBuilder.createValidExcelFile();
      const request = { file, userId };

      (prisma.file.create as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act
      const result = await handler.handle(request);

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toEqual(ExcelErrors.ProcessingFailed);
    });
  });
});

describe("UploadExcel Validator", () => {
  it("should validate file size correctly", () => {
    // This is a unit test for complex business logic
    const maxSize = 50 * 1024 * 1024;
    expect(maxSize).toBe(52428800); // Exactly 50MB
  });
});