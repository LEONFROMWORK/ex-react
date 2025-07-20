'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { 
  Code2, 
  Upload, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  Download,
  Loader2,
  Eye
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface VBAModule {
  name: string
  type: string
  code: string
  lineCount: number
}

interface SecurityThreat {
  module: string
  line: number
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  code: string
}

interface ExtractionResult {
  extractionId: string
  fileName: string
  extractedAt: string
  vbaModules: VBAModule[]
  metadata: {
    hasVBA: boolean
    totalModules: number
    totalLines: number
    extractionTime: number
  }
  securityScan?: {
    threats: SecurityThreat[]
    summary: {
      totalThreats: number
      criticalCount: number
      highCount: number
      mediumCount: number
      lowCount: number
    }
  }
}

export function VBAExtractionDashboard() {
  const [file, setFile] = useState<File | null>(null)
  const [includeSecurityScan, setIncludeSecurityScan] = useState(true)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)
  const [selectedModule, setSelectedModule] = useState<VBAModule | null>(null)
  
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      // 파일 형식 검증
      const validExtensions = ['.xlsx', '.xlsm', '.xls', '.xlsb']
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: '지원되지 않는 파일 형식',
          description: 'Excel 파일(.xlsx, .xlsm, .xls, .xlsb)만 업로드할 수 있습니다.',
          variant: 'destructive'
        })
        return
      }
      
      // 파일 크기 검증 (100MB 제한)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: '파일 크기 초과',
          description: '100MB 이하의 파일만 업로드할 수 있습니다.',
          variant: 'destructive'
        })
        return
      }
      
      setFile(file)
      setExtractionResult(null)
      setSelectedModule(null)
    }
  }, [toast])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12': ['.xlsb']
    },
    multiple: false
  })

  const handleExtractVBA = async () => {
    if (!file) {
      toast({
        title: '파일을 선택해주세요',
        description: 'VBA 코드를 추출할 Excel 파일을 업로드해주세요.',
        variant: 'destructive'
      })
      return
    }

    setIsExtracting(true)
    setExtractionProgress(0)

    try {
      // 진행 상황 시뮬레이션
      const progressSteps = [
        { message: '파일 분석 중...', progress: 20 },
        { message: 'VBA 모듈 검색 중...', progress: 40 },
        { message: '코드 추출 중...', progress: 60 },
        { message: '보안 스캔 실행 중...', progress: 80 },
        { message: '결과 처리 중...', progress: 100 }
      ]

      for (const step of progressSteps) {
        setExtractionProgress(step.progress)
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      // API 호출
      const formData = new FormData()
      formData.append('file', file)
      formData.append('includeSecurityScan', includeSecurityScan.toString())

      const response = await fetch('/api/vba/extract', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'VBA 추출에 실패했습니다')
      }

      const data = await response.json()
      setExtractionResult(data.data)
      
      toast({
        title: 'VBA 추출 완료',
        description: `${data.data.vbaModules.length}개의 모듈을 찾았습니다.`
      })

    } catch (error) {
      console.error('VBA 추출 오류:', error)
      toast({
        title: 'VBA 추출 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setIsExtracting(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />
      case 'low':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 파일 업로드 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            파일 업로드
          </CardTitle>
          <CardDescription>
            VBA 매크로가 포함된 Excel 파일을 업로드하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div {...getRootProps()} className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}>
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            {file ? (
              <div>
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  크기: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Excel 파일을 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-sm text-muted-foreground">
                  .xlsx, .xlsm, .xls, .xlsb 파일 지원 (최대 100MB)
                </p>
              </div>
            )}
          </div>

          {file && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="security-scan"
                  checked={includeSecurityScan}
                  onCheckedChange={setIncludeSecurityScan}
                />
                <Label htmlFor="security-scan" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  보안 위험 스캔 포함
                </Label>
              </div>

              <Button
                onClick={handleExtractVBA}
                disabled={isExtracting}
                className="w-full"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    VBA 추출 중...
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4 mr-2" />
                    VBA 코드 추출 시작
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 진행 상황 */}
      {isExtracting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              추출 진행 상황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={extractionProgress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {extractionProgress}% 완료
            </p>
          </CardContent>
        </Card>
      )}

      {/* 추출 결과 */}
      {extractionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              추출 결과
            </CardTitle>
            <CardDescription>
              {extractionResult.fileName} - {new Date(extractionResult.extractedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 요약 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {extractionResult.metadata.totalModules}
                </div>
                <div className="text-sm text-muted-foreground">VBA 모듈</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {extractionResult.metadata.totalLines}
                </div>
                <div className="text-sm text-muted-foreground">코드 라인</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {extractionResult.metadata.extractionTime}ms
                </div>
                <div className="text-sm text-muted-foreground">처리 시간</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {extractionResult.securityScan?.summary.totalThreats || 0}
                </div>
                <div className="text-sm text-muted-foreground">보안 위험</div>
              </div>
            </div>

            <Tabs defaultValue="modules">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="modules">VBA 모듈</TabsTrigger>
                <TabsTrigger value="security">보안 스캔</TabsTrigger>
                <TabsTrigger value="code">코드 뷰어</TabsTrigger>
              </TabsList>

              {/* VBA 모듈 탭 */}
              <TabsContent value="modules" className="space-y-4">
                {extractionResult.vbaModules.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      이 파일에서 VBA 모듈을 찾을 수 없습니다. 
                      파일에 매크로가 포함되어 있지 않거나 다른 형식일 수 있습니다.
                    </AlertDescription>
                  </Alert>
                ) : (
                  extractionResult.vbaModules.map((module, index) => (
                    <Card key={index} className="cursor-pointer hover:bg-gray-50" 
                          onClick={() => setSelectedModule(module)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{module.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {module.type} · {module.lineCount} 라인
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{module.type}</Badge>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* 보안 스캔 탭 */}
              <TabsContent value="security" className="space-y-4">
                {extractionResult.securityScan ? (
                  <>
                    {extractionResult.securityScan.summary.totalThreats === 0 ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          보안 위험이 발견되지 않았습니다. 안전한 VBA 코드입니다.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-3">
                        {extractionResult.securityScan.threats.map((threat, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${getSeverityColor(threat.severity)}`}>
                                  {getSeverityIcon(threat.severity)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className={getSeverityColor(threat.severity)}>
                                      {threat.severity.toUpperCase()}
                                    </Badge>
                                    <span className="text-sm font-medium">{threat.module}</span>
                                    <span className="text-sm text-muted-foreground">Line {threat.line}</span>
                                  </div>
                                  <p className="text-sm mb-2">{threat.description}</p>
                                  <code className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">
                                    {threat.code}
                                  </code>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      보안 스캔이 실행되지 않았습니다.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* 코드 뷰어 탭 */}
              <TabsContent value="code">
                {selectedModule ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{selectedModule.name}</span>
                        <Badge variant="outline">{selectedModule.type}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96 w-full">
                        <pre className="text-sm">
                          <code className="language-vba">
                            {selectedModule.code}
                          </code>
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code2 className="h-12 w-12 mx-auto mb-4" />
                    <p>VBA 모듈을 선택하여 코드를 확인하세요</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* 다운로드 버튼 */}
            {extractionResult.vbaModules.length > 0 && (
              <div className="mt-6 flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  VBA 코드 다운로드
                </Button>
                {extractionResult.securityScan && (
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    보안 리포트 다운로드
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}