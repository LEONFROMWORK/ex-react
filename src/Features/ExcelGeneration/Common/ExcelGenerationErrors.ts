import { Result } from '@/Common/Result'

// Excel Generation 도메인 전용 에러 정의
export const ExcelGenerationErrors = {
  InvalidPrompt: {
    code: 'EXCEL_GEN.INVALID_PROMPT',
    message: '유효하지 않은 프롬프트입니다. Excel 생성에 필요한 정보를 포함해주세요.',
  },
  
  TemplateNotFound: {
    code: 'EXCEL_GEN.TEMPLATE_NOT_FOUND',
    message: '요청한 템플릿을 찾을 수 없습니다.',
  },
  
  GenerationFailed: {
    code: 'EXCEL_GEN.GENERATION_FAILED',
    message: 'Excel 파일 생성에 실패했습니다.',
  },
  
  AIResponseError: {
    code: 'EXCEL_GEN.AI_RESPONSE_ERROR',
    message: 'AI 응답을 처리하는 중 오류가 발생했습니다.',
  },
  
  InvalidStructure: {
    code: 'EXCEL_GEN.INVALID_STRUCTURE',
    message: '생성하려는 Excel 구조가 유효하지 않습니다.',
  },
  
  FileSizeExceeded: {
    code: 'EXCEL_GEN.FILE_SIZE_EXCEEDED',
    message: '생성된 파일 크기가 제한을 초과했습니다.',
  },
  
  ComplexityExceeded: {
    code: 'EXCEL_GEN.COMPLEXITY_EXCEEDED',
    message: '요청한 Excel 파일이 너무 복잡합니다. 더 단순한 구조로 시도해주세요.',
  },
  
  TemplateProcessingError: {
    code: 'EXCEL_GEN.TEMPLATE_PROCESSING_ERROR',
    message: '템플릿 처리 중 오류가 발생했습니다.',
  },
} as const

export type ExcelGenerationError = typeof ExcelGenerationErrors[keyof typeof ExcelGenerationErrors]