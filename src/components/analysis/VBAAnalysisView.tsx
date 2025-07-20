"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useToast } from '@/components/ui/use-toast'
import { 
  Code, 
  AlertTriangle, 
  Shield, 
  Zap, 
  CheckCircle,
  XCircle,
  Info,
  FileCode,
  Bug,
  Lightbulb,
  Download,
  Play
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface VBAAnalysisResult {
  modules: VBAModule[]
  errors: VBAError[]
  securityIssues: SecurityIssue[]
  summary: {
    totalModules: number
    totalProcedures: number
    totalLines: number
    errorCount: number
    warningCount: number
    infoCount: number
  }
  recommendations: string[]
}

interface VBAModule {
  moduleName: string
  moduleType: string
  code: string
  procedures: VBAProcedure[]
}

interface VBAProcedure {
  name: string
  type: string
  visibility: string
  parameters: string[]
  startLine: number
  endLine: number
}

interface VBAError {
  type: string
  severity: 'error' | 'warning' | 'info'
  module: string
  procedure?: string
  line: number
  message: string
  suggestion?: string
  autoFixable: boolean
}

interface SecurityIssue {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  module: string
  line: number
  description: string
  recommendation: string
}

interface VBAAnalysisViewProps {
  analysisResult: VBAAnalysisResult
  onFix?: (errors: VBAError[]) => Promise<void>
  onDownload?: () => void
}

const severityIcons = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  critical: Shield,
  high: AlertTriangle,
  medium: Bug,
  low: Lightbulb
}

const severityColors = {
  error: 'destructive',
  warning: 'destructive',
  info: 'default',
  critical: 'destructive',
  high: 'destructive',
  medium: 'destructive',
  low: 'default'
} as const

export function VBAAnalysisView({ 
  analysisResult,
  onFix,
  onDownload 
}: VBAAnalysisViewProps) {
  const { toast } = useToast()
  const [selectedModule, setSelectedModule] = useState<string>(
    analysisResult.modules[0]?.moduleName || ''
  )
  const [fixingErrors, setFixingErrors] = useState(false)
  
  const selectedModuleData = analysisResult.modules.find(
    m => m.moduleName === selectedModule
  )
  
  const moduleErrors = analysisResult.errors.filter(
    e => e.module === selectedModule
  )
  
  const moduleSecurityIssues = analysisResult.securityIssues.filter(
    i => i.module === selectedModule
  )
  
  const handleAutoFix = async () => {
    const fixableErrors = analysisResult.errors.filter(e => e.autoFixable)
    
    if (fixableErrors.length === 0) {
      toast({
        title: "자동 수정 가능한 오류 없음",
        description: "자동으로 수정할 수 있는 오류가 없습니다."
      })
      return
    }
    
    setFixingErrors(true)
    
    try {
      if (onFix) {
        await onFix(fixableErrors)
        toast({
          title: "수정 완료",
          description: `${fixableErrors.length}개의 오류가 자동으로 수정되었습니다.`
        })
      }
    } catch (error) {
      toast({
        title: "수정 실패",
        description: "오류 수정 중 문제가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setFixingErrors(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              모듈 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analysisResult.summary.totalModules}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              오류
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {analysisResult.summary.errorCount}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              경고
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">
              {analysisResult.summary.warningCount}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              보안 문제
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {analysisResult.securityIssues.length}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* 도구 모음 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">VBA 코드 분석</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAutoFix}
            disabled={fixingErrors}
          >
            {fixingErrors ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                수정 중...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                자동 수정
              </>
            )}
          </Button>
          {onDownload && (
            <Button variant="outline" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              리포트 다운로드
            </Button>
          )}
        </div>
      </div>
      
      {/* 모듈 선택 및 코드 보기 */}
      <Card>
        <CardHeader>
          <CardTitle>VBA 모듈</CardTitle>
          <CardDescription>
            분석할 VBA 모듈을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedModule} onValueChange={setSelectedModule}>
            <TabsList className="grid grid-cols-auto gap-2">
              {analysisResult.modules.map(module => (
                <TabsTrigger key={module.moduleName} value={module.moduleName}>
                  <FileCode className="h-4 w-4 mr-2" />
                  {module.moduleName}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {selectedModuleData && (
              <TabsContent value={selectedModule} className="mt-4">
                <Tabs defaultValue="code">
                  <TabsList>
                    <TabsTrigger value="code">Code</TabsTrigger>
                    <TabsTrigger value="errors">Errors ({moduleErrors.length})</TabsTrigger>
                    <TabsTrigger value="security">Security ({moduleSecurityIssues.length})</TabsTrigger>
                    <TabsTrigger value="procedures">Procedures ({selectedModuleData.procedures.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="code" className="mt-4">
                    <ScrollArea className="h-[400px] rounded-md border">
                      <SyntaxHighlighter
                        language="vbnet"
                        style={vscDarkPlus}
                        showLineNumbers
                        wrapLines
                      >
                        {selectedModuleData.code}
                      </SyntaxHighlighter>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="errors" className="mt-4">
                    {moduleErrors.length === 0 ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          이 모듈에서 발견된 오류가 없습니다.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Accordion type="single" collapsible className="w-full">
                        {moduleErrors.map((error, index) => {
                          const Icon = severityIcons[error.severity]
                          return (
                            <AccordionItem key={index} value={`error-${index}`}>
                              <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <Badge variant={severityColors[error.severity]}>
                                    {error.severity}
                                  </Badge>
                                  <span className="text-sm">
                                    Line {error.line}: {error.message}
                                  </span>
                                  {error.autoFixable && (
                                    <Badge variant="outline" className="ml-auto">
                                      자동 수정 가능
                                    </Badge>
                                  )}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2">
                                  <p className="text-sm">
                                    <strong>위치:</strong> {error.module} - Line {error.line}
                                    {error.procedure && ` (${error.procedure})`}
                                  </p>
                                  <p className="text-sm">
                                    <strong>유형:</strong> {error.type}
                                  </p>
                                  {error.suggestion && (
                                    <Alert>
                                      <Lightbulb className="h-4 w-4" />
                                      <AlertDescription>
                                        {error.suggestion}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="security" className="mt-4">
                    {moduleSecurityIssues.length === 0 ? (
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          이 모듈에서 보안 문제가 발견되지 않았습니다.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {moduleSecurityIssues.map((issue, index) => {
                          const Icon = severityIcons[issue.severity]
                          return (
                            <Alert key={index} variant={severityColors[issue.severity]}>
                              <Icon className="h-4 w-4" />
                              <AlertDescription>
                                <div className="space-y-2">
                                  <p className="font-semibold">
                                    {issue.description}
                                  </p>
                                  <p className="text-sm">
                                    Line {issue.line} - {issue.type}
                                  </p>
                                  <p className="text-sm italic">
                                    {issue.recommendation}
                                  </p>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="procedures" className="mt-4">
                    <div className="space-y-2">
                      {selectedModuleData.procedures.map((proc, index) => (
                        <Card key={index}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                <span className="font-mono">{proc.name}</span>
                                <Badge variant="outline">{proc.type}</Badge>
                                <Badge variant="secondary">{proc.visibility}</Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                Lines {proc.startLine}-{proc.endLine}
                              </span>
                            </div>
                            {proc.parameters.length > 0 && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                Parameters: {proc.parameters.join(', ')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
      
      {/* 추천사항 */}
      {analysisResult.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              추천사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysisResult.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}