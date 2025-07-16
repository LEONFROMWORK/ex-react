import { Error } from "./Result";

// Business errors for Excel operations
export const ExcelErrors = {
  InvalidFormat: {
    code: "Excel.InvalidFormat",
    message: "지원하지 않는 Excel 형식입니다",
  } as Error,

  EmptyFile: {
    code: "Excel.EmptyFile",
    message: "빈 파일은 처리할 수 없습니다",
  } as Error,

  TooLarge: {
    code: "Excel.TooLarge",
    message: "파일 크기가 제한을 초과했습니다",
  } as Error,

  CorruptedFile: {
    code: "Excel.CorruptedFile",
    message: "손상된 파일입니다",
  } as Error,

  ProcessingFailed: {
    code: "Excel.ProcessingFailed",
    message: "파일 처리 중 오류가 발생했습니다",
  } as Error,

  AnalysisFailed: {
    code: "Excel.AnalysisFailed",
    message: "분석 중 오류가 발생했습니다",
  } as Error,

  NotFound: {
    code: "Excel.NotFound",
    message: "파일을 찾을 수 없습니다",
  } as Error,

  Unauthorized: {
    code: "Excel.Unauthorized",
    message: "권한이 없습니다",
  } as Error,
} as const;

// Authentication errors
export const AuthErrors = {
  InvalidCredentials: {
    code: "Auth.InvalidCredentials",
    message: "잘못된 인증 정보입니다",
  } as Error,

  UserNotFound: {
    code: "Auth.UserNotFound",
    message: "사용자를 찾을 수 없습니다",
  } as Error,

  SessionExpired: {
    code: "Auth.SessionExpired",
    message: "세션이 만료되었습니다",
  } as Error,

  Unauthorized: {
    code: "Auth.Unauthorized",
    message: "인증이 필요합니다",
  } as Error,
} as const;

// Admin errors
export const AdminErrors = {
  UserNotFound: {
    code: "Admin.UserNotFound",
    message: "사용자를 찾을 수 없습니다",
  } as Error,

  InvalidRequest: {
    code: "Admin.InvalidRequest",
    message: "잘못된 요청입니다",
  } as Error,

  QueryFailed: {
    code: "Admin.QueryFailed",
    message: "조회 중 오류가 발생했습니다",
  } as Error,

  UpdateFailed: {
    code: "Admin.UpdateFailed",
    message: "업데이트 중 오류가 발생했습니다",
  } as Error,

  InsufficientPermissions: {
    code: "Admin.InsufficientPermissions",
    message: "권한이 부족합니다",
  } as Error,
} as const;

// AI Model errors
export const AIModelErrors = {
  NoModelsConfigured: {
    code: "AIModel.NoModelsConfigured",
    message: "설정된 AI 모델이 없습니다",
  } as Error,

  ModelNotFound: {
    code: "AIModel.ModelNotFound",
    message: "요청한 AI 모델을 찾을 수 없습니다",
  } as Error,

  InvalidConfiguration: {
    code: "AIModel.InvalidConfiguration",
    message: "AI 모델 설정이 올바르지 않습니다",
  } as Error,

  ApiKeyMissing: {
    code: "AIModel.ApiKeyMissing",
    message: "API 키가 누락되었습니다",
  } as Error,

  AllModelsFailed: {
    code: "AIModel.AllModelsFailed",
    message: "모든 AI 모델 호출이 실패했습니다",
  } as Error,

  RateLimitExceeded: {
    code: "AIModel.RateLimitExceeded",
    message: "API 호출 한도를 초과했습니다",
  } as Error,

  InvalidResponse: {
    code: "AIModel.InvalidResponse",
    message: "AI 모델로부터 잘못된 응답을 받았습니다",
  } as Error,

  ProviderError: {
    code: "AIModel.ProviderError",
    message: "AI 제공자 오류가 발생했습니다",
  } as Error,

  ValidationFailed: {
    code: "AIModel.ValidationFailed",
    message: "AI 모델 검증에 실패했습니다",
  } as Error,
} as const;