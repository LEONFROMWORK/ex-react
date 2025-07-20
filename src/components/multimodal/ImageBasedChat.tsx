/**
 * 이미지 기반 채팅 UI 컴포넌트
 * SOLID 원칙 적용: Single Responsibility + Open/Closed Principle
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { 
  Image as ImageIcon,
  Upload,
  X,
  Send,
  Loader2,
  Eye,
  FileImage,
  Zap,
  Bot,
  User,
  Lightbulb,
  Clock,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Camera,
  Maximize2,
  Download,
  Share2
} from 'lucide-react'

// === INTERFACES (Interface Segregation Principle) ===
interface ImageAttachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  base64Data: string
  description?: string
  uploadedAt: Date
  preview: string
}

interface AnalysisResult {
  success: boolean
  analysis: MultimodalAnalysis
  suggestions: ImplementationSuggestion[]
  estimatedComplexity: ComplexityAssessment
  followUpQuestions: string[]
  confidenceScore: number
  processingTime: number
  costIncurred: number
}

interface MultimodalAnalysis {
  imageAnalysis: ImageAnalysisResult[]
  contextualUnderstanding: string
  technicalInterpretation: string
  implementationPlan: string
  potentialChallenges: string[]
  estimatedTimeframe: string
}

interface ImageAnalysisResult {
  imageId: string
  detectedElements: DetectedElement[]
  identifiedPatterns: IdentifiedPattern[]
  technicalRequirements: string[]
  confidenceScore: number
}

interface DetectedElement {
  type: 'chart' | 'table' | 'form' | 'diagram' | 'ui_mockup' | 'workflow' | 'other'
  description: string
  confidence: number
  relatedExcelFeatures: string[]
}

interface IdentifiedPattern {
  patternType: 'data_structure' | 'calculation_flow' | 'ui_layout' | 'business_logic'
  description: string
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert'
  implementationApproach: string[]
}

interface ImplementationSuggestion {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedEffort: string
  requiredSkills: string[]
  excelFeatures: string[]
  stepByStepGuide: ImplementationStep[]
}

interface ImplementationStep {
  stepNumber: number
  title: string
  description: string
  excelAction: string
  expectedResult: string
  troubleshootingTips: string[]
}

interface ComplexityAssessment {
  overallComplexity: 'simple' | 'moderate' | 'complex' | 'expert'
  timeEstimate: {
    minimum: number
    maximum: number
    realistic: number
  }
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  requiredKnowledge: string[]
  potentialRisks: string[]
}

interface ImageBasedChatProps {
  fileId?: string
  onAnalysisComplete?: (result: AnalysisResult) => void
  onAnalysisError?: (error: string) => void
}

// === MAIN COMPONENT (Single Responsibility Principle) ===
export function ImageBasedChat({
  fileId = 'standalone-mode',
  onAnalysisComplete = () => {},
  onAnalysisError = () => {}
}: ImageBasedChatProps = {}) {
  // State Management
  const [images, setImages] = useState<ImageAttachment[]>([])
  const [textDescription, setTextDescription] = useState('')
  const [analysisType, setAnalysisType] = useState<string>('functionality')
  const [responsePreference, setResponsePreference] = useState<string>('detailed')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Constants
  const MAX_IMAGES = 5
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
  const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  // Dropzone Configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: MAX_IMAGE_SIZE,
    maxFiles: MAX_IMAGES - images.length,
    onDrop: handleImageDrop,
    onDropRejected: handleDropRejected
  })

  // Image Upload Handlers
  function handleImageDrop(acceptedFiles: File[]) {
    acceptedFiles.forEach(file => {
      if (images.length >= MAX_IMAGES) {
        toast({
          title: '업로드 제한',
          description: `최대 ${MAX_IMAGES}개까지 이미지를 업로드할 수 있습니다.`,
          variant: 'destructive'
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const base64Data = e.target?.result as string
        const newImage: ImageAttachment = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          base64Data,
          uploadedAt: new Date(),
          preview: base64Data
        }
        
        setImages(prev => [...prev, newImage])
        
        toast({
          title: '이미지 업로드 완료',
          description: `${file.name}이 업로드되었습니다.`
        })
      }
      
      reader.onerror = () => {
        toast({
          title: '업로드 실패',
          description: `${file.name} 업로드 중 오류가 발생했습니다.`,
          variant: 'destructive'
        })
      }
      
      reader.readAsDataURL(file)
    })
  }

  function handleDropRejected(rejectedFiles: any[]) {
    rejectedFiles.forEach(({ file, errors }) => {
      const error = errors[0]
      let message = `${file.name} 업로드 실패: `
      
      switch (error.code) {
        case 'file-too-large':
          message += `파일 크기가 ${MAX_IMAGE_SIZE / 1024 / 1024}MB를 초과합니다.`
          break
        case 'file-invalid-type':
          message += '지원되지 않는 파일 형식입니다.'
          break
        default:
          message += error.message
      }
      
      toast({
        title: '업로드 실패',
        description: message,
        variant: 'destructive'
      })
    })
  }

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId))
    toast({
      title: '이미지 제거',
      description: '이미지가 제거되었습니다.'
    })
  }, [toast])

  const updateImageDescription = useCallback((imageId: string, description: string) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, description } : img
    ))
  }, [])

  // Analysis Process
  const startAnalysis = useCallback(async () => {
    if (images.length === 0) {
      toast({
        title: '이미지 필요',
        description: '분석할 이미지를 업로드해주세요.',
        variant: 'destructive'
      })
      return
    }

    if (!textDescription.trim()) {
      toast({
        title: '설명 필요',
        description: '이미지에 대한 설명을 입력해주세요.',
        variant: 'destructive'
      })
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setCurrentStep('이미지 전처리 중...')

    try {
      // Simulate analysis steps
      const steps = [
        { message: '이미지 전처리 중...', progress: 10 },
        { message: 'Vision AI 분석 시작...', progress: 25 },
        { message: '시각적 요소 감지 중...', progress: 40 },
        { message: '파일 컨텍스트 분석...', progress: 55 },
        { message: '구현 계획 생성...', progress: 70 },
        { message: 'RAG 지식 베이스 검색...', progress: 85 },
        { message: '최종 분석 완료...', progress: 100 }
      ]

      for (const step of steps) {
        setCurrentStep(step.message)
        setAnalysisProgress(step.progress)
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      // Mock analysis result
      const mockResult: AnalysisResult = generateMockAnalysisResult(images, textDescription, analysisType)
      
      setAnalysisResult(mockResult)
      
      // Add to chat messages
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'user',
        content: textDescription,
        images: images.map(img => img.preview),
        timestamp: new Date()
      }
      
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        type: 'assistant',
        content: mockResult.analysis.contextualUnderstanding,
        analysisResult: mockResult,
        timestamp: new Date()
      }
      
      setChatMessages(prev => [...prev, userMessage, assistantMessage])
      
      if (onAnalysisComplete) {
        onAnalysisComplete(mockResult)
      }

      toast({
        title: '분석 완료',
        description: `${images.length}개 이미지 분석이 완료되었습니다.`
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
      
      if (onAnalysisError) {
        onAnalysisError(errorMessage)
      }
      
      toast({
        title: '분석 실패',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [images, textDescription, analysisType, onAnalysisComplete, onAnalysisError, toast])

  const resetAnalysis = useCallback(() => {
    setImages([])
    setTextDescription('')
    setAnalysisResult(null)
    setAnalysisProgress(0)
    setCurrentStep('')
    setChatMessages([])
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-purple-500" />
            이미지 기반 Excel 상담
          </CardTitle>
          <CardDescription>
            그림이나 다이어그램을 업로드하여 Excel 구현 방법을 상담받으세요
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">이미지 업로드</TabsTrigger>
          <TabsTrigger value="chat">AI 상담</TabsTrigger>
          <TabsTrigger value="result">분석 결과</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          {/* Image Upload Zone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>이미지 업로드 ({images.length}/{MAX_IMAGES})</span>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  파일 선택
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {images.length < MAX_IMAGES && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                  }`}
                >
                  <input {...getInputProps()} ref={fileInputRef} />
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? '이미지를 여기에 놓으세요' : '이미지를 드래그하거나 클릭하여 업로드'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    JPEG, PNG, GIF, WebP 지원 (최대 {MAX_IMAGE_SIZE / 1024 / 1024}MB, {MAX_IMAGES}개까지)
                  </p>
                </div>
              )}

              {images.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">업로드된 이미지</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <ImagePreviewCard
                        key={image.id}
                        image={image}
                        onRemove={removeImage}
                        onUpdateDescription={updateImageDescription}
                        onView={() => setSelectedImageIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description and Options */}
          <Card>
            <CardHeader>
              <CardTitle>설명 및 분석 옵션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  이미지에 대한 설명을 입력하세요 *
                </label>
                <Textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="예: 이 다이어그램과 같은 매출 분석 대시보드를 Excel로 만들고 싶습니다. 차트와 표가 있고, 월별 데이터를 자동으로 업데이트되도록 하고 싶어요."
                  className="min-h-24"
                  disabled={isAnalyzing}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">분석 유형</label>
                  <Select value={analysisType} onValueChange={setAnalysisType} disabled={isAnalyzing}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="structure">데이터 구조 분석</SelectItem>
                      <SelectItem value="functionality">기능 구현 방법</SelectItem>
                      <SelectItem value="improvement">개선 및 최적화</SelectItem>
                      <SelectItem value="troubleshooting">문제 해결</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">응답 스타일</label>
                  <Select value={responsePreference} onValueChange={setResponsePreference} disabled={isAnalyzing}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">간결한 답변</SelectItem>
                      <SelectItem value="detailed">상세한 설명</SelectItem>
                      <SelectItem value="step-by-step">단계별 가이드</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Indicator */}
          {(isAnalyzing || analysisProgress > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  분석 진행 중
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={analysisProgress} className="h-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span>{currentStep}</span>
                    <span>{analysisProgress}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {images.length}개 이미지 · 예상 비용: ${(images.length * 0.15).toFixed(2)}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetAnalysis} disabled={isAnalyzing}>
                    초기화
                  </Button>
                  <Button 
                    onClick={startAnalysis} 
                    disabled={images.length === 0 || !textDescription.trim() || isAnalyzing}
                    className="min-w-32"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        AI 분석 시작
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI 상담 대화
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                {chatMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <div>
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>이미지를 업로드하고 분석을 시작하면</p>
                      <p>AI와 대화할 수 있습니다.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((message) => (
                      <ChatMessageComponent key={message.id} message={message} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Result Tab */}
        <TabsContent value="result">
          <Card>
            <CardHeader>
              <CardTitle>분석 결과</CardTitle>
            </CardHeader>
            <CardContent>
              {analysisResult ? (
                <AnalysisResultPanel result={analysisResult} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>아직 분석이 실행되지 않았습니다.</p>
                  <p>이미지를 업로드하고 분석을 시작해주세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Viewer Modal */}
      {selectedImageIndex !== null && (
        <ImageViewerModal
          images={images}
          selectedIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
          onNext={() => setSelectedImageIndex((selectedImageIndex + 1) % images.length)}
          onPrevious={() => setSelectedImageIndex(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1)}
        />
      )}
    </div>
  )
}

// === SUPPORTING COMPONENTS (Single Responsibility Principle) ===

interface ImagePreviewCardProps {
  image: ImageAttachment
  onRemove: (imageId: string) => void
  onUpdateDescription: (imageId: string, description: string) => void
  onView: () => void
}

function ImagePreviewCard({ image, onRemove, onUpdateDescription, onView }: ImagePreviewCardProps) {
  const [description, setDescription] = useState(image.description || '')

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="relative group">
        <img
          src={image.preview}
          alt={image.fileName}
          className="w-full h-32 object-cover rounded cursor-pointer"
          onClick={onView}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded flex items-center justify-center">
          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 text-white hover:text-white"
            onClick={onView}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="absolute top-2 right-2"
          onClick={() => onRemove(image.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileImage className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{image.fileName}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {(image.fileSize / 1024).toFixed(1)} KB
        </p>
      </div>

      <div>
        <Input
          placeholder="이미지 설명 (선택사항)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => onUpdateDescription(image.id, description)}
          className="text-sm"
        />
      </div>
    </div>
  )
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  images?: string[]
  analysisResult?: AnalysisResult
  timestamp: Date
}

interface ChatMessageComponentProps {
  message: ChatMessage
}

function ChatMessageComponent({ message }: ChatMessageComponentProps) {
  return (
    <div className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full ${
          message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}>
          {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        
        <div className="space-y-2">
          <div className={`rounded-lg px-4 py-2 ${
            message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {message.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Uploaded image ${index + 1}`}
                  className="w-16 h-16 object-cover rounded"
                />
              ))}
            </div>
          )}
          
          {message.analysisResult && (
            <div className="space-y-2">
              <Badge variant="secondary">
                분석 완료 · 신뢰도 {(message.analysisResult.confidenceScore * 100).toFixed(0)}%
              </Badge>
              <div className="text-xs text-muted-foreground">
                처리 시간: {message.analysisResult.processingTime}ms · 
                비용: ${message.analysisResult.costIncurred.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface AnalysisResultPanelProps {
  result: AnalysisResult
}

function AnalysisResultPanel({ result }: AnalysisResultPanelProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">
            {(result.confidenceScore * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-muted-foreground">분석 신뢰도</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {result.suggestions.length}
          </div>
          <div className="text-sm text-muted-foreground">구현 제안</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-500">
            {result.estimatedComplexity.timeEstimate.realistic}h
          </div>
          <div className="text-sm text-muted-foreground">예상 소요시간</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">
            ${result.costIncurred.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">분석 비용</div>
        </div>
      </div>

      {/* Analysis Details */}
      <Tabs defaultValue="understanding">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="understanding">이해도 분석</TabsTrigger>
          <TabsTrigger value="suggestions">구현 제안</TabsTrigger>
          <TabsTrigger value="complexity">복잡도 평가</TabsTrigger>
          <TabsTrigger value="questions">후속 질문</TabsTrigger>
        </TabsList>

        <TabsContent value="understanding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>컨텍스트 이해</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.analysis.contextualUnderstanding}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>기술적 해석</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.analysis.technicalInterpretation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>구현 계획</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.analysis.implementationPlan}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {result.suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.id} suggestion={suggestion} />
          ))}
        </TabsContent>

        <TabsContent value="complexity" className="space-y-4">
          <ComplexityPanel complexity={result.estimatedComplexity} />
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>추가 질문</CardTitle>
              <CardDescription>
                더 정확한 구현 가이드를 위한 후속 질문들입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.followUpQuestions.map((question, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <p className="text-sm">{question}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface SuggestionCardProps {
  suggestion: ImplementationSuggestion
}

function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{suggestion.title}</CardTitle>
          <Badge variant={getPriorityColor(suggestion.priority)}>
            {suggestion.priority} 우선순위
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium mb-2">예상 소요시간</h5>
            <p className="text-sm text-muted-foreground">{suggestion.estimatedEffort}</p>
          </div>
          <div>
            <h5 className="font-medium mb-2">필요 기술</h5>
            <div className="flex flex-wrap gap-1">
              {suggestion.requiredSkills.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h5 className="font-medium mb-2">사용할 Excel 기능</h5>
          <div className="flex flex-wrap gap-1">
            {suggestion.excelFeatures.map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h5 className="font-medium mb-2">단계별 가이드</h5>
          <div className="space-y-2">
            {suggestion.stepByStepGuide.slice(0, 3).map((step) => (
              <div key={step.stepNumber} className="flex gap-2 text-sm">
                <span className="font-medium text-primary">{step.stepNumber}.</span>
                <span>{step.title}</span>
              </div>
            ))}
            {suggestion.stepByStepGuide.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{suggestion.stepByStepGuide.length - 3}개 단계 더...
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ComplexityPanelProps {
  complexity: ComplexityAssessment
}

function ComplexityPanel({ complexity }: ComplexityPanelProps) {
  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'simple': return 'text-green-500'
      case 'moderate': return 'text-yellow-500'
      case 'complex': return 'text-orange-500'
      case 'expert': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>전체 복잡도 평가</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getComplexityColor(complexity.overallComplexity)}`}>
              {complexity.overallComplexity.toUpperCase()}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {complexity.skillLevel} 수준 필요
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>시간 추정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">최소 시간:</span>
              <span className="font-medium">{complexity.timeEstimate.minimum}시간</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">현실적 시간:</span>
              <span className="font-medium">{complexity.timeEstimate.realistic}시간</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">최대 시간:</span>
              <span className="font-medium">{complexity.timeEstimate.maximum}시간</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>필요 지식</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {complexity.requiredKnowledge.map((knowledge, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">{knowledge}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {complexity.potentialRisks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              잠재적 위험 요소
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {complexity.potentialRisks.map((risk, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <span className="text-sm">{risk}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface ImageViewerModalProps {
  images: ImageAttachment[]
  selectedIndex: number
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
}

function ImageViewerModal({ images, selectedIndex, onClose, onNext, onPrevious }: ImageViewerModalProps) {
  const currentImage = images[selectedIndex]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          onPrevious()
          break
        case 'ArrowRight':
          onNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrevious])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="max-w-4xl max-h-4xl p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-medium">{currentImage.fileName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectedIndex + 1} / {images.length}
              </Badge>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <img
              src={currentImage.preview}
              alt={currentImage.fileName}
              className="max-w-full max-h-[70vh] object-contain mx-auto"
            />
            
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2"
                  onClick={onPrevious}
                >
                  ←
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={onNext}
                >
                  →
                </Button>
              </>
            )}
          </div>
          
          <div className="p-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{(currentImage.fileSize / 1024).toFixed(1)} KB</span>
              <span>{currentImage.uploadedAt.toLocaleString()}</span>
            </div>
            {currentImage.description && (
              <p className="mt-2 text-sm">{currentImage.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// === MOCK DATA GENERATOR ===
function generateMockAnalysisResult(
  images: ImageAttachment[],
  description: string,
  analysisType: string
): AnalysisResult {
  return {
    success: true,
    analysis: {
      imageAnalysis: images.map(img => ({
        imageId: img.id,
        detectedElements: [
          {
            type: 'chart',
            description: '막대 차트와 선 그래프가 결합된 형태',
            confidence: 0.92,
            relatedExcelFeatures: ['Chart', 'Combo Chart', 'Data Series']
          },
          {
            type: 'table',
            description: '월별 데이터를 보여주는 표 구조',
            confidence: 0.88,
            relatedExcelFeatures: ['Table', 'PivotTable', 'Conditional Formatting']
          }
        ],
        identifiedPatterns: [
          {
            patternType: 'data_structure',
            description: '시계열 데이터 기반 대시보드',
            complexityLevel: 'moderate',
            implementationApproach: ['PivotTable 활용', '동적 차트 생성', '자동 업데이트 설정']
          }
        ],
        technicalRequirements: ['Excel 2016 이상', 'VBA 기본 지식', '데이터 연결 이해'],
        confidenceScore: 0.90
      })),
      contextualUnderstanding: `이미지를 분석한 결과, ${description}에서 요청하신 것은 동적 매출 분석 대시보드입니다. 월별 데이터가 자동으로 업데이트되는 차트와 표가 포함된 대화형 보고서를 원하시는 것으로 보입니다.`,
      technicalInterpretation: '이 구현에는 Excel의 PivotTable, 동적 차트, 조건부 서식, 그리고 데이터 연결 기능이 필요합니다. VBA 매크로를 사용하면 자동 업데이트 기능을 구현할 수 있습니다.',
      implementationPlan: '1단계: 데이터 구조 설계, 2단계: PivotTable 생성, 3단계: 동적 차트 구성, 4단계: 자동 업데이트 매크로 작성, 5단계: 사용자 인터페이스 완성',
      potentialChallenges: ['데이터 형식 일관성 유지', 'VBA 보안 설정', '대용량 데이터 처리 성능'],
      estimatedTimeframe: '초급자 기준 8-12시간, 중급자 기준 4-6시간'
    },
    suggestions: [
      {
        id: 'suggestion-1',
        title: 'PivotTable 기반 동적 대시보드',
        description: 'PivotTable과 PivotChart를 활용하여 자동으로 업데이트되는 대시보드를 구축합니다.',
        priority: 'high',
        estimatedEffort: '4-6시간',
        requiredSkills: ['PivotTable', 'Chart', 'Basic VBA'],
        excelFeatures: ['PivotTable', 'PivotChart', 'Slicer', 'Timeline'],
        stepByStepGuide: [
          {
            stepNumber: 1,
            title: '데이터 소스 준비',
            description: '월별 매출 데이터를 정리하고 Table 형식으로 구성',
            excelAction: '데이터 > 표로 서식 지정',
            expectedResult: '구조화된 데이터 테이블 생성',
            troubleshootingTips: ['열 제목이 명확해야 함', '데이터 형식 일관성 확인']
          },
          {
            stepNumber: 2,
            title: 'PivotTable 생성',
            description: '매출 데이터 기반 PivotTable 생성',
            excelAction: '삽입 > PivotTable',
            expectedResult: '월별 매출 요약 테이블',
            troubleshootingTips: ['데이터 영역 올바르게 선택', '필드 배치 확인']
          },
          {
            stepNumber: 3,
            title: '동적 차트 추가',
            description: 'PivotTable 기반 차트 생성',
            excelAction: 'PivotTable 도구 > PivotChart',
            expectedResult: '자동 업데이트되는 차트',
            troubleshootingTips: ['차트 유형 선택 주의', '축 설정 확인']
          }
        ]
      }
    ],
    estimatedComplexity: {
      overallComplexity: 'moderate',
      timeEstimate: {
        minimum: 4,
        maximum: 12,
        realistic: 6
      },
      skillLevel: 'intermediate',
      requiredKnowledge: ['Excel 기본 기능', 'PivotTable', 'Chart 기능', 'VBA 기초'],
      potentialRisks: ['데이터 형식 불일치', 'VBA 보안 제한', '파일 크기 증가']
    },
    followUpQuestions: [
      '어떤 형태의 데이터 소스를 사용하실 예정인가요? (Excel 파일, 데이터베이스, 웹 데이터 등)',
      '차트에서 가장 중요하게 보고 싶은 지표는 무엇인가요?',
      '자동 업데이트는 얼마나 자주 필요하신가요? (일별, 주별, 월별)',
      'VBA 매크로 사용에 제한이 있나요? (보안 정책 등)'
    ],
    confidenceScore: 0.90,
    processingTime: 8500,
    costIncurred: images.length * 0.15
  }
}