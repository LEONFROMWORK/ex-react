'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  Zap, 
  Code, 
  MessageSquare,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react'

// Store and services
import { useFileStore } from '@/lib/stores/fileStore'
import { useAnalysisService, useErrorCorrectionService } from '@/lib/services/container'
import { TokenService, TOKEN_COSTS } from '@/lib/services/token.service'
import { UserTierService } from '@/lib/services/user-tier.service'
import { useSession } from 'next-auth/react'

// Components
import { FileUploadZone } from '@/components/unified/FileUploadZone'
import { AnalysisResultsList } from '@/components/unified/AnalysisResultsList'
import { FileContextChat } from '@/components/unified/FileContextChat'
import { VersionHistory } from '@/components/unified/VersionHistory'
import { PerformanceAnalyzer } from '@/components/unified/PerformanceAnalyzer'
import { VBAAnalyzer } from '@/components/unified/VBAAnalyzer'
import { LoadingOverlay, AnalysisResultsSkeleton, FileUploadSkeleton } from '@/components/unified/LoadingStates'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { AnalysisProgress } from '@/components/unified/AnalysisProgress'
import { useAnalysisProgress } from '@/hooks/useAnalysisProgress'
import { ErrorMessage, getErrorMessage } from '@/components/error/ErrorMessage'
import { ReportGenerator } from '@/components/unified/ReportGenerator'

export default function UnifiedAnalysisPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const [userTierService] = useState(() => UserTierService.getInstance())
  
  // Global state
  const {
    currentFile,
    analysisResults,
    selectedFixes,
    isAnalyzing,
    error: storeError,
    setCurrentFile,
    setAnalysisResults,
    setAnalyzing,
    setError: setStoreError
  } = useFileStore()
  
  const [errorInfo, setError] = useState<any>(null)
  
  // Services
  const analysisService = useAnalysisService()
  const correctionService = useErrorCorrectionService()
  
  // Local state
  const [activeTab, setActiveTab] = useState('errors')
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  
  // 분석 진행 상황 추적
  const {
    stages,
    totalProgress,
    currentMessage,
    error: progressError,
    reset: resetProgress
  } = useAnalysisProgress({
    fileId: currentFileId || '',
    onComplete: (resultId) => {
      toast({
        title: '분석 완료',
        description: '파일 분석이 성공적으로 완료되었습니다.'
      })
      setAnalyzing(false)
    },
    onError: (error) => {
      toast({
        title: '분석 실패',
        description: error,
        variant: 'destructive'
      })
      setAnalyzing(false)
    }
  })
  
  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      if (!session?.user?.id) {
        throw new Error('로그인이 필요합니다.')
      }
      
      // 사용자 등급별 파일 크기 제한 확인
      const fileSizeCheck = await userTierService.checkFileSizeLimit(session.user.id, file.size)
      if (!fileSizeCheck.allowed) {
        setError({
          title: '파일 크기 초과',
          message: `현재 등급에서는 최대 ${(fileSizeCheck.maxSize / 1024 / 1024).toFixed(0)}MB까지 업로드 가능합니다.`,
          code: 'FILE_SIZE_EXCEEDED',
          actions: [
            {
              label: '업그레이드하기',
              action: () => router.push('/pricing')
            }
          ]
        })
        return
      }
      
      // 월간 파일 처리 제한 확인
      const fileLimit = await userTierService.checkMonthlyFileLimit(session.user.id)
      if (!fileLimit.allowed) {
        setError({
          title: '월간 파일 제한 초과',
          message: '이번 달 파일 처리 한도를 초과했습니다.',
          code: 'MONTHLY_LIMIT_EXCEEDED',
          actions: [
            {
              label: '업그레이드하기',
              action: () => router.push('/pricing')
            }
          ]
        })
        return
      }
      
      // 사용자 등급에 따른 분석 옵션 설정
      const userTier = await userTierService.getUserTier(session.user.id)
      const canUseVBA = await userTierService.canUseFeature(session.user.id, 'vbaAnalysis')
      const canUsePerformance = await userTierService.canUseFeature(session.user.id, 'performanceOptimization')
      
      // 토큰 확인
      const tokenService = TokenService.getInstance()
      const analysisOptions = {
        includeVBA: canUseVBA,
        includePerformance: canUsePerformance
      }
      
      // 등급별 비용 계산
      const tierCost = userTierService.getTokenCost(
        userTier, 
        analysisOptions.includeVBA && analysisOptions.includePerformance 
          ? 'FILE_ANALYSIS_ADVANCED' 
          : 'FILE_ANALYSIS_BASIC'
      )
      
      // 무료 사용자가 고급 기능을 사용하려는 경우
      if (tierCost === null) {
        setError({
          title: '기능 제한',
          message: userTierService.getFeatureRestrictionMessage('advancedAnalysis', userTier),
          code: 'FEATURE_RESTRICTED',
          actions: [
            {
              label: '업그레이드하기',
              action: () => router.push('/pricing')
            }
          ]
        })
        return
      }
      
      const cost = tierCost
      
      if (!tokenService.canAfford(cost)) {
        const neededTokens = tokenService.getTokensNeeded(cost)
        setError({
          title: '토큰이 부족합니다',
          message: `분석에 ${cost} 토큰이 필요하지만 ${tokenService.getBalance()} 토큰만 보유하고 있습니다.`,
          code: 'INSUFFICIENT_TOKENS',
          actions: [
            {
              label: '토큰 구매하기',
              action: () => router.push('/pricing')
            }
          ]
        })
        return
      }
      
      setAnalyzing(true)
      
      // Create file record
      const fileData = {
        id: `file-${Date.now()}`,
        name: file.name,
        size: file.size,
        uploadedAt: new Date(),
        status: 'analyzing' as const
      }
      
      setCurrentFile(fileData)
      setCurrentFileId(fileData.id)
      resetProgress()
      
      // 토큰 차감
      const tokenUsed = await tokenService.useTokens(cost, `Excel 파일 분석: ${file.name}`)
      if (!tokenUsed) {
        throw new Error('토큰 차감 실패')
      }
      
      // Analyze file
      const results = await analysisService.analyzeFile(fileData.id, analysisOptions)
      
      setAnalysisResults(results)
      
      // Update file status
      setCurrentFile({
        ...fileData,
        status: 'completed'
      })
      
      toast({
        title: '분석 완료',
        description: `${results.length}개의 문제를 발견했습니다. (${cost} 토큰 사용)`
      })
    } catch (err) {
      const errorDetails = getErrorMessage(err)
      setError({
        ...errorDetails,
        actions: [
          {
            label: '다시 시도',
            action: () => handleFileUpload(file)
          }
        ]
      })
    } finally {
      setAnalyzing(false)
    }
  }
  
  // Apply selected fixes
  const handleApplyFixes = async () => {
    if (!currentFile || selectedFixes.size === 0) return
    
    try {
      if (!session?.user?.id) {
        throw new Error('로그인이 필요합니다.')
      }
      
      // 자동 수정 기능 사용 가능 여부 확인
      const canAutoFix = await userTierService.canUseFeature(session.user.id, 'autoFixEnabled')
      if (!canAutoFix) {
        const userTier = await userTierService.getUserTier(session.user.id)
        setError({
          title: '기능 제한',
          message: '자동 수정 기능은 베이직 이상 등급에서 사용 가능합니다.',
          code: 'FEATURE_RESTRICTED',
          actions: [
            {
              label: '업그레이드하기',
              action: () => router.push('/pricing')
            }
          ]
        })
        return
      }
      
      // 토큰 확인
      const tokenService = TokenService.getInstance()
      const userTier = await userTierService.getUserTier(session.user.id)
      const tierCost = userTierService.getTokenCost(userTier, 'AUTO_FIX_PER_ERROR')
      
      if (tierCost === null) {
        throw new Error('자동 수정 기능을 사용할 수 없습니다.')
      }
      
      const cost = selectedFixes.size * tierCost
      
      if (!tokenService.canAfford(cost)) {
        toast({
          title: '토큰 부족',
          description: `수정에 ${cost} 토큰이 필요합니다. 현재 잔액: ${tokenService.getBalance()} 토큰`,
          variant: 'destructive'
        })
        return
      }
      
      setAnalyzing(true)
      
      // 토큰 차감
      const tokenUsed = await tokenService.useTokens(cost, `${selectedFixes.size}개 오류 자동 수정`)
      if (!tokenUsed) {
        throw new Error('토큰 차감 실패')
      }
      
      const fixIds = Array.from(selectedFixes)
      const result = await correctionService.applyFixes(currentFile.id, fixIds)
      
      if (result.success) {
        toast({
          title: '수정 완료',
          description: `${result.appliedFixes.length}개의 오류가 수정되었습니다. (${cost} 토큰 사용)`
        })
        
        // Refresh analysis
        await handleRefreshAnalysis()
      } else {
        throw new Error('일부 수정 사항 적용에 실패했습니다')
      }
    } catch (err) {
      toast({
        title: '수정 실패',
        description: err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    } finally {
      setAnalyzing(false)
    }
  }
  
  // Refresh analysis
  const handleRefreshAnalysis = async () => {
    if (!currentFile) return
    
    try {
      setAnalyzing(true)
      const results = await analysisService.analyzeFile(currentFile.id)
      setAnalysisResults(results)
    } catch (err) {
      toast({
        title: '새로고침 실패',
        description: '분석을 다시 실행할 수 없습니다.',
        variant: 'destructive'
      })
    } finally {
      setAnalyzing(false)
    }
  }
  
  // Download file
  const handleDownload = async () => {
    if (!currentFile) return
    
    try {
      toast({
        title: '다운로드 시작',
        description: '파일을 다운로드하고 있습니다...'
      })
      
      // 파일 다운로드 API 호출
      const response = await fetch(`/api/download/${currentFile.id}`, {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error('다운로드 실패')
      }
      
      // Blob으로 변환
      const blob = await response.blob()
      
      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `corrected_${currentFile.name}`
      document.body.appendChild(a)
      a.click()
      
      // 정리
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: '다운로드 완료',
        description: '수정된 파일이 다운로드되었습니다.'
      })
    } catch (err) {
      toast({
        title: '다운로드 실패',
        description: '파일 다운로드 중 오류가 발생했습니다.',
        variant: 'destructive'
      })
    }
  }
  
  // Get stats
  const errorCount = analysisResults.filter(r => r.type === 'error').length
  const warningCount = analysisResults.filter(r => r.type === 'warning').length
  const optimizationCount = analysisResults.filter(r => r.type === 'optimization').length
  const vbaCount = analysisResults.filter(r => r.type === 'vba').length
  
  return (
    <>
      {showOnboarding && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">통합 분석 센터</h1>
          <p className="text-gray-600 mt-2">
            Excel 파일의 오류를 분석하고 수정하며, 성능을 최적화합니다
          </p>
        </div>
        
        {/* 에러 메시지 */}
        {errorInfo && (
          <div className="mb-6">
            <ErrorMessage
              title={errorInfo.title}
              message={errorInfo.message}
              severity={errorInfo.severity}
              code={errorInfo.code}
              details={errorInfo.details}
              actions={errorInfo.actions}
              onDismiss={() => setError(null)}
            />
          </div>
        )}
      
      {!currentFile ? (
        <FileUploadZone onUpload={handleFileUpload} />
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - File Info & Results Summary */}
          <div className="col-span-3">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  파일 정보
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">파일명:</span>
                    <p className="font-medium truncate">{currentFile.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">크기:</span>
                    <p className="font-medium">{(currentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">상태:</span>
                    <Badge variant={currentFile.status === 'completed' ? 'success' : 'secondary'}>
                      {currentFile.status === 'completed' ? '분석 완료' : '분석 중'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>분석 요약</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">오류</span>
                    </div>
                    <Badge variant="destructive">{errorCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">경고</span>
                    </div>
                    <Badge variant="warning">{warningCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">최적화</span>
                    </div>
                    <Badge variant="secondary">{optimizationCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">VBA</span>
                    </div>
                    <Badge variant="outline">{vbaCount}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-2">
              <Button 
                onClick={handleApplyFixes} 
                className="w-full"
                disabled={selectedFixes.size === 0 || isAnalyzing}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                선택 항목 수정 ({selectedFixes.size})
              </Button>
              <Button 
                onClick={handleDownload}
                variant="outline" 
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                파일 다운로드
              </Button>
              <Button 
                onClick={handleRefreshAnalysis}
                variant="ghost" 
                className="w-full"
                disabled={isAnalyzing}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                분석 새로고침
              </Button>
            </div>
          </div>
          
          {/* Center Panel - Main Content */}
          <div className="col-span-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="errors">오류 수정</TabsTrigger>
                <TabsTrigger value="performance">성능 최적화</TabsTrigger>
                <TabsTrigger value="vba">VBA 분석</TabsTrigger>
                <TabsTrigger value="chat">AI 상담</TabsTrigger>
              </TabsList>
              
              <TabsContent value="errors" className="mt-4">
                {isAnalyzing ? (
                  <AnalysisResultsSkeleton />
                ) : (
                  <AnalysisResultsList 
                    results={analysisResults.filter(r => r.type === 'error' || r.type === 'warning')}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="performance" className="mt-4">
                <PerformanceAnalyzer 
                  results={analysisResults.filter(r => r.type === 'optimization')}
                />
              </TabsContent>
              
              <TabsContent value="vba" className="mt-4">
                <VBAAnalyzer 
                  results={analysisResults.filter(r => r.type === 'vba')}
                />
              </TabsContent>
              
              <TabsContent value="chat" className="mt-4">
                <FileContextChat fileId={currentFile.id} />
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right Panel - Progress & Version History */}
          <div className="col-span-3">
            {isAnalyzing && (
              <div className="mb-4">
                <AnalysisProgress 
                  stages={stages}
                  totalProgress={totalProgress}
                  currentMessage={currentMessage}
                />
              </div>
            )}
            
            {/* 리포트 생성 */}
            {analysisResults.length > 0 && (
              <div className="mb-4">
                <ReportGenerator 
                  fileId={currentFile.id}
                  fileName={currentFile.name}
                  fileSize={currentFile.size}
                />
              </div>
            )}
            
            <VersionHistory fileId={currentFile.id} />
          </div>
        </div>
      )}
      </div>
    </>
  )
}