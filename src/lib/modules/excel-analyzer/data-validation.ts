export interface DataValidationIssue {
  cell: string
  rule: string
  value: any
  message: string
}

export function checkDataValidation(worksheet: any): DataValidationIssue[] {
  const issues: DataValidationIssue[] = []
  
  // TODO: 실제 데이터 유효성 검사 로직 구현
  
  return issues
}