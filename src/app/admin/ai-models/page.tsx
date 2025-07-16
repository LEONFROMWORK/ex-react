"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Brain, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Save,
  Loader2,
  AlertCircle,
  Zap,
  Plus,
  RefreshCw,
  Trash2
} from "lucide-react"
import { SUPPORTED_PROVIDERS } from "@/lib/ai/providers"
import { toast } from "sonner"

interface AIModelConfig {
  id: string
  provider: string
  apiKey: string
  endpoint?: string
  modelName: string
  displayName: string
  isActive: boolean
  isDefault: boolean
  priority: number
  maxTokens: number
  temperature: number
  costPerToken: number
  taskTypes: string[]
  complexity: string[]
  createdAt: string
  updatedAt: string
}

export default function AIModelsPage() {
  const [models, setModels] = useState<AIModelConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/admin/ai-models')
      const data = await response.json()
      setModels(data.models || [])
    } catch (error) {
      toast.error('AI 모델 정보를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (model: AIModelConfig) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/ai-models/${model.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model)
      })

      if (!response.ok) throw new Error('저장 실패')

      toast.success('AI 모델 설정이 저장되었습니다')
      await fetchModels()
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async (model: AIModelConfig) => {
    setValidating({ ...validating, [model.id]: true })
    try {
      const response = await fetch(`/api/admin/ai-models/${model.id}/validate`, {
        method: 'POST'
      })

      const result = await response.json()
      if (result.valid) {
        toast.success('API 키가 유효합니다')
      } else {
        toast.error('API 키가 유효하지 않습니다')
      }
    } catch (error) {
      toast.error('검증 중 오류가 발생했습니다')
    } finally {
      setValidating({ ...validating, [model.id]: false })
    }
  }

  const handleCreateModel = async (provider: string) => {
    try {
      const response = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })

      if (!response.ok) throw new Error('생성 실패')

      await fetchModels()
      toast.success('새 AI 모델이 추가되었습니다')
    } catch (error) {
      toast.error('모델 추가 중 오류가 발생했습니다')
    }
  }

  const updateModel = (id: string, field: string, value: any) => {
    setModels(models.map(model => 
      model.id === id ? { ...model, [field]: value } : model
    ))
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
          <h1 className="text-3xl font-bold">AI 모델 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            여러 AI 모델을 설정하고 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              const response = await fetch('/api/admin/ai-models/init-llama', {
                method: 'POST'
              })
              if (response.ok) {
                toast.success('OpenRouter LLAMA 모델이 설정되었습니다')
                await fetchModels()
              } else {
                toast.error('LLAMA 설정 중 오류가 발생했습니다')
              }
            }}
            variant="outline"
          >
            <Zap className="h-4 w-4 mr-2" />
            LLAMA 빠른 설정
          </Button>
          <Button
            onClick={() => window.location.href = '/admin/ai-models/openrouter'}
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            OpenRouter 모델 탐색
          </Button>
        </div>
      </div>

      <Tabs defaultValue="configured" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configured">설정된 모델</TabsTrigger>
          <TabsTrigger value="available">사용 가능한 모델</TabsTrigger>
        </TabsList>

        <TabsContent value="configured" className="space-y-4">
          {models.length === 0 ? (
            <Card className="p-12 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                아직 설정된 AI 모델이 없습니다
              </p>
            </Card>
          ) : (
            models.map((model) => (
              <Card key={model.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Brain className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold">{model.displayName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {SUPPORTED_PROVIDERS[model.provider as keyof typeof SUPPORTED_PROVIDERS]?.name} • {model.modelName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {model.isActive && (
                        <span className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs px-2 py-1 rounded">
                          활성
                        </span>
                      )}
                      {model.isDefault && (
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 text-xs px-2 py-1 rounded">
                          기본
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`apikey-${model.id}`}>API 키</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id={`apikey-${model.id}`}
                          type={showApiKey[model.id] ? "text" : "password"}
                          value={model.apiKey || ''}
                          onChange={(e) => updateModel(model.id, 'apiKey', e.target.value)}
                          placeholder="API 키를 입력하세요"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowApiKey({ ...showApiKey, [model.id]: !showApiKey[model.id] })}
                        >
                          {showApiKey[model.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleValidate(model)}
                          disabled={validating[model.id] || !model.apiKey}
                        >
                          {validating[model.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {SUPPORTED_PROVIDERS[model.provider as keyof typeof SUPPORTED_PROVIDERS]?.requiresEndpoint && (
                      <div>
                        <Label htmlFor={`endpoint-${model.id}`}>엔드포인트</Label>
                        <Input
                          id={`endpoint-${model.id}`}
                          value={model.endpoint || ''}
                          onChange={(e) => updateModel(model.id, 'endpoint', e.target.value)}
                          placeholder="https://api.example.com"
                          className="mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor={`model-${model.id}`}>모델</Label>
                      {model.provider === 'openrouter' ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            id={`model-${model.id}`}
                            value={model.modelName}
                            onChange={(e) => updateModel(model.id, 'modelName', e.target.value)}
                            placeholder="예: meta-llama/llama-2-70b-chat"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open('https://openrouter.ai/models', '_blank')}
                            title="OpenRouter 모델 목록 보기"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <select
                          id={`model-${model.id}`}
                          value={model.modelName}
                          onChange={(e) => updateModel(model.id, 'modelName', e.target.value)}
                          className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                        >
                          {SUPPORTED_PROVIDERS[model.provider as keyof typeof SUPPORTED_PROVIDERS]?.models.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`priority-${model.id}`}>우선순위</Label>
                      <Input
                        id={`priority-${model.id}`}
                        type="number"
                        value={model.priority}
                        onChange={(e) => updateModel(model.id, 'priority', parseInt(e.target.value))}
                        min="0"
                        max="100"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`maxTokens-${model.id}`}>최대 토큰</Label>
                      <Input
                        id={`maxTokens-${model.id}`}
                        type="number"
                        value={model.maxTokens}
                        onChange={(e) => updateModel(model.id, 'maxTokens', parseInt(e.target.value))}
                        min="100"
                        max="32000"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`temperature-${model.id}`}>Temperature</Label>
                      <Input
                        id={`temperature-${model.id}`}
                        type="number"
                        value={model.temperature}
                        onChange={(e) => updateModel(model.id, 'temperature', parseFloat(e.target.value))}
                        min="0"
                        max="2"
                        step="0.1"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={model.isActive}
                        onChange={(e) => updateModel(model.id, 'isActive', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">활성화</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={model.isDefault}
                        onChange={(e) => updateModel(model.id, 'isDefault', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">기본 모델로 설정</span>
                    </label>
                    <div className="ml-auto flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          if (confirm('이 모델을 삭제하시겠습니까?')) {
                            try {
                              const response = await fetch(`/api/admin/ai-models/${model.id}`, {
                                method: 'DELETE'
                              })
                              if (response.ok) {
                                toast.success('모델이 삭제되었습니다')
                                await fetchModels()
                              }
                            } catch (error) {
                              toast.error('삭제 중 오류가 발생했습니다')
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleSave(model)}
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
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          {Object.entries(SUPPORTED_PROVIDERS).map(([key, provider]) => (
            <Card key={key} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{provider.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    사용 가능한 모델: {provider.models.join(', ')}
                  </p>
                </div>
                <Button
                  onClick={() => handleCreateModel(key)}
                  disabled={models.some(m => m.provider === key)}
                >
                  {models.some(m => m.provider === key) ? '이미 추가됨' : '추가'}
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}