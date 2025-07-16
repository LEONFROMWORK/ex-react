"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  ArrowLeft,
  Clock,
  Shield,
  Search,
  Wrench,
  Sparkles
} from "lucide-react"

interface AnalysisStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress?: number
}

export default function AnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const fileId = params.fileId as string
  
  const [fileInfo, setFileInfo] = useState<any>(null)
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    {
      id: 'upload',
      name: '파일 업로드',
      description: '파일을 서버로 전송합니다',
      status: 'completed'
    },
    {
      id: 'validation',
      name: '파일 검증',
      description: '파일 형식과 무결성을 확인합니다',
      status: 'pending'
    },
    {
      id: 'analysis',
      name: '오류 분석',
      description: '수식, 참조, 데이터 오류를 검사합니다',
      status: 'pending'
    },
    {
      id: 'correction',
      name: '오류 수정',
      description: '발견된 오류를 자동으로 수정합니다',
      status: 'pending'
    },
    {
      id: 'optimization',
      name: '최적화',
      description: '파일 성능을 최적화합니다',
      status: 'pending'
    }
  ])
  
  const [overallProgress, setOverallProgress] = useState(20)
  const [isComplete, setIsComplete] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  useEffect(() => {
    // 파일 정보 가져오기
    const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]')
    const file = uploadedFiles.find((f: any) => f.id === fileId)
    
    if (!file) {
      toast({
        title: "파일을 찾을 수 없습니다",
        description: "잘못된 파일 ID입니다.",
        variant: "destructive"
      })
      router.push('/dashboard/upload')
      return
    }
    
    setFileInfo(file)
    
    // 이미 완료된 경우
    if (file.status === 'completed' && file.result) {
      setIsComplete(true)
      setOverallProgress(100)
      setAnalysisResult(file.result)
      // 모든 스텝을 completed로 설정
      setAnalysisSteps(steps => steps.map(step => ({ ...step, status: 'completed' })))
    } else {
      // 분석 진행 시뮬레이션
      simulateAnalysis()
    }
  }, [fileId, router, toast])

  const simulateAnalysis = async () => {
    const steps = [...analysisSteps]
    
    // 각 단계를 순차적으로 진행
    for (let i = 1; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 현재 단계를 processing으로 변경
      steps[i].status = 'processing'
      setAnalysisSteps([...steps])
      setOverallProgress((i + 1) * 20)
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // 현재 단계를 completed로 변경
      steps[i].status = 'completed'
      setAnalysisSteps([...steps])
    }
    
    // 분석 완료
    setIsComplete(true)
    setOverallProgress(100)
    
    // 분석 결과 생성
    const result = {
      totalErrors: 15,
      fixedErrors: 12,
      warnings: 3,
      optimizations: 5,
      confidence: 95,
      errors: [
        {
          location: "Sheet1!A15",
          errorType: "순환 참조",
          description: "A15 셀이 자기 자신을 참조하고 있습니다",
          suggestion: "수식을 =SUM(A1:A14)로 변경",
          status: "corrected"
        },
        {
          location: "Sheet1!B22",
          errorType: "#REF! 오류",
          description: "삭제된 시트를 참조하고 있습니다",
          suggestion: "Sheet2!B22를 Sheet1!B22로 변경",
          status: "corrected"
        },
        {
          location: "Sheet2!D10:D20",
          errorType: "데이터 형식 불일치",
          description: "숫자 열에 텍스트가 포함되어 있습니다",
          suggestion: "텍스트를 숫자로 변환",
          status: "corrected"
        },
        {
          location: "Sheet1!F5",
          errorType: "#DIV/0! 오류",
          description: "0으로 나누기 시도",
          suggestion: "=IF(B5=0, 0, A5/B5)로 수정",
          status: "corrected"
        },
        {
          location: "Sheet3!A1:Z100",
          errorType: "성능 문제",
          description: "과도한 조건부 서식",
          suggestion: "조건부 서식 규칙을 최적화",
          status: "review"
        }
      ],
      fileSize: {
        original: fileInfo?.size || 0,
        optimized: Math.floor((fileInfo?.size || 0) * 0.85)
      }
    }
    setAnalysisResult(result)
    
    // 파일 상태 업데이트
    const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]')
    const updatedFiles = uploadedFiles.map((f: any) => {
      if (f.id === fileId) {
        return { ...f, status: 'completed', result }
      }
      return f
    })
    localStorage.setItem('uploadedFiles', JSON.stringify(updatedFiles))
    
    // 완료 알림
    toast({
      title: "분석 완료!",
      description: "파일 분석이 성공적으로 완료되었습니다.",
    })
  }

  const handleDownload = () => {
    toast({
      title: "다운로드 시작",
      description: "수정된 파일을 다운로드합니다.",
    })
    // 실제로는 서버에서 파일을 다운로드하는 로직
    // Mock 다운로드 시뮬레이션
    const link = document.createElement("a")
    link.href = "#"
    link.download = `corrected_${fileInfo?.name || 'file.xlsx'}`
    link.click()
  }

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'upload': return <FileSpreadsheet className="h-5 w-5" />
      case 'validation': return <Shield className="h-5 w-5" />
      case 'analysis': return <Search className="h-5 w-5" />
      case 'correction': return <Wrench className="h-5 w-5" />
      case 'optimization': return <CheckCircle className="h-5 w-5" />
      default: return <AlertCircle className="h-5 w-5" />
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/dashboard/history')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        처리 내역으로 돌아가기
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">파일 분석 {isComplete ? '완료' : '진행 중'}</h1>
        <p className="text-gray-600">
          {fileInfo?.name || '파일명'} 분석이 {isComplete ? '완료되었습니다' : '진행되고 있습니다'}.
        </p>
      </div>

      {/* 전체 진행률 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>전체 진행률</span>
            <Badge variant={isComplete ? "success" : "secondary"}>
              {isComplete ? "완료" : "진행 중"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-3 mb-2" />
          <p className="text-sm text-gray-600 text-center">
            {overallProgress}% 완료
          </p>
        </CardContent>
      </Card>

      {/* 단계별 진행 상황 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>분석 단계</CardTitle>
          <CardDescription>
            각 단계별 진행 상황을 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisSteps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  step.status === 'completed' ? 'bg-green-100 text-green-600' :
                  step.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                  step.status === 'error' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {getStepIcon(step.id)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{step.name}</h4>
                    <span className="text-sm text-gray-500">
                      {step.status === 'completed' && '완료'}
                      {step.status === 'processing' && '진행 중...'}
                      {step.status === 'pending' && '대기 중'}
                      {step.status === 'error' && '오류'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {step.status === 'processing' && (
                    <Progress value={50} className="h-1 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {isComplete && analysisResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>분석 결과</span>
              </span>
              <Badge variant="outline" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI 분석
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {analysisResult.fixedErrors}
                </p>
                <p className="text-sm text-gray-600">수정된 오류</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {analysisResult.warnings}
                </p>
                <p className="text-sm text-gray-600">경고 사항</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {analysisResult.optimizations}
                </p>
                <p className="text-sm text-gray-600">최적화 항목</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {analysisResult.confidence}%
                </p>
                <p className="text-sm text-gray-600">신뢰도</p>
              </div>
            </div>

            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                파일 분석이 완료되었습니다. 수정된 파일을 다운로드할 수 있습니다.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                수정된 파일 다운로드
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/history')}
                className="flex-1"
              >
                처리 내역 보기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 오류 상세 내역 */}
      {isComplete && analysisResult?.errors && analysisResult.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>오류 상세 내역</CardTitle>
            <CardDescription>
              발견된 오류와 수정 사항입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysisResult.errors.map((error: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{error.location}</div>
                    <div className="text-sm text-gray-600">
                      {error.errorType}: {error.description}
                    </div>
                    {error.suggestion && (
                      <div className="text-sm text-green-600 mt-1">
                        → {error.suggestion}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={error.status === "corrected" ? "default" : "secondary"}
                  >
                    {error.status === "corrected" ? "수정됨" : "검토 필요"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 진행 중 안내 */}
      {!isComplete && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            분석이 진행 중입니다. 페이지를 벗어나셔도 백그라운드에서 계속 진행됩니다.
            완료 시 이메일로 알려드리겠습니다.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}