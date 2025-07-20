"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Upload, 
  File, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  FileText,
  Database,
  Loader2,
  Download
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface UploadStats {
  totalItems: number
  validItems: number
  invalidItems: number
  categories: { [key: string]: number }
  averageQuality: number
  duplicates: number
  qaDataCount: number
  chainSolutionsCount: number
  sources: { [key: string]: number }
}

interface UploadJob {
  id: string
  filename: string
  status: 'uploading' | 'validating' | 'processing' | 'generating_embeddings' | 'completed' | 'failed'
  progress: number
  stats?: UploadStats
  error?: string
  createdAt: Date
}

export default function KnowledgeBaseUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadJob, setUploadJob] = useState<UploadJob | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [datasetPreview, setDatasetPreview] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    // 파일 유효성 검사
    if (!file.name.endsWith('.jsonl') && !file.name.endsWith('.json')) {
      toast.error('JSON 또는 JSONL 파일만 업로드 가능합니다')
      return
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB 제한
      toast.error('파일 크기는 100MB를 초과할 수 없습니다')
      return
    }

    setSelectedFile(file)
    
    // 파일 미리보기 생성
    generateDatasetPreview(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const startUpload = async () => {
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('/api/admin/knowledge-base/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('업로드 실패')
      }

      const data = await response.json()
      
      if (data.success) {
        const newJob: UploadJob = {
          id: data.jobId,
          filename: selectedFile.name,
          status: 'uploading',
          progress: 0,
          createdAt: new Date()
        }
        
        setUploadJob(newJob)
        toast.success('업로드가 시작되었습니다')
        
        // 진행 상황 추적 시작
        pollJobStatus(data.jobId)
      } else {
        throw new Error(data.error || '업로드 실패')
      }
    } catch (error) {
      toast.error('업로드 실패: ' + (error as Error).message)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/admin/knowledge-base/jobs/${jobId}`)
        const data = await response.json()
        
        if (data.success) {
          setUploadJob(prev => prev ? { ...prev, ...data.job } : null)
          
          if (data.job.status === 'completed') {
            toast.success('데이터 처리가 완료되었습니다!')
            return
          }
          
          if (data.job.status === 'failed') {
            toast.error('데이터 처리 실패: ' + data.job.error)
            return
          }
          
          // 진행 중이면 계속 폴링
          setTimeout(poll, 2000)
        }
      } catch (error) {
        console.error('작업 상태 확인 실패:', error)
        setTimeout(poll, 5000) // 오류 시 5초 후 재시도
      }
    }
    
    poll()
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setUploadJob(null)
    setDatasetPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const generateDatasetPreview = async (file: File) => {
    try {
      const text = await file.text()
      let data
      
      // JSON 또는 JSONL 파싱
      if (file.name.endsWith('.jsonl')) {
        // JSONL 파싱 (각 줄이 JSON 객체)
        const lines = text.split('\n').filter(line => line.trim())
        data = {
          metadata: { totalItems: lines.length },
          qaData: lines.slice(0, 10).map(line => JSON.parse(line)) // 처음 10개만 미리보기
        }
      } else {
        // JSON 파싱
        data = JSON.parse(text)
      }
      
      // bigdata 시스템 형식인지 확인
      if (data.metadata && data.qaData && Array.isArray(data.qaData)) {
        // bigdata 형식의 데이터셋
        const preview = {
          isBigDataFormat: true,
          metadata: data.metadata,
          qaDataSample: data.qaData.slice(0, 5),
          chainSolutionsSample: data.chainSolutions ? data.chainSolutions.slice(0, 3) : [],
          stats: {
            totalQAData: data.qaData.length,
            totalChainSolutions: data.chainSolutions ? data.chainSolutions.length : 0,
            sources: data.qaData.reduce((acc: any, qa: any) => {
              acc[qa.source] = (acc[qa.source] || 0) + 1
              return acc
            }, {}),
            averageQuality: data.qaData.reduce((sum: number, qa: any) => sum + (qa.qualityScore?.total || 0), 0) / data.qaData.length
          }
        }
        setDatasetPreview(preview)
      } else {
        // 기존 JSONL 형식
        setDatasetPreview({
          isBigDataFormat: false,
          sampleData: data.qaData || data,
          totalItems: data.metadata?.totalItems || data.length
        })
      }
    } catch (error) {
      toast.error('파일 미리보기 생성 실패: ' + (error as Error).message)
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return '업로드 중'
      case 'validating':
        return '데이터 검증 중'
      case 'processing':
        return '데이터 처리 중'
      case 'generating_embeddings':
        return '임베딩 생성 중'
      case 'completed':
        return '완료'
      case 'failed':
        return '실패'
      default:
        return '대기 중'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <Link href="/admin" className="hover:text-gray-900 dark:hover:text-gray-100">
              관리자
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/admin/knowledge-base" className="hover:text-gray-900 dark:hover:text-gray-100">
              지식 베이스 관리
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>데이터 업로드</span>
          </div>
          <h1 className="text-3xl font-bold">데이터 업로드</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Excel Q&A 데이터를 업로드하여 AI 지식 베이스를 구축하세요
          </p>
        </div>
      </div>

      {/* 업로드 진행 상황 */}
      {uploadJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(uploadJob.status)}
              업로드 진행 상황
            </CardTitle>
            <CardDescription>
              {uploadJob.filename} - {getStatusText(uploadJob.status)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>진행률</span>
                <span>{uploadJob.progress}%</span>
              </div>
              <Progress value={uploadJob.progress} className="h-2" />
              
              {uploadJob.status === 'failed' && uploadJob.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                  <strong>오류:</strong> {uploadJob.error}
                </div>
              )}
              
              {uploadJob.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{uploadJob.stats.totalItems}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">총 항목</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{uploadJob.stats.validItems}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">유효 항목</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">{uploadJob.stats.invalidItems}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">무효 항목</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">{uploadJob.stats.averageQuality.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">평균 품질</div>
                  </div>
                </div>
              )}
              
              {uploadJob.status === 'completed' && (
                <div className="flex gap-2">
                  <Button onClick={resetUpload} variant="outline">
                    새 파일 업로드
                  </Button>
                  <Button asChild>
                    <Link href="/admin/knowledge-base">
                      지식 베이스로 돌아가기
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 파일 업로드 영역 */}
      {!uploadJob && (
        <Card>
          <CardHeader>
            <CardTitle>파일 업로드</CardTitle>
            <CardDescription>
              JSONL 또는 JSON 형식의 Q&A 데이터 파일을 업로드하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 드래그 앤 드롭 영역 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    파일을 이곳에 드래그하거나 클릭하여 선택
                  </p>
                  <p className="text-sm text-gray-500">
                    JSON, JSONL 파일만 지원 (최대 100MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.jsonl"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mt-4"
                >
                  파일 선택
                </Button>
              </div>

              {/* 선택된 파일 정보 */}
              {selectedFile && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium">{selectedFile.name}</div>
                        <div className="text-sm text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <Button onClick={startUpload} className="ml-4">
                        <Database className="mr-2 h-4 w-4" />
                        업로드 시작
                      </Button>
                    </div>
                  </div>

                  {/* 데이터셋 미리보기 */}
                  {datasetPreview && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">데이터셋 미리보기</h4>
                      
                      {datasetPreview.isBigDataFormat ? (
                        <div className="space-y-4">
                          {/* BigData 형식 통계 */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <div className="text-center">
                              <div className="text-lg font-semibold text-blue-600">{datasetPreview.stats.totalQAData}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">Q&A 데이터</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-purple-600">{datasetPreview.stats.totalChainSolutions}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">체인 솔루션</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-green-600">{datasetPreview.stats.averageQuality.toFixed(2)}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">평균 품질</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-orange-600">{Object.keys(datasetPreview.stats.sources).length}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">데이터 소스</div>
                            </div>
                          </div>

                          {/* 데이터 소스 분포 */}
                          <div>
                            <h5 className="font-medium mb-2">데이터 소스 분포</h5>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(datasetPreview.stats.sources).map(([source, count]) => (
                                <Badge key={source} variant="secondary">
                                  {source}: {count as string}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* 샘플 데이터 */}
                          <div>
                            <h5 className="font-medium mb-2">샘플 Q&A (최대 3개)</h5>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {datasetPreview.qaDataSample.slice(0, 3).map((qa: any, index: number) => (
                                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                                  <div className="font-medium mb-1">{qa.question}</div>
                                  <div className="text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                    {qa.answer.substring(0, 100)}...
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge variant="outline" className="text-xs">{qa.source}</Badge>
                                    <Badge variant="outline" className="text-xs">품질: {qa.qualityScore?.total?.toFixed(1) || 'N/A'}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 메타데이터 정보 */}
                          {datasetPreview.metadata && (
                            <div>
                              <h5 className="font-medium mb-2">메타데이터</h5>
                              <div className="text-sm space-y-1">
                                <div>수집 일시: {new Date(datasetPreview.metadata.exportDate).toLocaleString()}</div>
                                <div>버전: {datasetPreview.metadata.version}</div>
                                {datasetPreview.metadata.stats && (
                                  <div>수집 통계: {JSON.stringify(datasetPreview.metadata.stats, null, 2).substring(0, 100)}...</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* 기존 JSONL 형식 */}
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                            <div className="text-sm text-yellow-700 dark:text-yellow-300">
                              일반 JSONL/JSON 형식으로 감지되었습니다. BigData 수집기 형식이 아닙니다.
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium mb-2">데이터 샘플</h5>
                            <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                              {JSON.stringify(datasetPreview.sampleData?.slice(0, 2) || [], null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 데이터 형식 가이드 */}
      <Card>
        <CardHeader>
          <CardTitle>데이터 형식 가이드</CardTitle>
          <CardDescription>
            지원하는 데이터 형식과 구조를 확인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* BigData 수집기 형식 */}
            <div>
              <h4 className="font-medium mb-3 text-blue-600">🚀 BigData 수집기 형식 (권장)</h4>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded mb-3">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  BigData 수집기에서 생성된 JSON 파일은 자동으로 인식되어 최적화된 처리가 진행됩니다.
                </div>
              </div>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
{`{
  "metadata": {
    "exportDate": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0",
    "totalItems": 150,
    "stats": { "stackOverflow": 100, "reddit": 50 }
  },
  "qaData": [
    {
      "id": "so_123456",
      "source": "stackoverflow",
      "question": "VLOOKUP 함수에서 #N/A 오류가 발생합니다",
      "answer": "검색값과 테이블의 데이터 형식을 확인하세요...",
      "metadata": {
        "originalId": "123456",
        "url": "https://stackoverflow.com/q/123456",
        "tags": ["excel", "vlookup", "error"],
        "category": "함수오류",
        "difficulty": "beginner"
      },
      "qualityScore": {
        "technical": 85,
        "completeness": 90,
        "clarity": 88,
        "usefulness": 92,
        "total": 89
      }
    }
  ],
  "chainSolutions": [...]
}`}
              </pre>
            </div>

            {/* 일반 JSONL 형식 */}
            <div>
              <h4 className="font-medium mb-3">📄 일반 JSONL 형식</h4>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
{`{"id": "excel_qa_001", "question": "VLOOKUP 함수에서 #N/A 오류가 발생합니다", "answer": "데이터 형식을 확인하세요...", "category": "함수오류", "quality_score": 0.85}
{"id": "excel_qa_002", "question": "피벗 테이블이 업데이트되지 않습니다", "answer": "데이터 소스를 새로고침하세요...", "category": "피벗테이블", "quality_score": 0.92}`}
              </pre>
            </div>
            
            {/* 필드 설명 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">BigData 형식 필드:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><code>metadata</code>: 수집 메타데이터</li>
                  <li><code>qaData</code>: Q&A 데이터 배열</li>
                  <li><code>chainSolutions</code>: 대화 체인 솔루션</li>
                  <li><code>qualityScore</code>: 상세 품질 점수</li>
                  <li><code>source</code>: 데이터 출처 (stackoverflow, reddit)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">일반 형식 필드:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><code>id</code>: 고유 식별자</li>
                  <li><code>question</code>: 질문 내용</li>
                  <li><code>answer</code>: 답변 내용</li>
                  <li><code>category</code>: 카테고리 분류</li>
                  <li><code>quality_score</code>: 품질 점수 (0-1)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 샘플 데이터 다운로드 */}
      <Card>
        <CardHeader>
          <CardTitle>샘플 데이터 & BigData 수집기</CardTitle>
          <CardDescription>
            샘플 데이터를 다운로드하거나 BigData 수집기를 사용하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">📁 샘플 데이터</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  테스트용 샘플 데이터셋을 다운로드하세요
                </p>
                <div className="space-y-2">
                  <Button variant="outline" asChild className="w-full">
                    <a href="/api/admin/knowledge-base/sample-data" download>
                      <Download className="mr-2 h-4 w-4" />
                      일반 JSONL 샘플
                    </a>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <a href="/api/admin/knowledge-base/sample-data?format=bigdata" download>
                      <Download className="mr-2 h-4 w-4" />
                      BigData 형식 샘플
                    </a>
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <h4 className="font-medium mb-2 text-blue-600">🚀 BigData 수집기</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  고품질 Excel Q&A 데이터를 자동 수집하세요
                </p>
                <Button asChild className="w-full">
                  <a href="http://localhost:3002" target="_blank" rel="noopener noreferrer">
                    <Database className="mr-2 h-4 w-4" />
                    BigData 대시보드 열기
                  </a>
                </Button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
              <h4 className="font-medium mb-2">🔄 권장 워크플로우</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>BigData 수집기에서 데이터 수집 실행</li>
                <li>수집 완료 후 JSON 파일 다운로드</li>
                <li>이 페이지에서 JSON 파일 업로드</li>
                <li>자동 품질 검증 및 임베딩 생성</li>
                <li>AI 시스템에 즉시 반영</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}