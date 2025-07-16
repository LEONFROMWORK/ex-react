'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Settings, 
  ChevronDown, 
  Loader2, 
  FileSpreadsheet,
  Info,
  Zap,
  Shield,
  BarChart
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface GenerationOptions {
  includeFormulas: boolean
  includeFormatting: boolean
  includeCharts: boolean
  maxRows: number
  maxColumns: number
}

export function GenerateFromPromptPanel() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [options, setOptions] = useState<GenerationOptions>({
    includeFormulas: true,
    includeFormatting: true,
    includeCharts: false,
    maxRows: 1000,
    maxColumns: 50,
  })

  const examplePrompts = [
    {
      title: '월간 매출 보고서',
      prompt: '2024년 월별 매출 데이터와 성장률을 보여주는 Excel 파일을 만들어주세요. 차트와 전년 대비 분석도 포함해주세요.',
      icon: <BarChart className="w-4 h-4" />,
    },
    {
      title: '프로젝트 일정표',
      prompt: '10개 작업의 프로젝트 일정 관리 Excel을 만들어주세요. 시작일, 종료일, 담당자, 진행률을 포함하고 간트 차트 형식으로 표시해주세요.',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      title: '재고 관리 시스템',
      prompt: '제품 재고 관리를 위한 Excel 파일을 만들어주세요. 제품명, 현재고, 최소재고, 재주문량, 공급업체 정보를 포함해주세요.',
      icon: <Shield className="w-4 h-4" />,
    },
  ]

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('프롬프트를 입력해주세요')
      return
    }

    setIsGenerating(true)
    try {
      // API 호출
      const response = await fetch('/api/excel/generate-from-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          options,
        }),
      })

      if (!response.ok) throw new Error('생성 실패')

      const result = await response.json()
      
      toast.success('Excel 파일이 성공적으로 생성되었습니다!', {
        action: {
          label: '다운로드',
          onClick: () => window.open(result.downloadUrl, '_blank'),
        },
      })

      // 프롬프트 초기화
      setPrompt('')
    } catch (error) {
      toast.error('Excel 생성 중 오류가 발생했습니다')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt)
    toast.info('예시 프롬프트가 입력되었습니다')
  }

  return (
    <div className="space-y-6">
      {/* Prompt Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-base font-semibold">
            어떤 Excel 파일을 만들고 싶으신가요?
          </Label>
          <Textarea
            id="prompt"
            placeholder="예: 2024년 분기별 매출 분석 보고서를 만들어주세요. 매출, 비용, 이익률을 포함하고 차트도 추가해주세요."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={isGenerating}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>구체적으로 설명할수록 더 정확한 결과를 얻을 수 있습니다</span>
          </div>
        </div>

        {/* Example Prompts */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">예시 프롬프트</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {examplePrompts.map((example, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleExampleClick(example.prompt)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {example.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">{example.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {example.prompt}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              고급 옵션
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Features */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">포함할 기능</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="formulas" className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      수식 및 함수
                    </Label>
                    <Switch
                      id="formulas"
                      checked={options.includeFormulas}
                      onCheckedChange={(checked) => 
                        setOptions({ ...options, includeFormulas: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="formatting" className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      서식 및 스타일
                    </Label>
                    <Switch
                      id="formatting"
                      checked={options.includeFormatting}
                      onCheckedChange={(checked) => 
                        setOptions({ ...options, includeFormatting: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="charts" className="flex items-center gap-2">
                      <BarChart className="w-4 h-4 text-blue-600" />
                      차트 및 그래프
                    </Label>
                    <Switch
                      id="charts"
                      checked={options.includeCharts}
                      onCheckedChange={(checked) => 
                        setOptions({ ...options, includeCharts: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Size Limits */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">크기 제한</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maxRows">최대 행 수</Label>
                      <span className="text-sm text-muted-foreground">
                        {options.maxRows.toLocaleString()}행
                      </span>
                    </div>
                    <Slider
                      id="maxRows"
                      min={100}
                      max={10000}
                      step={100}
                      value={[options.maxRows]}
                      onValueChange={([value]) => 
                        setOptions({ ...options, maxRows: value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maxColumns">최대 열 수</Label>
                      <span className="text-sm text-muted-foreground">
                        {options.maxColumns}열
                      </span>
                    </div>
                    <Slider
                      id="maxColumns"
                      min={10}
                      max={200}
                      step={10}
                      value={[options.maxColumns]}
                      onValueChange={([value]) => 
                        setOptions({ ...options, maxColumns: value })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Generate Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            생성 중...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Excel 파일 생성
          </>
        )}
      </Button>

      {/* AI Badge */}
      <div className="flex justify-center">
        <Badge variant="secondary" className="gap-1">
          <Zap className="w-3 h-3" />
          GPT-4 기반 AI 생성
        </Badge>
      </div>
    </div>
  )
}