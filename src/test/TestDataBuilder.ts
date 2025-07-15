import { ExcelError, ErrorType } from "@/types/excel"

export class TestDataBuilder {
  static createMockFile(overrides: any = {}) {
    return {
      id: "file123",
      fileName: "test.xlsx",
      originalName: "Test Spreadsheet.xlsx",
      fileSize: 1024 * 1024, // 1MB
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      status: "PENDING",
      userId: "user123",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }
  }

  static createMockErrors(count: number): ExcelError[] {
    const errors: ExcelError[] = []
    const errorTypes = [ErrorType.FORMULA_ERROR, ErrorType.DATA_ERROR, ErrorType.FORMAT_ERROR]
    
    for (let i = 0; i < count; i++) {
      errors.push({
        type: errorTypes[i % 3],
        location: `Sheet1!A${i + 1}`,
        description: `Test error ${i + 1}`,
        value: `Error value ${i + 1}`,
        suggestion: `Fix suggestion ${i + 1}`,
        severity: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
      })
    }
    
    return errors
  }

  static createMockCorrections(count: number): any[] {
    const corrections = []
    
    for (let i = 0; i < count; i++) {
      corrections.push({
        location: `Sheet1!A${i + 1}`,
        originalValue: `Error value ${i + 1}`,
        correctedValue: `Corrected value ${i + 1}`,
        applied: true,
        confidence: 0.8 + (Math.random() * 0.2),
      })
    }
    
    return corrections
  }

  static createMockUser(overrides: any = {}) {
    return {
      id: "user123",
      email: "test@example.com",
      name: "Test User",
      role: "USER",
      tokens: 100,
      referralCode: "TEST123",
      emailVerified: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }
  }

  static createMockAnalysis(overrides: any = {}) {
    return {
      id: "analysis123",
      fileId: "file123",
      userId: "user123",
      errors: this.createMockErrors(5),
      corrections: this.createMockCorrections(3),
      report: {
        totalErrors: 5,
        correctedErrors: 3,
        summary: "Analysis complete",
        confidence: 0.85,
      },
      aiTier: "TIER1",
      confidence: 0.85,
      tokensUsed: 500,
      promptTokens: 300,
      completionTokens: 200,
      estimatedCost: 0.0025,
      processingPath: {
        ruleBasedCheck: true,
        tier1Analysis: true,
        tier2Analysis: false,
      },
      createdAt: new Date(),
      ...overrides,
    }
  }

  static createValidExcelFile(): Buffer {
    // Create a minimal valid Excel file structure
    // In real tests, you might use ExcelJS to create actual files
    return Buffer.from("Mock Excel File Content")
  }

  static createInvalidExcelFile(): Buffer {
    return Buffer.from("Invalid File Content")
  }
}