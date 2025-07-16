import { AnalysisModule, AnalysisItem, CellLocation } from './index'

export class ErrorDetectionModule implements AnalysisModule {
  name = 'Error Detection'
  type = 'error' as const

  async analyze(workbook: any): Promise<AnalysisItem[]> {
    const errors: AnalysisItem[] = []
    
    // Iterate through all sheets
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      
      // Check each cell
      for (const cellAddress in worksheet) {
        if (cellAddress.startsWith('!')) continue // Skip metadata
        
        const cell = worksheet[cellAddress]
        const location: CellLocation = {
          sheet: sheetName,
          cell: cellAddress
        }
        
        // Check for Excel errors
        if (cell.v && typeof cell.v === 'string') {
          if (cell.v === '#DIV/0!') {
            errors.push({
              id: `err-div0-${sheetName}-${cellAddress}`,
              type: 'error',
              severity: 'high',
              location,
              description: 'Division by zero error',
              details: 'This formula is attempting to divide by zero',
              suggestion: 'Use IFERROR or IF to handle zero divisor',
              autoFixAvailable: true,
              confidence: 1.0
            })
          } else if (cell.v === '#REF!') {
            errors.push({
              id: `err-ref-${sheetName}-${cellAddress}`,
              type: 'error',
              severity: 'high',
              location,
              description: 'Invalid cell reference',
              details: 'Formula references a cell that no longer exists',
              suggestion: 'Update the reference to a valid cell',
              autoFixAvailable: false,
              confidence: 1.0
            })
          } else if (cell.v === '#NAME?') {
            errors.push({
              id: `err-name-${sheetName}-${cellAddress}`,
              type: 'error',
              severity: 'medium',
              location,
              description: 'Unrecognized function or name',
              details: 'Formula contains an unknown function name or reference',
              suggestion: 'Check for typos in function names',
              autoFixAvailable: true,
              confidence: 0.8
            })
          } else if (cell.v === '#VALUE!') {
            errors.push({
              id: `err-value-${sheetName}-${cellAddress}`,
              type: 'error',
              severity: 'medium',
              location,
              description: 'Wrong argument type',
              details: 'Formula has wrong type of argument',
              suggestion: 'Check data types in formula arguments',
              autoFixAvailable: false,
              confidence: 0.9
            })
          } else if (cell.v === '#N/A') {
            errors.push({
              id: `err-na-${sheetName}-${cellAddress}`,
              type: 'warning',
              severity: 'low',
              location,
              description: 'Value not available',
              details: 'VLOOKUP or similar function could not find a match',
              suggestion: 'Use IFERROR to provide a default value',
              autoFixAvailable: true,
              confidence: 0.9
            })
          }
        }
        
        // Check for circular references
        if (cell.f && this.hasCircularReference(cell.f, cellAddress, worksheet)) {
          errors.push({
            id: `err-circular-${sheetName}-${cellAddress}`,
            type: 'error',
            severity: 'critical',
            location,
            description: 'Circular reference detected',
            details: 'This cell is part of a circular reference chain',
            suggestion: 'Remove self-reference from formula',
            autoFixAvailable: false,
            confidence: 1.0
          })
        }
      }
    }
    
    return errors
  }
  
  private hasCircularReference(formula: string, cellAddress: string, worksheet: any): boolean {
    // Simple check - in reality this would need a dependency graph
    return formula.includes(cellAddress)
  }
  
  async fix(workbook: any, item: AnalysisItem) {
    const { sheet, cell } = item.location
    const worksheet = workbook.Sheets[sheet]
    const targetCell = worksheet[cell!]
    
    if (!targetCell || !targetCell.f) {
      return { success: false, message: 'Cell or formula not found' }
    }
    
    switch (item.id.split('-')[1]) {
      case 'div0':
        // Wrap in IFERROR
        targetCell.f = `IFERROR(${targetCell.f},0)`
        targetCell.v = 0 // Update value
        return { success: true, message: 'Wrapped formula in IFERROR' }
        
      case 'name':
        // Try to fix common typos
        let fixedFormula = targetCell.f
        const commonTypos = [
          { wrong: 'VLOKUP', correct: 'VLOOKUP' },
          { wrong: 'SUMIF', correct: 'SUMIFS' },
          { wrong: 'IFERRO', correct: 'IFERROR' }
        ]
        
        for (const typo of commonTypos) {
          if (fixedFormula.includes(typo.wrong)) {
            fixedFormula = fixedFormula.replace(typo.wrong, typo.correct)
            targetCell.f = fixedFormula
            return { success: true, message: `Fixed typo: ${typo.wrong} → ${typo.correct}` }
          }
        }
        return { success: false, message: 'Could not fix function name' }
        
      case 'na':
        // Wrap in IFERROR with empty string
        targetCell.f = `IFERROR(${targetCell.f},"")`
        targetCell.v = '' // Update value
        return { success: true, message: 'Wrapped formula in IFERROR' }
        
      default:
        return { success: false, message: 'Fix not implemented for this error type' }
    }
  }
}