"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  FileSpreadsheet, 
  Download, 
  Sparkles,
  FileText,
  BarChart,
  Table,
  Calculator,
  Calendar,
  Package,
  DollarSign,
  Loader2,
  Info
} from 'lucide-react'
import { ExcelGeneratorService } from '@/lib/services/excel-generator.service'

interface Template {
  key: string
  name: string
  description: string
  sheets: number
  icon: any
}

const templates: Template[] = [
  {
    key: 'sales-report',
    name: '매출 보고서',
    description: '월별 매출 데이터와 분석 차트',
    sheets: 2,
    icon: DollarSign
  },
  {
    key: 'inventory',
    name: '재고 관리',
    description: '제품 재고 현황 및 발주 관리',
    sheets: 1,
    icon: Package
  },
  {
    key: 'project-management',
    name: '프로젝트 관리',
    description: 'Gantt 차트와 진행 상황 추적',
    sheets: 1,
    icon: Calendar
  },
  {
    key: 'budget',
    name: '예산 관리',
    description: '월별 예산 계획 및 실적 비교',
    sheets: 1,
    icon: Calculator
  }
]

export function ExcelGenerator() {
  const { toast } = useToast()
  const [generatorService, setGeneratorService] = useState<ExcelGeneratorService | null>(null)
  const [generationType, setGenerationType] = useState<'template' | 'ai'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState('sales-report')
  const [customPrompt, setCustomPrompt] = useState('')
  const [options, setOptions] = useState({
    includeCharts: true,
    includeFormulas: true,
    includePivotTables: false,
    includeConditionalFormatting: true
  })
  const [generating, setGenerating] = useState(false)
  
  // Initialize service on client side only
  useEffect(() => {
    setGeneratorService(new ExcelGeneratorService())
  }, [])
  
  const handleGenerate = async () => {
    if (!generatorService) {
      toast({
        title: "초기화 중",
        description: "서비스를 초기화하는 중입니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
      return
    }
    if (generationType === 'ai' && !customPrompt.trim()) {
      toast({
        title: "설명 필요",
        description: "AI 생성을 위해 원하는 Excel 파일의 설명을 입력해주세요.",
        variant: "destructive"
      })
      return
    }
    
    setGenerating(true)
    
    try {
      const result = await generatorService.generateExcel({
        template: generationType === 'template' ? selectedTemplate : undefined,
        customPrompt: generationType === 'ai' ? customPrompt : undefined,
        ...options
      })
      
      // Excel 파일 다운로드
      const buffer = await result.workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.metadata.fileName
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "생성 완료",
        description: `Excel 파일이 성공적으로 생성되었습니다. (시트: ${result.metadata.sheets}개, 셀: ${result.metadata.totalCells}개)`
      })
    } catch (error) {
      toast({
        title: "생성 실패",
        description: error instanceof Error ? error.message : "Excel 파일 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Excel 파일 생성</h2>
        <p className="text-muted-foreground mt-2">
          템플릿을 선택하거나 AI를 사용하여 새로운 Excel 파일을 생성하세요
        </p>
      </div>
      
      {/* 생성 방식 선택 */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
        <CardHeader className="relative">
          <CardTitle className="text-indigo-700 dark:text-indigo-300">생성 방식</CardTitle>
          <CardDescription className="text-indigo-600/70 dark:text-indigo-300/70">
            Excel 파일을 생성할 방법을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={generationType} onValueChange={(value) => setGenerationType(value as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="template" id="template" />
              <Label htmlFor="template" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  템플릿 사용
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <RadioGroupItem value="ai" id="ai" />
              <Label htmlFor="ai" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI 생성
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      
      {/* 템플릿 선택 */}
      {generationType === 'template' && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5" />
          <CardHeader className="relative">
            <CardTitle className="text-emerald-700 dark:text-emerald-300">템플릿 선택</CardTitle>
            <CardDescription className="text-emerald-600/70 dark:text-emerald-300/70">
              사용할 Excel 템플릿을 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const Icon = template.icon
                return (
                  <Card
                    key={template.key}
                    className={`cursor-pointer transition-all ${
                      selectedTemplate === template.key
                        ? 'ring-2 ring-primary'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedTemplate(template.key)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            시트 {template.sheets}개
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* AI 프롬프트 입력 */}
      {generationType === 'ai' && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-fuchsia-950/30">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-fuchsia-500/5" />
          <CardHeader className="relative">
            <CardTitle className="text-violet-700 dark:text-violet-300">AI 생성 설정</CardTitle>
            <CardDescription className="text-violet-600/70 dark:text-violet-300/70">
              원하는 Excel 파일의 구조와 내용을 설명해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt">설명</Label>
                <Textarea
                  id="prompt"
                  placeholder="예: 판매 데이터를 분석할 수 있는 Excel 파일을 만들어주세요. 월별 매출, 제품별 판매량, 고객 정보가 포함되어야 하고, 차트와 피벗 테이블도 필요합니다."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={5}
                />
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  AI가 설명에 따라 적절한 시트 구조, 헤더, 샘플 데이터를 생성합니다.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 추가 옵션 */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-red-950/30">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5" />
        <CardHeader className="relative">
          <CardTitle className="text-amber-700 dark:text-amber-300">추가 옵션</CardTitle>
          <CardDescription className="text-amber-600/70 dark:text-amber-300/70">
            Excel 파일에 포함할 기능을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="charts"
                checked={options.includeCharts}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeCharts: checked as boolean })
                }
              />
              <Label htmlFor="charts" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  차트 포함
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="formulas"
                checked={options.includeFormulas}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeFormulas: checked as boolean })
                }
              />
              <Label htmlFor="formulas" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  수식 포함
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pivot"
                checked={options.includePivotTables}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includePivotTables: checked as boolean })
                }
              />
              <Label htmlFor="pivot" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  피벗 테이블 포함
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="formatting"
                checked={options.includeConditionalFormatting}
                onCheckedChange={(checked) => 
                  setOptions({ ...options, includeConditionalFormatting: checked as boolean })
                }
              />
              <Label htmlFor="formatting" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  조건부 서식 포함
                </div>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 생성 버튼 */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Excel 파일 생성
            </>
          )}
        </Button>
      </div>
    </div>
  )
}