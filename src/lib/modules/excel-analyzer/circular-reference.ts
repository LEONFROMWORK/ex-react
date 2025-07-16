export interface CircularReferenceCheck {
  hasCircularReference: boolean
  circularReferences: Array<{
    cell: string
    chain: string[]
  }>
}

export function checkCircularReferences(formulaCells: any[]): CircularReferenceCheck {
  // 간단한 순환 참조 체크 구현
  const circularReferences: Array<{ cell: string; chain: string[] }> = []
  
  // TODO: 실제 순환 참조 체크 로직 구현
  
  return {
    hasCircularReference: circularReferences.length > 0,
    circularReferences
  }
}