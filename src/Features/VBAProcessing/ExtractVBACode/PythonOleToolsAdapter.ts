import { Result } from '@/Common/Result'
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { v4 as uuidv4 } from 'uuid'

export interface VBAModule {
  moduleName: string
  moduleType: 'Standard' | 'Class' | 'Form' | 'Sheet' | 'ThisWorkbook'
  code: string
}

export interface VBAExtractionResult {
  modules: VBAModule[]
  hasVBA: boolean
  metadata: {
    totalModules: number
    totalLines: number
    extractionTime: number
  }
}

export const VBAExtractionErrors = {
  PythonNotFound: {
    code: 'VBA.PYTHON_NOT_FOUND',
    message: 'Python 실행 환경을 찾을 수 없습니다',
  },
  OletoolsNotInstalled: {
    code: 'VBA.OLETOOLS_NOT_INSTALLED',
    message: 'oletools가 설치되지 않았습니다',
  },
  ExtractionFailed: {
    code: 'VBA.EXTRACTION_FAILED',
    message: 'VBA 코드 추출에 실패했습니다',
  },
  InvalidFile: {
    code: 'VBA.INVALID_FILE',
    message: '유효하지 않은 Excel 파일입니다',
  },
} as const

export class PythonOleToolsAdapter {
  private pythonPath: string
  private tempDir: string
  
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3'
    this.tempDir = join(tmpdir(), 'vba-extraction')
  }

  async extractVBACode(fileBuffer: Buffer): Promise<Result<VBAExtractionResult>> {
    const startTime = Date.now()
    const tempFilePath = join(this.tempDir, `${uuidv4()}.xlsm`)
    
    try {
      // 1. 임시 파일 생성
      await writeFile(tempFilePath, fileBuffer)
      
      // 2. Python 스크립트 실행
      const pythonScript = this.getExtractorScript()
      const result = await this.executePython(pythonScript, tempFilePath)
      
      if (!result.isSuccess) {
        return Result.failure(result.error)
      }
      
      // 3. 결과 파싱
      const extractionResult = this.parseExtractionResult(result.value)
      
      return Result.success({
        ...extractionResult,
        metadata: {
          ...extractionResult.metadata,
          extractionTime: Date.now() - startTime,
        },
      })
    } catch (error) {
      console.error('VBA 추출 오류:', error)
      return Result.failure(VBAExtractionErrors.ExtractionFailed)
    } finally {
      // 임시 파일 정리
      try {
        await unlink(tempFilePath)
      } catch (error) {
        // 정리 실패 무시
      }
    }
  }

  private async executePython(script: string, filePath: string): Promise<Result<string>> {
    return new Promise((resolve) => {
      const pythonProcess = spawn(this.pythonPath, ['-c', script, filePath])
      
      let stdout = ''
      let stderr = ''
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })
      
      pythonProcess.on('error', (error) => {
        console.error('Python 프로세스 오류:', error)
        resolve(Result.failure(VBAExtractionErrors.PythonNotFound))
      })
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python 스크립트 오류:', stderr)
          
          if (stderr.includes('ModuleNotFoundError') && stderr.includes('oletools')) {
            resolve(Result.failure(VBAExtractionErrors.OletoolsNotInstalled))
          } else {
            resolve(Result.failure(VBAExtractionErrors.ExtractionFailed))
          }
        } else {
          resolve(Result.success(stdout))
        }
      })
    })
  }

  private parseExtractionResult(output: string): VBAExtractionResult {
    try {
      const result = JSON.parse(output)
      
      const modules: VBAModule[] = result.modules.map((m: any) => ({
        moduleName: m.name,
        moduleType: this.normalizeModuleType(m.type),
        code: m.code,
      }))
      
      const totalLines = modules.reduce((sum, m) => sum + m.code.split('\n').length, 0)
      
      return {
        modules,
        hasVBA: modules.length > 0,
        metadata: {
          totalModules: modules.length,
          totalLines,
          extractionTime: 0,
        },
      }
    } catch (error) {
      console.error('결과 파싱 오류:', error)
      return {
        modules: [],
        hasVBA: false,
        metadata: {
          totalModules: 0,
          totalLines: 0,
          extractionTime: 0,
        },
      }
    }
  }

  private normalizeModuleType(type: string): VBAModule['moduleType'] {
    const typeMap: Record<string, VBAModule['moduleType']> = {
      'Module': 'Standard',
      'Class Module': 'Class',
      'Form': 'Form',
      'Sheet': 'Sheet',
      'ThisWorkbook': 'ThisWorkbook',
    }
    
    return typeMap[type] || 'Standard'
  }

  private getExtractorScript(): string {
    return `
import sys
import json
from oletools.olevba import VBA_Parser

def extract_vba(file_path):
    try:
        vba_parser = VBA_Parser(file_path)
        
        if not vba_parser.detect_vba_macros():
            print(json.dumps({
                "modules": [],
                "error": None
            }))
            return
        
        modules = []
        for (filename, stream_path, vba_filename, vba_code) in vba_parser.extract_macros():
            if vba_code:
                module_type = "Module"
                if "class" in vba_filename.lower():
                    module_type = "Class Module"
                elif "form" in vba_filename.lower():
                    module_type = "Form"
                elif "sheet" in vba_filename.lower():
                    module_type = "Sheet"
                elif "thisworkbook" in vba_filename.lower():
                    module_type = "ThisWorkbook"
                
                modules.append({
                    "name": vba_filename,
                    "type": module_type,
                    "code": vba_code.decode('utf-8', errors='ignore') if isinstance(vba_code, bytes) else vba_code
                })
        
        vba_parser.close()
        
        print(json.dumps({
            "modules": modules,
            "error": None
        }))
        
    except Exception as e:
        print(json.dumps({
            "modules": [],
            "error": str(e)
        }))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_vba(sys.argv[1])
    else:
        print(json.dumps({
            "modules": [],
            "error": "No file path provided"
        }))
`
  }

  // VBA 코드 보안 스캔
  async scanVBASecurity(modules: VBAModule[]): Promise<{
    threats: Array<{
      module: string
      line: number
      type: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      description: string
    }>
    summary: {
      totalThreats: number
      criticalCount: number
      highCount: number
      mediumCount: number
      lowCount: number
    }
  }> {
    const threats: any[] = []
    
    const dangerousPatterns = [
      {
        pattern: /Shell\s*\(/gi,
        type: 'shell_execution',
        severity: 'critical' as const,
        description: '외부 프로그램 실행 시도',
      },
      {
        pattern: /CreateObject\s*\(\s*["']WScript\.Shell["']\s*\)/gi,
        type: 'wscript_shell',
        severity: 'critical' as const,
        description: 'WScript.Shell 객체 생성',
      },
      {
        pattern: /\.Run\s*\(/gi,
        type: 'run_command',
        severity: 'high' as const,
        description: '명령 실행 시도',
      },
      {
        pattern: /Open\s+.+\s+For\s+(Binary|Random|Output|Append)/gi,
        type: 'file_access',
        severity: 'medium' as const,
        description: '파일 시스템 접근',
      },
      {
        pattern: /GetObject\s*\(/gi,
        type: 'com_object',
        severity: 'medium' as const,
        description: 'COM 객체 접근',
      },
      {
        pattern: /Environ\s*\(/gi,
        type: 'environment_access',
        severity: 'low' as const,
        description: '환경 변수 접근',
      },
    ]
    
    modules.forEach(module => {
      const lines = module.code.split('\n')
      
      lines.forEach((line, lineIndex) => {
        dangerousPatterns.forEach(({ pattern, type, severity, description }) => {
          if (pattern.test(line)) {
            threats.push({
              module: module.moduleName,
              line: lineIndex + 1,
              type,
              severity,
              description,
            })
          }
        })
      })
    })
    
    const summary = {
      totalThreats: threats.length,
      criticalCount: threats.filter(t => t.severity === 'critical').length,
      highCount: threats.filter(t => t.severity === 'high').length,
      mediumCount: threats.filter(t => t.severity === 'medium').length,
      lowCount: threats.filter(t => t.severity === 'low').length,
    }
    
    return { threats, summary }
  }
}