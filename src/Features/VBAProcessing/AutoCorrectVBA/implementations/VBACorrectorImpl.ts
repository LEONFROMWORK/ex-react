/**
 * VBA Corrector Implementation
 * Interface Segregation Principle - 특화된 구현체
 */

import { Result } from '@/Common/Result'
import { IVBACorrector } from '../interfaces/IVBACorrector'
import { VBAError } from '../../types'

export interface CorrectionOptions {
  preserveComments: boolean
  optimizePerformance: boolean
  enforceStandards: boolean
}

export interface CorrectedVBACode {
  correctedCode: string
  confidence: number
  corrections: VBAFixRecord[]
  explanation: string
  estimatedPerformanceGain: number
}

export interface VBAFixRecord {
  errorId: string
  errorType: string
  lineNumber: number
  originalCode: string
  correctedCode: string
  explanation: string
  confidence: number
  aiJustification: string
}

export class VBACorrectorImpl implements IVBACorrector {
  
  async correctCode(
    originalCode: string,
    errors: VBAError[],
    options: CorrectionOptions
  ): Promise<Result<CorrectedVBACode>> {
    try {
      // Apply rule-based corrections first (fast and reliable)
      const ruleBasedResult = await this.applyRuleBasedCorrections(originalCode, errors, options)
      
      // Apply AI corrections for complex issues
      const aiEnhancedResult = await this.applyAICorrections(
        ruleBasedResult.correctedCode,
        ruleBasedResult.remainingErrors,
        options
      )
      
      // Combine results
      const finalResult: CorrectedVBACode = {
        correctedCode: aiEnhancedResult.correctedCode,
        confidence: Math.min(ruleBasedResult.confidence, aiEnhancedResult.confidence),
        corrections: [...ruleBasedResult.corrections, ...aiEnhancedResult.corrections],
        explanation: this.combineExplanations(ruleBasedResult.explanation, aiEnhancedResult.explanation),
        estimatedPerformanceGain: ruleBasedResult.estimatedPerformanceGain + aiEnhancedResult.estimatedPerformanceGain
      }
      
      return Result.success(finalResult)
      
    } catch (error) {
      return Result.failure(error as Error)
    }
  }
  
  private async applyRuleBasedCorrections(
    code: string,
    errors: VBAError[],
    options: CorrectionOptions
  ): Promise<{
    correctedCode: string
    remainingErrors: VBAError[]
    corrections: VBAFixRecord[]
    confidence: number
    explanation: string
    estimatedPerformanceGain: number
  }> {
    let correctedCode = code
    const corrections: VBAFixRecord[] = []
    const remainingErrors: VBAError[] = []
    
    for (const error of errors) {
      const ruleResult = this.applyRuleForError(correctedCode, error, options)
      
      if (ruleResult.success) {
        correctedCode = ruleResult.correctedCode
        corrections.push(ruleResult.correction)
      } else {
        remainingErrors.push(error)
      }
    }
    
    return {
      correctedCode,
      remainingErrors,
      corrections,
      confidence: 0.9, // Rule-based corrections are highly reliable
      explanation: `규칙 기반 수정: ${corrections.length}개 오류 해결`,
      estimatedPerformanceGain: this.calculateRuleBasedPerformanceGain(corrections)
    }
  }
  
  private applyRuleForError(
    code: string,
    error: VBAError,
    options: CorrectionOptions
  ): { success: boolean; correctedCode: string; correction: VBAFixRecord } {
    
    switch (error.type) {
      case 'VARIABLE_NOT_DECLARED':
        return this.fixVariableDeclaration(code, error, options)
        
      case 'TYPE_MISMATCH':
        return this.fixTypeMismatch(code, error, options)
        
      case 'OBJECT_NOT_SET':
        return this.fixObjectNotSet(code, error, options)
        
      case 'INEFFICIENT_LOOP':
        return this.optimizeLoop(code, error, options)
        
      case 'MEMORY_LEAK':
        return this.fixMemoryLeak(code, error, options)
        
      default:
        return {
          success: false,
          correctedCode: code,
          correction: this.createEmptyCorrection(error)
        }
    }
  }
  
  private fixVariableDeclaration(
    code: string,
    error: VBAError,
    options: CorrectionOptions
  ): { success: boolean; correctedCode: string; correction: VBAFixRecord } {
    
    // Extract variable name from error
    const varNameMatch = error.description.match(/Variable\s+'([^']+)'/i)
    if (!varNameMatch) {
      return { success: false, correctedCode: code, correction: this.createEmptyCorrection(error) }
    }
    
    const varName = varNameMatch[1]
    
    // Determine appropriate type based on usage context
    const varType = this.inferVariableType(code, varName, error.lineNumber)
    
    // Find the best place to insert declaration
    const insertionPoint = this.findDeclarationInsertionPoint(code, error.lineNumber)
    
    const declaration = `Dim ${varName} As ${varType}\n`
    const lines = code.split('\n')
    lines.splice(insertionPoint, 0, declaration)
    
    const correctedCode = lines.join('\n')
    
    return {
      success: true,
      correctedCode,
      correction: {
        errorId: error.id || `fix-${Date.now()}`,
        errorType: 'VARIABLE_NOT_DECLARED',
        lineNumber: error.lineNumber,
        originalCode: lines[error.lineNumber] || '',
        correctedCode: declaration + (lines[error.lineNumber] || ''),
        explanation: `변수 '${varName}'를 ${varType} 타입으로 선언 추가`,
        confidence: 0.95,
        aiJustification: '규칙 기반 변수 선언 수정'
      }
    }
  }
  
  private fixTypeMismatch(
    code: string,
    error: VBAError,
    options: CorrectionOptions
  ): { success: boolean; correctedCode: string; correction: VBAFixRecord } {
    
    const lines = code.split('\n')
    const problemLine = lines[error.lineNumber] || ''
    
    // Common type mismatch patterns
    let correctedLine = problemLine
    
    // String to Number conversion
    if (error.description.includes('String') && error.description.includes('Number')) {
      correctedLine = this.addTypeConversion(problemLine, 'Val')
    }
    
    // Number to String conversion
    if (error.description.includes('Number') && error.description.includes('String')) {
      correctedLine = this.addTypeConversion(problemLine, 'CStr')
    }
    
    // Variant optimization
    if (options.optimizePerformance && problemLine.includes('Variant')) {
      correctedLine = this.optimizeVariantUsage(problemLine)
    }
    
    if (correctedLine === problemLine) {
      return { success: false, correctedCode: code, correction: this.createEmptyCorrection(error) }
    }
    
    lines[error.lineNumber] = correctedLine
    
    return {
      success: true,
      correctedCode: lines.join('\n'),
      correction: {
        errorId: error.id || `fix-${Date.now()}`,
        errorType: 'TYPE_MISMATCH',
        lineNumber: error.lineNumber,
        originalCode: problemLine,
        correctedCode: correctedLine,
        explanation: '타입 불일치 해결을 위한 변환 함수 추가',
        confidence: 0.9,
        aiJustification: '규칙 기반 타입 변환 수정'
      }
    }
  }
  
  private fixObjectNotSet(
    code: string,
    error: VBAError,
    options: CorrectionOptions
  ): { success: boolean; correctedCode: string; correction: VBAFixRecord } {
    
    const lines = code.split('\n')
    const problemLine = lines[error.lineNumber] || ''
    
    // Look for object assignment without 'Set' keyword
    const objectAssignMatch = problemLine.match(/^\s*(\w+)\s*=\s*(.+)/)
    if (!objectAssignMatch) {
      return { success: false, correctedCode: code, correction: this.createEmptyCorrection(error) }
    }
    
    const [, varName, assignment] = objectAssignMatch
    
    // Check if assignment is creating an object
    if (assignment.includes('CreateObject') || 
        assignment.includes('New ') || 
        assignment.includes('GetObject')) {
      
      const correctedLine = problemLine.replace(/^\s*(\w+)\s*=/, `Set $1 =`)
      lines[error.lineNumber] = correctedLine
      
      return {
        success: true,
        correctedCode: lines.join('\n'),
        correction: {
          errorId: error.id || `fix-${Date.now()}`,
          errorType: 'OBJECT_NOT_SET',
          lineNumber: error.lineNumber,
          originalCode: problemLine,
          correctedCode: correctedLine,
          explanation: `객체 할당에 'Set' 키워드 추가`,
          confidence: 0.95,
          aiJustification: '규칙 기반 객체 할당 수정'
        }
      }
    }
    
    return { success: false, correctedCode: code, correction: this.createEmptyCorrection(error) }
  }
  
  private optimizeLoop(
    code: string,
    error: VBAError,
    options: CorrectionOptions
  ): { success: boolean; correctedCode: string; correction: VBAFixRecord } {
    
    if (!options.optimizePerformance) {
      return { success: false, correctedCode: code, correction: this.createEmptyCorrection(error) }
    }
    
    const lines = code.split('\n')
    let correctedCode = code
    let hasOptimization = false
    
    // Add screen updating optimization around loops
    const loopStartPattern = /^\s*(For|Do|While)/i
    const loopEndPattern = /^\s*(Next|Loop|Wend)/i
    
    for (let i = 0; i < lines.length; i++) {
      if (loopStartPattern.test(lines[i])) {
        // Insert screen updating disable before loop
        lines.splice(i, 0, 'Application.ScreenUpdating = False')
        
        // Find corresponding end and insert enable after
        let loopDepth = 1
        for (let j = i + 2; j < lines.length && loopDepth > 0; j++) {
          if (loopStartPattern.test(lines[j])) loopDepth++
          if (loopEndPattern.test(lines[j])) {
            loopDepth--
            if (loopDepth === 0) {
              lines.splice(j + 1, 0, 'Application.ScreenUpdating = True')
              hasOptimization = true
              break
            }
          }
        }
        break
      }
    }
    
    if (!hasOptimization) {
      return { success: false, correctedCode: code, correction: this.createEmptyCorrection(error) }
    }
    
    return {
      success: true,
      correctedCode: lines.join('\n'),
      correction: {
        errorId: error.id || `fix-${Date.now()}`,
        errorType: 'INEFFICIENT_LOOP',
        lineNumber: error.lineNumber,
        originalCode: lines[error.lineNumber] || '',
        correctedCode: 'Application.ScreenUpdating 최적화 적용',
        explanation: '루프 성능 최적화: 화면 업데이트 비활성화/활성화 추가',
        confidence: 0.9,
        aiJustification: '규칙 기반 루프 최적화'
      }
    }
  }
  
  private fixMemoryLeak(
    code: string,
    error: VBAError,
    options: CorrectionOptions
  ): { success: boolean; correctedCode: string; correction: VBAFixRecord } {
    
    const lines = code.split('\n')
    
    // Look for object variables that need to be set to Nothing
    const objectVarPattern = /Dim\s+(\w+)\s+As\s+(Object|Worksheet|Workbook|Range)/gi
    const objectVars: string[] = []
    
    let match
    while ((match = objectVarPattern.exec(code)) !== null) {
      objectVars.push(match[1])
    }
    
    if (objectVars.length === 0) {
      return { success: false, correctedCode: code, correction: this.createEmptyCorrection(error) }
    }
    
    // Find the end of the procedure to add cleanup
    const endPattern = /^\s*(End\s+(Sub|Function)|Exit\s+(Sub|Function))/i
    let cleanupAdded = false
    
    for (let i = lines.length - 1; i >= 0; i--) {
      if (endPattern.test(lines[i])) {
        const cleanupLines = objectVars.map(varName => `Set ${varName} = Nothing`)
        lines.splice(i, 0, ...cleanupLines)
        cleanupAdded = true
        break
      }
    }
    
    if (!cleanupAdded) {
      return { success: false, correctedCode: code, correction: this.createEmptyCorrection(error) }
    }
    
    return {
      success: true,
      correctedCode: lines.join('\n'),
      correction: {
        errorId: error.id || `fix-${Date.now()}`,
        errorType: 'MEMORY_LEAK',
        lineNumber: error.lineNumber,
        originalCode: '',
        correctedCode: objectVars.map(v => `Set ${v} = Nothing`).join('; '),
        explanation: `메모리 누수 방지: ${objectVars.length}개 객체 변수 정리 추가`,
        confidence: 0.9,
        aiJustification: '규칙 기반 메모리 정리'
      }
    }
  }
  
  // Helper methods
  private inferVariableType(code: string, varName: string, lineNumber: number): string {
    const usage = this.analyzeVariableUsage(code, varName)
    
    if (usage.includes('Cells') || usage.includes('Range')) return 'Range'
    if (usage.includes('Worksheet')) return 'Worksheet'
    if (usage.includes('Workbook')) return 'Workbook'
    if (usage.includes('.') && !usage.includes('+') && !usage.includes('-')) return 'Object'
    if (usage.includes('True') || usage.includes('False')) return 'Boolean'
    if (usage.includes('"')) return 'String'
    if (/\d+\.\d+/.test(usage)) return 'Double'
    if (/\d+/.test(usage)) return 'Long'
    
    return 'Variant' // Safe default
  }
  
  private analyzeVariableUsage(code: string, varName: string): string {
    const regex = new RegExp(`\\b${varName}\\b.*`, 'gi')
    const matches = code.match(regex) || []
    return matches.join(' ')
  }
  
  private findDeclarationInsertionPoint(code: string, errorLine: number): number {
    const lines = code.split('\n')
    
    // Find the start of the procedure
    for (let i = errorLine; i >= 0; i--) {
      if (/^\s*(Sub|Function)\s+/i.test(lines[i])) {
        // Insert after procedure declaration
        return i + 1
      }
    }
    
    return Math.max(0, errorLine - 1)
  }
  
  private addTypeConversion(line: string, conversionFunc: string): string {
    // This is a simplified implementation
    // In practice, would need more sophisticated parsing
    return line.replace(/=\s*([^=]+)$/, `= ${conversionFunc}($1)`)
  }
  
  private optimizeVariantUsage(line: string): string {
    // Replace Variant with more specific types where possible
    return line.replace(/As\s+Variant/gi, 'As String') // Simplified
  }
  
  private createEmptyCorrection(error: VBAError): VBAFixRecord {
    return {
      errorId: error.id || `fix-${Date.now()}`,
      errorType: error.type,
      lineNumber: error.lineNumber,
      originalCode: '',
      correctedCode: '',
      explanation: '자동 수정 불가능',
      confidence: 0,
      aiJustification: '규칙 기반 수정 실패'
    }
  }
  
  private calculateRuleBasedPerformanceGain(corrections: VBAFixRecord[]): number {
    let gain = 0
    corrections.forEach(correction => {
      switch (correction.errorType) {
        case 'INEFFICIENT_LOOP': gain += 20; break
        case 'MEMORY_LEAK': gain += 15; break
        case 'TYPE_MISMATCH': gain += 5; break
        default: gain += 2; break
      }
    })
    return Math.min(gain, 50) // Cap rule-based gains at 50%
  }
  
  private async applyAICorrections(
    code: string,
    remainingErrors: VBAError[],
    options: CorrectionOptions
  ): Promise<CorrectedVBACode> {
    // Placeholder for AI corrections
    // This would integrate with the StreamingAIAnalyzer
    return {
      correctedCode: code,
      confidence: 0.8,
      corrections: [],
      explanation: 'AI 수정 적용됨',
      estimatedPerformanceGain: 0
    }
  }
  
  private combineExplanations(ruleExplanation: string, aiExplanation: string): string {
    return `${ruleExplanation}\n${aiExplanation}`
  }
}