import { z } from 'zod'

// 파일 검증 상수
export const FILE_CONSTRAINTS = {
  // 최대 파일 크기 (50MB)
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  
  // 허용된 MIME 타입
  ALLOWED_MIME_TYPES: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    'application/vnd.ms-excel.sheet.binary.macroEnabled.12'
  ] as const,
  
  // 허용된 확장자
  ALLOWED_EXTENSIONS: ['.xls', '.xlsx', '.xlsm', '.xlsb'] as const,
  
  // Magic numbers (파일 시그니처)
  FILE_SIGNATURES: {
    // XLS (BIFF5/BIFF8)
    XLS: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1],
    // XLSX/XLSM/XLSB (ZIP format)
    XLSX: [0x50, 0x4B, 0x03, 0x04],
    XLSX_EMPTY: [0x50, 0x4B, 0x05, 0x06]
  }
} as const

// 파일 검증 스키마
export const fileValidationSchema = z.object({
  name: z.string().min(1, '파일명은 필수입니다'),
  size: z.number()
    .positive('파일 크기는 0보다 커야 합니다')
    .max(FILE_CONSTRAINTS.MAX_FILE_SIZE, '파일 크기는 50MB를 초과할 수 없습니다'),
  type: z.enum(FILE_CONSTRAINTS.ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: '허용되지 않은 파일 형식입니다' })
  })
})

// 파일 확장자 검증
export function validateFileExtension(filename: string): boolean {
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return FILE_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(extension as any)
}

// Magic number 검증 (파일 시그니처)
export async function validateFileMagicNumber(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve(false)
        return
      }
      
      const arr = new Uint8Array(e.target.result as ArrayBuffer)
      
      // XLS 체크
      if (arr.length >= 8) {
        const isXLS = FILE_CONSTRAINTS.FILE_SIGNATURES.XLS.every(
          (byte, index) => arr[index] === byte
        )
        if (isXLS) {
          resolve(true)
          return
        }
      }
      
      // XLSX/XLSM/XLSB 체크 (ZIP format)
      if (arr.length >= 4) {
        const isXLSX = FILE_CONSTRAINTS.FILE_SIGNATURES.XLSX.every(
          (byte, index) => arr[index] === byte
        )
        const isXLSXEmpty = FILE_CONSTRAINTS.FILE_SIGNATURES.XLSX_EMPTY.every(
          (byte, index) => arr[index] === byte
        )
        
        if (isXLSX || isXLSXEmpty) {
          resolve(true)
          return
        }
      }
      
      resolve(false)
    }
    
    // 처음 8바이트만 읽기
    reader.readAsArrayBuffer(file.slice(0, 8))
  })
}

// 종합 파일 검증
export interface FileValidationResult {
  valid: boolean
  errors: string[]
}

export async function validateExcelFile(file: File): Promise<FileValidationResult> {
  const errors: string[] = []
  
  try {
    // 1. 기본 속성 검증
    fileValidationSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => e.message))
    }
  }
  
  // 2. 확장자 검증
  if (!validateFileExtension(file.name)) {
    errors.push('파일 확장자가 올바르지 않습니다. (.xls, .xlsx, .xlsm, .xlsb만 허용)')
  }
  
  // 3. Magic number 검증
  const hasMagicNumber = await validateFileMagicNumber(file)
  if (!hasMagicNumber) {
    errors.push('유효한 Excel 파일이 아닙니다.')
  }
  
  // 4. 파일명 특수문자 검증
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g
  if (invalidChars.test(file.name)) {
    errors.push('파일명에 허용되지 않은 문자가 포함되어 있습니다.')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// 업로드 전 파일 체크 유틸리티
export function getFileValidationError(file: File): string | null {
  // 크기 체크
  if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
    return `파일 크기는 ${FILE_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다.`
  }
  
  // 타입 체크
  if (!FILE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    return '지원되지 않는 파일 형식입니다. Excel 파일만 업로드 가능합니다.'
  }
  
  // 확장자 체크
  if (!validateFileExtension(file.name)) {
    return '파일 확장자가 올바르지 않습니다. (.xls, .xlsx, .xlsm, .xlsb만 허용)'
  }
  
  return null
}