"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { 
  Settings,
  Save,
  Loader2,
  AlertCircle,
  Info
} from "lucide-react"
import { toast } from "sonner"

interface AIModelPolicy {
  id: string
  name: string
  description: string
  selectionMode: 'automatic' | 'manual' | 'hybrid'
  rules: {
    fallbackChain?: string[]
    taskTypeMapping?: Record<string, string[]>
    complexityThresholds?: {
      simple: string[]
      medium: string[]
      complex: string[]
    }
    costOptimization?: boolean
    qualityPriority?: number
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function AIPoliciesPage() {
  const [policy, setPolicy] = useState<AIModelPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPolicy()
  }, [])

  const fetchPolicy = async () => {
    try {
      const response = await fetch('/api/admin/ai-policies')
      const data = await response.json()
      setPolicy(data.policy || createDefaultPolicy())
    } catch (error) {
      toast.error('정책 정보를 불러오는데 실패했습니다')
      setPolicy(createDefaultPolicy())
    } finally {
      setLoading(false)
    }
  }

  const createDefaultPolicy = (): AIModelPolicy => ({
    id: 'new',
    name: '기본 정책',
    description: 'AI 모델 선택을 위한 기본 정책',
    selectionMode: 'automatic',
    rules: {
      fallbackChain: ['openai', 'claude', 'gemini', 'llama'],
      taskTypeMapping: {
        'EXCEL_ANALYSIS': ['openai', 'claude'],
        'ERROR_CORRECTION': ['openai', 'gemini'],
        'FORMULA_GENERATION': ['openai', 'claude'],
        'GENERAL': ['openai', 'claude', 'gemini', 'llama']
      },
      complexityThresholds: {
        simple: ['llama', 'gemini'],
        medium: ['gemini', 'claude'],
        complex: ['openai', 'claude']
      },
      costOptimization: true,
      qualityPriority: 0.7
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const handleSave = async () => {
    if (!policy) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/ai-policies', {
        method: policy.id === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy)
      })

      if (!response.ok) throw new Error('저장 실패')

      toast.success('AI 정책이 저장되었습니다')
      await fetchPolicy()
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const updatePolicy = (field: string, value: any) => {
    if (!policy) return
    setPolicy({ ...policy, [field]: value })
  }

  const updateRule = (ruleName: string, value: any) => {
    if (!policy) return
    setPolicy({
      ...policy,
      rules: {
        ...policy.rules,
        [ruleName]: value
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!policy) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI 정책 설정</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            AI 모델 선택 정책을 설정합니다
          </p>
        </div>
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

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">기본 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">정책 이름</Label>
                <input
                  id="name"
                  type="text"
                  value={policy.name}
                  onChange={(e) => updatePolicy('name', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                />
              </div>
              <div>
                <Label htmlFor="mode">선택 모드</Label>
                <select
                  id="mode"
                  value={policy.selectionMode}
                  onChange={(e) => updatePolicy('selectionMode', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                >
                  <option value="automatic">자동</option>
                  <option value="manual">수동</option>
                  <option value="hybrid">하이브리드</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="description">설명</Label>
              <textarea
                id="description"
                value={policy.description}
                onChange={(e) => updatePolicy('description', e.target.value)}
                rows={3}
                className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">폴백 체인</h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  첫 번째 모델이 실패할 경우 순서대로 다음 모델을 시도합니다.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(policy.rules.fallbackChain || []).map((provider, index) => (
                <div
                  key={index}
                  className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                >
                  <span>{index + 1}. {provider}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">작업 유형별 모델 매핑</h3>
            <div className="space-y-3">
              {Object.entries(policy.rules.taskTypeMapping || {}).map(([task, providers]) => (
                <div key={task} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="font-medium">{task}</span>
                  <div className="flex gap-2">
                    {providers.map((provider, idx) => (
                      <span key={idx} className="text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded">
                        {provider}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">복잡도별 모델 할당</h3>
            <div className="space-y-3">
              {Object.entries(policy.rules.complexityThresholds || {}).map(([level, providers]) => (
                <div key={level} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="font-medium capitalize">{level}</span>
                  <div className="flex gap-2">
                    {providers.map((provider, idx) => (
                      <span key={idx} className="text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded">
                        {provider}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">최적화 설정</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.rules.costOptimization || false}
                  onChange={(e) => updateRule('costOptimization', e.target.checked)}
                  className="rounded"
                />
                <span>비용 최적화 활성화</span>
              </label>
              <div>
                <Label htmlFor="quality">품질 우선순위 (0-1)</Label>
                <input
                  id="quality"
                  type="number"
                  value={policy.rules.qualityPriority || 0.7}
                  onChange={(e) => updateRule('qualityPriority', parseFloat(e.target.value))}
                  min="0"
                  max="1"
                  step="0.1"
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">
                  0에 가까울수록 비용 우선, 1에 가까울수록 품질 우선
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}