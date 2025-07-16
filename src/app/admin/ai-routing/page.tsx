"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Settings,
  Save,
  Loader2,
  AlertCircle,
  Info,
  ArrowRight,
  Zap,
  DollarSign,
  Brain,
  Shield,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface RoutingConfig {
  id: string
  enableFallback: boolean
  enableLoadBalancing: boolean
  enableCostOptimization: boolean
  enableLatencyOptimization: boolean
  maxRetries: number
  timeoutMs: number
  fallbackStrategy: 'same-provider' | 'similar-capability' | 'any-available'
  costThreshold: number
  latencyThreshold: number
  providerPriority: string[]
  blacklistedModels: string[]
  monitoring: {
    enableMetrics: boolean
    alertOnFailure: boolean
    alertThreshold: number
  }
}

export default function AIRoutingPage() {
  const [config, setConfig] = useState<RoutingConfig>({
    id: 'default',
    enableFallback: true,
    enableLoadBalancing: true,
    enableCostOptimization: true,
    enableLatencyOptimization: false,
    maxRetries: 3,
    timeoutMs: 30000,
    fallbackStrategy: 'same-provider',
    costThreshold: 0.1,
    latencyThreshold: 5000,
    providerPriority: ['openrouter', 'openai', 'claude', 'gemini'],
    blacklistedModels: [],
    monitoring: {
      enableMetrics: true,
      alertOnFailure: true,
      alertThreshold: 5
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/ai-routing/config')
      const data = await response.json()
      if (data.config) {
        setConfig(data.config)
      }
    } catch (error) {
      toast.error('라우팅 설정을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/ai-routing/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (!response.ok) throw new Error('저장 실패')

      toast.success('라우팅 설정이 저장되었습니다')
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const testRouting = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/admin/ai-routing/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: "Excel에서 VLOOKUP 함수 사용법을 알려주세요",
          taskType: "GENERAL"
        })
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      toast.error('라우팅 테스트 실패')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI 라우팅 설정</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI 모델 라우팅 전략과 장애 대응 정책을 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={testRouting}
            variant="outline"
            disabled={testing}
          >
            {testing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 테스트 중...</>
            ) : (
              <><Zap className="mr-2 h-4 w-4" /> 라우팅 테스트</>
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> 저장</>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">기본 설정</TabsTrigger>
          <TabsTrigger value="strategy">라우팅 전략</TabsTrigger>
          <TabsTrigger value="monitoring">모니터링</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>핵심 기능</CardTitle>
              <CardDescription>
                AI 모델 라우팅의 핵심 기능을 활성화/비활성화합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="fallback">자동 폴백</Label>
                  <p className="text-sm text-gray-500">
                    모델 오류 시 자동으로 다른 모델로 전환
                  </p>
                </div>
                <Switch
                  id="fallback"
                  checked={config.enableFallback}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, enableFallback: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="loadbalancing">로드 밸런싱</Label>
                  <p className="text-sm text-gray-500">
                    여러 모델 간 요청 분산
                  </p>
                </div>
                <Switch
                  id="loadbalancing"
                  checked={config.enableLoadBalancing}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, enableLoadBalancing: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cost">비용 최적화</Label>
                  <p className="text-sm text-gray-500">
                    비용 효율적인 모델 우선 선택
                  </p>
                </div>
                <Switch
                  id="cost"
                  checked={config.enableCostOptimization}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, enableCostOptimization: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="latency">지연 최적화</Label>
                  <p className="text-sm text-gray-500">
                    응답 속도가 빠른 모델 우선 선택
                  </p>
                </div>
                <Switch
                  id="latency"
                  checked={config.enableLatencyOptimization}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, enableLatencyOptimization: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>제한 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="retries">최대 재시도 횟수</Label>
                  <input
                    id="retries"
                    type="number"
                    value={config.maxRetries}
                    onChange={(e) => 
                      setConfig({ ...config, maxRetries: parseInt(e.target.value) })
                    }
                    min="1"
                    max="5"
                    className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                  />
                </div>
                <div>
                  <Label htmlFor="timeout">타임아웃 (ms)</Label>
                  <input
                    id="timeout"
                    type="number"
                    value={config.timeoutMs}
                    onChange={(e) => 
                      setConfig({ ...config, timeoutMs: parseInt(e.target.value) })
                    }
                    min="5000"
                    max="60000"
                    step="1000"
                    className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                  />
                </div>
                <div>
                  <Label htmlFor="costThreshold">비용 한도 ($/요청)</Label>
                  <input
                    id="costThreshold"
                    type="number"
                    value={config.costThreshold}
                    onChange={(e) => 
                      setConfig({ ...config, costThreshold: parseFloat(e.target.value) })
                    }
                    min="0.01"
                    max="1"
                    step="0.01"
                    className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                  />
                </div>
                <div>
                  <Label htmlFor="latencyThreshold">지연 한도 (ms)</Label>
                  <input
                    id="latencyThreshold"
                    type="number"
                    value={config.latencyThreshold}
                    onChange={(e) => 
                      setConfig({ ...config, latencyThreshold: parseInt(e.target.value) })
                    }
                    min="1000"
                    max="30000"
                    step="500"
                    className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>폴백 전략</CardTitle>
              <CardDescription>
                모델 실패 시 어떤 순서로 대체 모델을 시도할지 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>폴백 전략</Label>
                <select
                  value={config.fallbackStrategy}
                  onChange={(e) => 
                    setConfig({ ...config, fallbackStrategy: e.target.value as any })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                >
                  <option value="same-provider">동일 프로바이더 우선</option>
                  <option value="similar-capability">유사 기능 우선</option>
                  <option value="any-available">사용 가능한 모든 모델</option>
                </select>
              </div>

              <div>
                <Label>프로바이더 우선순위</Label>
                <div className="mt-2 space-y-2">
                  {config.providerPriority.map((provider, index) => (
                    <div key={provider} className="flex items-center gap-2">
                      <span className="w-8 text-sm text-gray-500">{index + 1}.</span>
                      <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded">
                        {provider}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (index > 0) {
                            const newPriority = [...config.providerPriority]
                            ;[newPriority[index], newPriority[index - 1]] = 
                             [newPriority[index - 1], newPriority[index]]
                            setConfig({ ...config, providerPriority: newPriority })
                          }
                        }}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (index < config.providerPriority.length - 1) {
                            const newPriority = [...config.providerPriority]
                            ;[newPriority[index], newPriority[index + 1]] = 
                             [newPriority[index + 1], newPriority[index]]
                            setConfig({ ...config, providerPriority: newPriority })
                          }
                        }}
                        disabled={index === config.providerPriority.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>라우팅 시뮬레이션</CardTitle>
              <CardDescription>
                현재 설정으로 요청이 어떻게 라우팅되는지 확인합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Brain className="h-4 w-4" />
                  <span>사용자 요청</span>
                </div>
                <ArrowRight className="h-4 w-4 mx-auto text-gray-400" />
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>라우팅 엔진</span>
                </div>
                <ArrowRight className="h-4 w-4 mx-auto text-gray-400" />
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4" />
                  <span>모델 선택 & 폴백</span>
                </div>
                <ArrowRight className="h-4 w-4 mx-auto text-gray-400" />
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4" />
                  <span>응답 반환</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>모니터링 설정</CardTitle>
              <CardDescription>
                AI 모델 성능과 오류를 추적하고 알림을 설정합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="metrics">성능 지표 수집</Label>
                  <p className="text-sm text-gray-500">
                    응답 시간, 성공률, 비용 등을 추적
                  </p>
                </div>
                <Switch
                  id="metrics"
                  checked={config.monitoring.enableMetrics}
                  onCheckedChange={(checked) => 
                    setConfig({ 
                      ...config, 
                      monitoring: { ...config.monitoring, enableMetrics: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="alerts">오류 알림</Label>
                  <p className="text-sm text-gray-500">
                    연속 실패 시 관리자에게 알림
                  </p>
                </div>
                <Switch
                  id="alerts"
                  checked={config.monitoring.alertOnFailure}
                  onCheckedChange={(checked) => 
                    setConfig({ 
                      ...config, 
                      monitoring: { ...config.monitoring, alertOnFailure: checked }
                    })
                  }
                />
              </div>

              {config.monitoring.alertOnFailure && (
                <div>
                  <Label htmlFor="alertThreshold">알림 임계값</Label>
                  <input
                    id="alertThreshold"
                    type="number"
                    value={config.monitoring.alertThreshold}
                    onChange={(e) => 
                      setConfig({ 
                        ...config, 
                        monitoring: { 
                          ...config.monitoring, 
                          alertThreshold: parseInt(e.target.value) 
                        }
                      })
                    }
                    min="1"
                    max="10"
                    className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    연속 {config.monitoring.alertThreshold}회 실패 시 알림 발송
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle>테스트 결과</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">선택된 모델:</span>
                    <span className="font-medium">{testResult.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">응답 시간:</span>
                    <span className="font-medium">{testResult.latency}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">예상 비용:</span>
                    <span className="font-medium">${testResult.cost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">폴백 시도:</span>
                    <span className="font-medium">{testResult.fallbackAttempts || 0}회</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}