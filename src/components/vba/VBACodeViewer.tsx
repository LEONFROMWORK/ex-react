'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Code2,
  Copy,
  Download,
  FileCode,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

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
}

interface VBACodeViewerProps {
  modules: VBAModule[]
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
  fileName: string
  extractionTime: number
}

export function VBACodeViewer({
  modules,
  securityScan,
  fileName,
  extractionTime,
}: VBACodeViewerProps) {
  const [selectedModule, setSelectedModule] = useState(modules[0]?.name || '')
  const [expandedThreats, setExpandedThreats] = useState<string[]>([])

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'Standard':
        return <FileCode className="w-4 h-4" />
      case 'Class':
        return <Code2 className="w-4 h-4" />
      default:
        return <FileCode className="w-4 h-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'destructive'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <ShieldAlert className="w-4 h-4" />
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />
      case 'low':
        return <Info className="w-4 h-4" />
      default:
        return <Shield className="w-4 h-4" />
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('코드가 클립보드에 복사되었습니다')
  }

  const downloadVBA = () => {
    const content = modules
      .map(m => `'========== ${m.name} (${m.type}) ==========\n${m.code}\n`)
      .join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName.replace(/\.[^/.]+$/, '')}_VBA.bas`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('VBA 코드를 다운로드했습니다')
  }

  const selectedModuleData = modules.find(m => m.name === selectedModule)
  const moduleThreats = securityScan?.threats.filter(t => t.module === selectedModule) || []

  return (
    <div className="space-y-6">
      {/* 보안 스캔 결과 */}
      {securityScan && securityScan.summary.totalThreats > 0 && (
        <Alert variant={securityScan.summary.criticalCount > 0 ? 'destructive' : 'default'}>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>보안 스캔 결과</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <p>총 {securityScan.summary.totalThreats}개의 잠재적 위험이 발견되었습니다.</p>
              <div className="flex gap-3">
                {securityScan.summary.criticalCount > 0 && (
                  <Badge variant="destructive">
                    치명적: {securityScan.summary.criticalCount}
                  </Badge>
                )}
                {securityScan.summary.highCount > 0 && (
                  <Badge variant="destructive">
                    높음: {securityScan.summary.highCount}
                  </Badge>
                )}
                {securityScan.summary.mediumCount > 0 && (
                  <Badge variant="destructive">
                    중간: {securityScan.summary.mediumCount}
                  </Badge>
                )}
                {securityScan.summary.lowCount > 0 && (
                  <Badge variant="secondary">
                    낮음: {securityScan.summary.lowCount}
                  </Badge>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* VBA 코드 뷰어 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>VBA 코드</CardTitle>
              <CardDescription>
                {modules.length}개 모듈 · 총 {modules.reduce((sum, m) => sum + m.lineCount, 0)}줄 · {extractionTime}ms
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => selectedModuleData && copyCode(selectedModuleData.code)}>
                <Copy className="w-4 h-4 mr-2" />
                복사
              </Button>
              <Button size="sm" variant="outline" onClick={downloadVBA}>
                <Download className="w-4 h-4 mr-2" />
                다운로드
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={selectedModule} onValueChange={setSelectedModule}>
            <TabsList className="w-full justify-start rounded-none border-b bg-muted/50 p-0 h-auto">
              {modules.map((module) => (
                <TabsTrigger
                  key={module.name}
                  value={module.name}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <div className="flex items-center gap-2 px-1">
                    {getModuleIcon(module.type)}
                    <span>{module.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {module.lineCount}
                    </Badge>
                    {moduleThreats.length > 0 && (
                      <Badge variant={getSeverityColor(moduleThreats[0].severity)} className="text-xs">
                        {moduleThreats.length}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {modules.map((module) => (
              <TabsContent key={module.name} value={module.name} className="mt-0">
                {/* 모듈별 위협 정보 */}
                {moduleThreats.length > 0 && (
                  <div className="border-b bg-muted/30 p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      이 모듈에서 발견된 위험 요소
                    </h4>
                    <div className="space-y-2">
                      {moduleThreats.map((threat, index) => (
                        <Collapsible
                          key={index}
                          open={expandedThreats.includes(`${threat.module}-${index}`)}
                          onOpenChange={(open) => {
                            if (open) {
                              setExpandedThreats([...expandedThreats, `${threat.module}-${index}`])
                            } else {
                              setExpandedThreats(expandedThreats.filter(t => t !== `${threat.module}-${index}`))
                            }
                          }}
                        >
                          <CollapsibleTrigger className="flex items-start gap-2 w-full text-left p-2 rounded hover:bg-muted/50 transition-colors">
                            {expandedThreats.includes(`${threat.module}-${index}`) ? (
                              <ChevronDown className="w-4 h-4 mt-0.5" />
                            ) : (
                              <ChevronRight className="w-4 h-4 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(threat.severity)}
                                <Badge variant={getSeverityColor(threat.severity)} className="text-xs">
                                  {threat.severity}
                                </Badge>
                                <span className="font-medium">{threat.description}</span>
                                <span className="text-sm text-muted-foreground">줄 {threat.line}</span>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-8 pr-2 pb-2">
                            <div className="text-sm text-muted-foreground">
                              <p>위험 유형: {threat.type}</p>
                              <p className="mt-1">
                                이 패턴은 악성 코드에서 자주 사용됩니다. 코드의 의도를 확인하고 필요한 경우 제거하거나 수정하세요.
                              </p>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                )}

                {/* 코드 영역 */}
                <div className="relative">
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-sm font-mono">
                      {module.code.split('\n').map((line, index) => {
                        const lineNumber = index + 1
                        const hasThreats = moduleThreats.some(t => t.line === lineNumber)
                        
                        return (
                          <div
                            key={index}
                            className={`${hasThreats ? 'bg-destructive/10 -mx-4 px-4' : ''}`}
                          >
                            <span className="inline-block w-12 text-muted-foreground select-none text-right mr-4">
                              {lineNumber}
                            </span>
                            <span className={hasThreats ? 'text-destructive' : ''}>
                              {line || ' '}
                            </span>
                          </div>
                        )
                      })}
                    </code>
                  </pre>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 보안 스캔이 없을 때 */}
      {!securityScan && modules.length > 0 && (
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>보안 스캔</AlertTitle>
          <AlertDescription>
            VBA 코드의 보안 위험을 검사하려면 추출 시 보안 스캔 옵션을 활성화하세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}