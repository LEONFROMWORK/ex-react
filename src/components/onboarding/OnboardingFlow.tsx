'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  FileSpreadsheet, 
  Upload, 
  Zap, 
  MessageSquare, 
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  content: React.ReactNode
}

export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false)
  
  useEffect(() => {
    const seen = localStorage.getItem('hasSeenOnboarding')
    if (seen === 'true') {
      setHasSeenOnboarding(true)
      onComplete()
    }
  }, [onComplete])
  
  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Exhell에 오신 것을 환영합니다!',
      description: 'Excel 파일의 모든 문제를 AI가 자동으로 해결합니다',
      icon: <FileSpreadsheet className="h-12 w-12" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-2">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-sm font-medium">오류 감지</p>
              <p className="text-xs text-muted-foreground">자동으로 오류 발견</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm font-medium">즉시 수정</p>
              <p className="text-xs text-muted-foreground">원클릭 자동 수정</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm font-medium">성능 최적화</p>
              <p className="text-xs text-muted-foreground">더 빠른 Excel 파일</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'upload',
      title: '간단한 파일 업로드',
      description: '드래그 앤 드롭으로 쉽게 시작하세요',
      icon: <Upload className="h-12 w-12" />,
      content: (
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/50">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium">여기에 Excel 파일을 드래그하세요</p>
            <p className="text-sm text-muted-foreground mt-1">또는 클릭하여 선택</p>
          </div>
          <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <span>✓ XLS</span>
            <span>✓ XLSX</span>
            <span>✓ CSV</span>
            <span>✓ XLSM</span>
          </div>
        </div>
      )
    },
    {
      id: 'ai-assistant',
      title: 'AI 도우미와 대화',
      description: 'Excel에 대한 모든 질문에 답해드립니다',
      icon: <MessageSquare className="h-12 w-12" />,
      content: (
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <div className="flex gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm">VLOOKUP이 너무 느려요. 어떻게 개선할 수 있나요?</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm">INDEX/MATCH를 사용하면 VLOOKUP보다 40% 빠른 성능을 얻을 수 있습니다. 자동으로 변환해드릴까요?</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            24시간 언제든지 Excel 전문가의 도움을 받으세요
          </p>
        </div>
      )
    },
    {
      id: 'ready',
      title: '준비 완료!',
      description: '지금 바로 시작해보세요',
      icon: <CheckCircle className="h-12 w-12 text-green-600" />,
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-lg font-medium mb-2">모든 준비가 완료되었습니다!</p>
            <p className="text-sm text-muted-foreground">
              회원가입 보너스로 100개의 무료 토큰을 받으셨습니다
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <p className="text-sm text-center">
              💡 <strong>Pro Tip:</strong> 첫 파일 분석은 무료입니다!
            </p>
          </div>
        </div>
      )
    }
  ]
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      localStorage.setItem('hasSeenOnboarding', 'true')
      onComplete()
    }
  }
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    onComplete()
  }
  
  if (hasSeenOnboarding) {
    return null
  }
  
  const progress = ((currentStep + 1) / steps.length) * 100
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {steps[currentStep].icon}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              건너뛰기
            </Button>
          </div>
          <Progress value={progress} className="h-2 mb-4" />
          <CardTitle>{steps[currentStep].title}</CardTitle>
          <CardDescription>{steps[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              이전
            </Button>
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-primary'
                      : index < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? '시작하기' : '다음'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Import needed icons
import { User, Bot, AlertCircle } from 'lucide-react'