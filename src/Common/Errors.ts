export interface AppError {
  code: string;
  message: string;
  details?: any;
}

export const ExcelErrors = {
  EmptyFile: {
    code: 'EMPTY_FILE',
    message: '파일이 비어 있습니다.'
  },
  InvalidFormat: {
    code: 'INVALID_FORMAT',
    message: '유효하지 않은 파일 형식입니다.'
  },
  TooLarge: {
    code: 'FILE_TOO_LARGE',
    message: '파일 크기가 너무 큽니다.'
  },
  ProcessingFailed: {
    code: 'PROCESSING_FAILED',
    message: '파일 처리 중 오류가 발생했습니다.'
  },
  NotFound: {
    code: 'FILE_NOT_FOUND',
    message: '파일을 찾을 수 없습니다.'
  },
  Unauthorized: {
    code: 'UNAUTHORIZED',
    message: '권한이 없습니다.'
  }
};