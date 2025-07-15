import { container } from "@/Infrastructure/DependencyInjection/Container"

// Excel Upload
import { UploadExcelHandler } from "@/Features/ExcelUpload/UploadExcel"

// Excel Analysis
import { AnalyzeErrorsHandler } from "@/Features/ExcelAnalysis/AnalyzeErrors/AnalyzeErrors"
import { CheckAnalysisStatusHandler } from "@/Features/ExcelAnalysis/CheckAnalysisStatus/CheckAnalysisStatus"
import { GenerateErrorReportHandler } from "@/Features/ExcelAnalysis/GenerateReport/GenerateErrorReport"

// Excel Correction
import { ApplyCorrectionsHandler } from "@/Features/ExcelCorrection/ApplyCorrections"

// Excel Download
import { DownloadCorrectedFileHandler } from "@/Features/ExcelDownload/DownloadCorrectedFile"

// User Profile
import { GetUserProfileHandler } from "@/Features/UserProfile/GetUserProfile"
import { UpdateUserProfileHandler } from "@/Features/UserProfile/UpdateUserProfile"

// AI Chat
import { SendChatMessageHandler } from "@/Features/AIChat/SendChatMessage"

// Authentication
import { LoginHandler } from "@/Features/Authentication/Login"
import { SignupHandler } from "@/Features/Authentication/Signup"

/**
 * Factory class for creating handlers with proper dependencies
 */
export class HandlerFactory {
  // Excel Upload
  static createUploadExcelHandler(): UploadExcelHandler {
    return new UploadExcelHandler(
      container.getFileStorage()
    )
  }

  // Excel Analysis
  static createAnalyzeErrorsHandler(): AnalyzeErrorsHandler {
    return new AnalyzeErrorsHandler(
      container.getExcelAnalyzer()
    )
  }

  static createCheckAnalysisStatusHandler(): CheckAnalysisStatusHandler {
    return new CheckAnalysisStatusHandler()
  }

  static createGenerateErrorReportHandler(): GenerateErrorReportHandler {
    return new GenerateErrorReportHandler()
  }

  // Excel Correction
  static createApplyCorrectionsHandler(): ApplyCorrectionsHandler {
    return new ApplyCorrectionsHandler(
      container.getExcelAnalyzer()
    )
  }

  // Excel Download
  static createDownloadCorrectedFileHandler(): DownloadCorrectedFileHandler {
    return new DownloadCorrectedFileHandler(
      container.getExcelAnalyzer()
    )
  }

  // User Profile
  static createGetUserProfileHandler(): GetUserProfileHandler {
    return new GetUserProfileHandler()
  }

  static createUpdateUserProfileHandler(): UpdateUserProfileHandler {
    return new UpdateUserProfileHandler()
  }

  // AI Chat
  static createSendChatMessageHandler(): SendChatMessageHandler {
    return new SendChatMessageHandler()
  }

  // Authentication
  static createLoginHandler(): LoginHandler {
    return new LoginHandler()
  }

  static createSignupHandler(): SignupHandler {
    return new SignupHandler(
      container.getNotificationService()
    )
  }
}

// Export singleton instance for convenience
export const handlerFactory = HandlerFactory