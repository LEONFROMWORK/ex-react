'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AnalysisResults } from './AnalysisResults'
import Link from 'next/link'
import { Lock } from 'lucide-react'

interface AnalysisResult {
  fileAnalysis: any[]
  vbaAnalysis: any
  report: string
  summary: {
    totalIssues: number
    errors: number
    warnings: number
    suggestions: number
    hasVBA: boolean
    vbaRiskLevel: string
  }
}

export function FileAnalysisTab() {
  const { data: session, status } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setError(null)
      setResults(null)
    }
  }, [])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12': ['.xlsb']
    },
    maxFiles: 1
  })
  
  const analyzeFile = async () => {
    if (!file) return
    
    setLoading(true)
    setError(null)
    setProgress(0)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', 'file')
    
    try {
      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'x-test-user-id': 'user-1' // Mock auth
        },
        body: formData
      })
      
      clearInterval(progressInterval)
      setProgress(100)
      
      if (!response.ok) {
        throw new Error('분석 실패')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setResults(data.results)
      } else {
        throw new Error(data.message || '분석 중 오류가 발생했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }
  
  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Card className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    return (
      <div className="space-y-6">
        <Card className="p-8">
          <div className="text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">로그인이 필요합니다</h3>
            <p className="text-gray-600 mb-6">
              Excel 파일 분석 기능은 회원만 이용할 수 있습니다.<br />
              회원가입 시 무료로 100개의 토큰을 드립니다!
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/auth/login">
                <Button variant="outline">로그인</Button>
              </Link>
              <Link href="/auth/register">
                <Button>무료 회원가입</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 파일 업로드 영역 */}
      <Card className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive
              ? '파일을 놓으세요'
              : '클릭하거나 파일을 드래그하여 업로드'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            지원 형식: XLS, XLSX, XLSM, XLSB
          </p>
        </div>
        
        {file && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-sm text-gray-500">
                ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            
            <Button
              onClick={analyzeFile}
              disabled={loading}
              className="ml-4"
            >
              {loading ? '분석 중...' : '분석 시작'}
            </Button>
          </div>
        )}
        
        {loading && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-600 text-center">
              파일을 분석하고 있습니다... {progress}%
            </p>
          </div>
        )}
      </Card>
      
      {/* 오류 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* 분석 결과 */}
      {results && <AnalysisResults results={results} />}
    </div>
  )
}