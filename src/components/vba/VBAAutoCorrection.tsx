/**
 * VBA 자동 수정 UI 컴포넌트
 * SOLID 원칙 적용: Single Responsibility + Interface Segregation
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { 
  Code, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Shield,
  TrendingUp,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Download,
  Eye,
  GitCompare
} from 'lucide-react'

// === INTERFACES (Interface Segregation Principle) ===
interface VBAError {
  id: string
  type: string
  severity: 'error' | 'warning' | 'info'
  lineNumber: number
  description: string
  code: string
  autoFixable: boolean
  estimatedFixTime: number
}

interface VBACorrectionOptions {
  preserveComments: boolean
  optimizePerformance: boolean
  enforceStandards: boolean
  backupOriginal: boolean
}

interface VBACorrectionResult {
  success: boolean
  correctedCode: string
  appliedFixes: VBAFixRecord[]
  warnings: string[]
  backupId?: string
  estimatedPerformanceGain: number
  processingTime: number
  costIncurred: number
}

interface VBAFixRecord {
  errorId: string
  errorType: string
  lineNumber: number
  originalCode: string
  correctedCode: string
  explanation: string
  confidence: number
}

interface VBAAutoCorrectonProps {
  vbaErrors?: VBAError[]
  fileId?: string
  onCorrectionComplete?: (result: VBACorrectionResult) => void
  onCorrectionError?: (error: string) => void
}

// Mock data for standalone usage
const mockVBAErrors: VBAError[] = [
  {
    id: 'error-1',
    type: 'VARIABLE_NOT_DECLARED',
    severity: 'error',
    lineNumber: 5,
    description: '변수 "i"가 선언되지 않았습니다.',
    code: 'For i = 1 To 100',
    autoFixable: true,
    estimatedFixTime: 3
  },
  {
    id: 'error-2',
    type: 'TYPE_MISMATCH',
    severity: 'warning',
    lineNumber: 12,
    description: '데이터 타입이 일치하지 않습니다.',
    code: 'myString = 123',
    autoFixable: true,
    estimatedFixTime: 5
  },
  {
    id: 'error-3',
    type: 'OBJECT_NOT_SET',
    severity: 'error',
    lineNumber: 8,
    description: '객체가 설정되지 않았습니다.',
    code: 'ws.Cells(1,1).Value = "test"',
    autoFixable: true,
    estimatedFixTime: 4
  },
  {
    id: 'error-4',
    type: 'INEFFICIENT_LOOP',
    severity: 'info',
    lineNumber: 20,
    description: '비효율적인 루프 구조입니다.',
    code: 'For Each cell In Range("A1:A1000")',
    autoFixable: true,
    estimatedFixTime: 8
  },
  {
    id: 'error-5',
    type: 'MEMORY_LEAK',
    severity: 'warning',
    lineNumber: 15,
    description: '객체 참조가 해제되지 않았습니다.',
    code: 'Set ws = ActiveSheet',
    autoFixable: true,
    estimatedFixTime: 2
  }
]

// === MAIN COMPONENT (Single Responsibility Principle) ===
export function VBAAutoCorrection({
  vbaErrors = mockVBAErrors,
  fileId = 'standalone-mode',
  onCorrectionComplete = () => {},
  onCorrectionError = () => {}
}: VBAAutoCorrectonProps = {}) {
  // State Management
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set())
  const [correctionOptions, setCorrectionOptions] = useState<VBACorrectionOptions>({
    preserveComments: true,
    optimizePerformance: true,
    enforceStandards: false,
    backupOriginal: true
  })
  const [correctionProgress, setCorrectionProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [correctionResult, setCorrectionResult] = useState<VBACorrectionResult | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  
  const { toast } = useToast()

  // Computed Values with null safety
  const autoFixableErrors = (vbaErrors || []).filter(error => error?.autoFixable)
  const totalEstimatedTime = selectedErrors.size > 0 
    ? Array.from(selectedErrors).reduce((total, errorId) => {
        const error = vbaErrors?.find(e => e.id === errorId)
        return total + (error?.estimatedFixTime || 0)
      }, 0)
    : 0

  const estimatedCost = selectedErrors.size * 0.05 // $0.05 per fix

  // Error Selection Management
  const toggleErrorSelection = useCallback((errorId: string) => {
    setSelectedErrors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(errorId)) {
        newSet.delete(errorId)
      } else {
        newSet.add(errorId)
      }
      return newSet
    })
  }, [])

  const selectAllAutoFixable = useCallback(() => {
    const autoFixableIds = autoFixableErrors.map(error => error.id)
    setSelectedErrors(new Set(autoFixableIds))
  }, [autoFixableErrors])

  const clearSelection = useCallback(() => {
    setSelectedErrors(new Set())
  }, [])

  // Main Correction Process
  const startCorrection = useCallback(async () => {
    if (selectedErrors.size === 0) {
      toast({
        title: '선택된 오류 없음',
        description: '수정할 오류를 선택해주세요.',
        variant: 'destructive'
      })
      return
    }

    setIsProcessing(true)
    setCorrectionProgress(0)
    setCurrentStep('보안 검사 중...')

    try {
      // Simulate step-by-step processing
      const steps = [
        { message: '보안 검사 중...', progress: 10 },
        { message: '백업 생성 중...', progress: 20 },
        { message: 'AI 분석 시작...', progress: 30 },
        { message: '규칙 기반 수정 적용...', progress: 50 },
        { message: 'AI 고급 수정 적용...', progress: 70 },
        { message: '수정 결과 검증...', progress: 85 },
        { message: '최종 검토 중...', progress: 95 },
        { message: '완료!', progress: 100 }
      ]

      for (const step of steps) {
        if (isPaused) {
          setCurrentStep('일시 정지됨')
          break
        }

        setCurrentStep(step.message)
        setCorrectionProgress(step.progress)
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      if (!isPaused) {
        // Mock successful result
        const mockResult: VBACorrectionResult = {
          success: true,
          correctedCode: generateMockCorrectedCode(),
          appliedFixes: generateMockFixes(),
          warnings: ['일부 복잡한 로직은 수동 검토가 필요합니다.'],
          backupId: correctionOptions.backupOriginal ? `backup_${Date.now()}` : undefined,
          estimatedPerformanceGain: 25,
          processingTime: totalEstimatedTime,
          costIncurred: estimatedCost
        }

        setCorrectionResult(mockResult)
        onCorrectionComplete(mockResult)

        toast({
          title: '수정 완료',
          description: `${selectedErrors.size}개 오류가 성공적으로 수정되었습니다.`,
        })
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      onCorrectionError(errorMessage)
      
      toast({
        title: '수정 실패',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      setIsPaused(false)
    }
  }, [selectedErrors, correctionOptions, totalEstimatedTime, estimatedCost, isPaused, toast, onCorrectionComplete, onCorrectionError])

  const pauseCorrection = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resumeCorrection = useCallback(() => {
    setIsPaused(false)
  }, [])

  const resetCorrection = useCallback(() => {
    setIsProcessing(false)
    setIsPaused(false)
    setCorrectionProgress(0)
    setCurrentStep('')
    setCorrectionResult(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            VBA 자동 수정
          </CardTitle>
          <CardDescription>
            AI 기반 VBA 코드 자동 수정 및 최적화
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{(vbaErrors || []).length}</div>
              <div className="text-sm text-muted-foreground">총 오류</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{autoFixableErrors.length}</div>
              <div className="text-sm text-muted-foreground">자동 수정 가능</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{selectedErrors.size}</div>
              <div className="text-sm text-muted-foreground">선택됨</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">${estimatedCost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">예상 비용</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Correction Options */}
      <Card>
        <CardHeader>
          <CardTitle>수정 옵션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="preserve-comments"
                checked={correctionOptions.preserveComments}
                onCheckedChange={(checked) =>
                  setCorrectionOptions(prev => ({ ...prev, preserveComments: checked }))
                }
              />
              <Label htmlFor="preserve-comments">주석 보존</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="optimize-performance"
                checked={correctionOptions.optimizePerformance}
                onCheckedChange={(checked) =>
                  setCorrectionOptions(prev => ({ ...prev, optimizePerformance: checked }))
                }
              />
              <Label htmlFor="optimize-performance">성능 최적화</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="enforce-standards"
                checked={correctionOptions.enforceStandards}
                onCheckedChange={(checked) =>
                  setCorrectionOptions(prev => ({ ...prev, enforceStandards: checked }))
                }
              />
              <Label htmlFor="enforce-standards">코딩 표준 적용</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="backup-original"
                checked={correctionOptions.backupOriginal}
                onCheckedChange={(checked) =>
                  setCorrectionOptions(prev => ({ ...prev, backupOriginal: checked }))
                }
              />
              <Label htmlFor="backup-original">원본 백업</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      {(isProcessing || correctionProgress > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              수정 진행 상황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={correctionProgress} className="h-3" />
              <div className="flex items-center justify-between text-sm">
                <span>{currentStep}</span>
                <span>{correctionProgress}%</span>
              </div>
              
              {isProcessing && (
                <div className="flex gap-2">
                  {!isPaused ? (
                    <Button size="sm" variant="outline" onClick={pauseCorrection}>
                      <Pause className="h-4 w-4 mr-2" />
                      일시 정지
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={resumeCorrection}>
                      <Play className="h-4 w-4 mr-2" />
                      재개
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={resetCorrection}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    초기화
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="errors">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="errors">오류 목록</TabsTrigger>
          <TabsTrigger value="preview">미리보기</TabsTrigger>
          <TabsTrigger value="result">수정 결과</TabsTrigger>
        </TabsList>

        {/* Error List Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>수정 가능한 오류</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAllAutoFixable}>
                    전체 선택
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSelection}>
                    선택 해제
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {autoFixableErrors.map((error) => (
                    <VBAErrorCard
                      key={error.id}
                      error={error}
                      isSelected={selectedErrors.has(error.id)}
                      onToggleSelection={toggleErrorSelection}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>수정 미리보기</CardTitle>
              <CardDescription>
                선택된 오류들의 예상 수정 결과를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedErrors.size === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  수정할 오류를 선택해주세요
                </div>
              ) : (
                <VBAPreviewPanel selectedErrors={Array.from(selectedErrors)} vbaErrors={vbaErrors} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Result Tab */}
        <TabsContent value="result">
          <Card>
            <CardHeader>
              <CardTitle>수정 결과</CardTitle>
            </CardHeader>
            <CardContent>
              {correctionResult ? (
                <VBACorrectionResultPanel result={correctionResult} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  아직 수정이 실행되지 않았습니다
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedErrors.size}개 오류 선택됨 · 예상 시간: {totalEstimatedTime}초 · 비용: ${estimatedCost.toFixed(2)}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
                disabled={selectedErrors.size === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                미리보기
              </Button>
              
              <Button
                onClick={startCorrection}
                disabled={selectedErrors.size === 0 || isProcessing}
                className="min-w-32"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    수정 중...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    자동 수정 시작
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// === SUPPORTING COMPONENTS (Single Responsibility Principle) ===

interface VBAErrorCardProps {
  error: VBAError
  isSelected: boolean
  onToggleSelection: (errorId: string) => void
}

function VBAErrorCard({ error, isSelected, onToggleSelection }: VBAErrorCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      case 'info': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return AlertTriangle
      case 'warning': return AlertTriangle
      case 'info': return CheckCircle
      default: return CheckCircle
    }
  }

  const Icon = getSeverityIcon(error.severity)

  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onToggleSelection(error.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Icon className={`h-5 w-5 mt-0.5 ${getSeverityColor(error.severity)}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{error.type}</Badge>
              <span className="text-sm text-muted-foreground">Line {error.lineNumber}</span>
              <Badge variant="secondary">{error.estimatedFixTime}초</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{error.description}</p>
            <code className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded mt-2 block">
              {error.code}
            </code>
          </div>
        </div>
        <div className="flex items-center">
          {isSelected && <CheckCircle className="h-5 w-5 text-green-500" />}
        </div>
      </div>
    </div>
  )
}

function VBAPreviewPanel({ selectedErrors, vbaErrors }: { selectedErrors: string[], vbaErrors: VBAError[] }) {
  const errors = selectedErrors
    .map(id => (vbaErrors || []).find(e => e.id === id))
    .filter(Boolean) as VBAError[]
  
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          미리보기는 예상 결과입니다. 실제 수정 결과와 다를 수 있습니다.
        </AlertDescription>
      </Alert>
      
      {errors.map((error) => (
        <div key={error.id} className="border rounded-lg p-4">
          <div className="mb-2">
            <Badge variant="outline">{error.type}</Badge>
            <span className="ml-2 text-sm text-muted-foreground">Line {error.lineNumber}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-red-600">수정 전</Label>
              <code className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded block mt-1">
                {error.code}
              </code>
            </div>
            <div>
              <Label className="text-sm font-medium text-green-600">수정 후 (예상)</Label>
              <code className="text-xs bg-green-50 dark:bg-green-950 p-2 rounded block mt-1">
                {generateMockFixedCode(error)}
              </code>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function VBACorrectionResultPanel({ result }: { result: VBACorrectionResult }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{result.appliedFixes.length}</div>
          <div className="text-sm text-muted-foreground">수정 완료</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">{result.estimatedPerformanceGain}%</div>
          <div className="text-sm text-muted-foreground">성능 향상</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-500">{result.processingTime}초</div>
          <div className="text-sm text-muted-foreground">처리 시간</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">${result.costIncurred.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">사용 비용</div>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">주의사항:</div>
            <ul className="list-disc pl-5 space-y-1">
              {result.warnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Applied Fixes */}
      <div>
        <h4 className="font-medium mb-3">적용된 수정 사항</h4>
        <div className="space-y-3">
          {result.appliedFixes.map((fix, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{fix.errorType}</Badge>
                <Badge variant="secondary">신뢰도: {(fix.confidence * 100).toFixed(0)}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{fix.explanation}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-red-600">수정 전</Label>
                  <code className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded block mt-1">
                    {fix.originalCode}
                  </code>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-600">수정 후</Label>
                  <code className="text-xs bg-green-50 dark:bg-green-950 p-2 rounded block mt-1">
                    {fix.correctedCode}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button>
          <Download className="h-4 w-4 mr-2" />
          수정된 파일 다운로드
        </Button>
        <Button variant="outline">
          <GitCompare className="h-4 w-4 mr-2" />
          전체 변경사항 보기
        </Button>
      </div>
    </div>
  )
}

// === MOCK DATA GENERATORS ===
function generateMockCorrectedCode(): string {
  return `Sub OptimizedProcedure()
    Dim ws As Worksheet
    Set ws = ActiveSheet
    
    Application.ScreenUpdating = False
    
    ' 수정된 VBA 코드
    For i = 1 To 1000
        ws.Cells(i, 1).Value = i
    Next i
    
    Application.ScreenUpdating = True
    Set ws = Nothing
End Sub`
}

function generateMockFixes(): VBAFixRecord[] {
  return [
    {
      errorId: 'fix-1',
      errorType: 'VARIABLE_NOT_DECLARED',
      lineNumber: 2,
      originalCode: 'i = 1',
      correctedCode: 'Dim i As Long',
      explanation: '변수 i를 Long 타입으로 선언 추가',
      confidence: 0.95
    },
    {
      errorId: 'fix-2',
      errorType: 'INEFFICIENT_LOOP',
      lineNumber: 5,
      originalCode: 'For i = 1 To 1000',
      correctedCode: 'Application.ScreenUpdating = False 추가',
      explanation: '루프 성능 최적화를 위한 화면 업데이트 비활성화',
      confidence: 0.9
    }
  ]
}

function generateMockFixedCode(error: VBAError): string {
  switch (error.type) {
    case 'VARIABLE_NOT_DECLARED':
      return 'Dim myVar As Long'
    case 'TYPE_MISMATCH':
      return 'myVar = CStr(someValue)'
    case 'OBJECT_NOT_SET':
      return 'Set myObject = CreateObject("Excel.Application")'
    default:
      return '// 수정된 코드'
  }
}