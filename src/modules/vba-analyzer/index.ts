import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import os from 'os'
import { VBAAnalysisResult, VBASecurityRisk, VBAPerformanceIssue } from './types'

export class VBAAnalyzer {
  private pythonScriptPath: string
  private tempDir: string
  
  constructor() {
    this.pythonScriptPath = path.join(__dirname, 'vba_analyzer.py')
    this.tempDir = os.tmpdir()
  }
  
  async analyzeVBAFile(fileBuffer: Buffer): Promise<VBAAnalysisResult> {
    const tempFile = await this.saveTempFile(fileBuffer)
    
    try {
      // Python 스크립트 실행
      const result = await this.runPythonScript(tempFile)
      
      // 결과 파싱
      const analysis = JSON.parse(result) as VBAAnalysisResult
      
      // AI 분석 추가 (옵션)
      if (!analysis.error && analysis.modules.length > 0) {
        analysis.aiInsights = await this.generateAIInsights(analysis)
      }
      
      return analysis
    } catch (error) {
      console.error('VBA analysis error:', error)
      return {
        modules: [],
        securityRisks: [],
        performanceIssues: [],
        codeQuality: [],
        summary: {
          totalModules: 0,
          totalLines: 0,
          riskLevel: 'low',
          performanceScore: 0,
          qualityScore: 0
        },
        error: String(error)
      }
    } finally {
      // 임시 파일 삭제
      await this.deleteTempFile(tempFile)
    }
  }
  
  private async saveTempFile(buffer: Buffer): Promise<string> {
    const filename = `vba_temp_${uuidv4()}.xlsm`
    const filepath = path.join(this.tempDir, filename)
    await fs.writeFile(filepath, buffer)
    return filepath
  }
  
  private async deleteTempFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath)
    } catch (error) {
      console.error('Failed to delete temp file:', error)
    }
  }
  
  private runPythonScript(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.pythonScriptPath, filePath])
      let output = ''
      let error = ''
      
      python.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      python.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed with code ${code}: ${error}`))
        } else {
          resolve(output)
        }
      })
      
      python.on('error', (err) => {
        reject(new Error(`Failed to start Python script: ${err.message}`))
      })
    })
  }
  
  private async generateAIInsights(analysis: VBAAnalysisResult): Promise<string[]> {
    const insights: string[] = []
    
    // 보안 위험 요약
    if (analysis.securityRisks.length > 0) {
      const highRisks = analysis.securityRisks.filter(r => r.severity === 'high')
      if (highRisks.length > 0) {
        insights.push(`🔴 ${highRisks.length}개의 심각한 보안 위험이 발견되었습니다. 즉시 검토가 필요합니다.`)
      }
      
      // 가장 위험한 패턴
      const mostDangerous = analysis.securityRisks[0]
      insights.push(`⚠️ 주요 위험: ${mostDangerous.description} (${mostDangerous.module} 모듈)`)
    }
    
    // 성능 개선 제안
    if (analysis.performanceIssues.length > 0) {
      const highImpact = analysis.performanceIssues.filter(i => i.impact === 'high')
      if (highImpact.length > 0) {
        insights.push(`🚀 ${highImpact.length}개의 주요 성능 개선 기회가 있습니다.`)
        
        // 가장 영향이 큰 문제
        const topIssue = highImpact[0]
        insights.push(`💡 권장사항: ${topIssue.suggestion}`)
      }
    }
    
    // 코드 품질 평가
    const qualityScore = analysis.summary.qualityScore
    if (qualityScore < 50) {
      insights.push(`📝 코드 품질 점수가 낮습니다 (${qualityScore}/100). 리팩토링을 고려하세요.`)
    } else if (qualityScore > 80) {
      insights.push(`✅ 코드 품질이 양호합니다 (${qualityScore}/100).`)
    }
    
    // 전체 권장사항
    if (analysis.summary.totalLines > 500) {
      insights.push(`📦 코드가 ${analysis.summary.totalLines}줄로 길어서 모듈화를 고려하세요.`)
    }
    
    // VBA 현대화 제안
    if (analysis.modules.length > 0) {
      insights.push(`🔄 VBA 대신 Office Scripts나 Power Automate 사용을 고려해보세요.`)
    }
    
    return insights
  }
  
  // 정적 분석 메서드 (Python 없이 기본 분석)
  async analyzeVBACode(vbaCode: string, moduleName: string = 'Unknown'): Promise<Partial<VBAAnalysisResult>> {
    const securityRisks: VBASecurityRisk[] = []
    const performanceIssues: VBAPerformanceIssue[] = []
    
    // 간단한 패턴 매칭으로 위험 검출
    const dangerousPatterns = [
      { pattern: /Shell\s*\(/gi, description: '시스템 명령 실행', severity: 'high' as const },
      { pattern: /CreateObject/gi, description: '외부 객체 생성', severity: 'medium' as const },
      { pattern: /Kill\s+/gi, description: '파일 삭제', severity: 'medium' as const }
    ]
    
    dangerousPatterns.forEach(({ pattern, description, severity }) => {
      if (pattern.test(vbaCode)) {
        securityRisks.push({
          pattern: pattern.source,
          description,
          severity,
          module: moduleName,
          suggestion: '보안 검토가 필요합니다'
        })
      }
    })
    
    // 성능 문제 검출
    if (/\.Select|\.Activate/gi.test(vbaCode)) {
      performanceIssues.push({
        type: 'select_usage',
        module: moduleName,
        description: 'Select/Activate 사용',
        impact: 'medium',
        suggestion: '직접 참조를 사용하세요'
      })
    }
    
    return {
      securityRisks,
      performanceIssues,
      summary: {
        totalModules: 1,
        totalLines: vbaCode.split('\n').length,
        riskLevel: securityRisks.some(r => r.severity === 'high') ? 'high' : 'low',
        performanceScore: performanceIssues.length > 0 ? 70 : 100,
        qualityScore: 80
      }
    }
  }
}

// Export types
export * from './types'