export interface DataCleaningIssue {
  cell: string
  issue: string
  suggestion: string
}

export function analyzeDataCleaning(worksheet: any): DataCleaningIssue[] {
  const issues: DataCleaningIssue[] = []
  
  // TODO: 실제 데이터 정리 분석 로직 구현
  
  return issues
}