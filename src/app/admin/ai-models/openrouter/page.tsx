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
  Loader2,
  Search,
  DollarSign,
  Zap,
  MessageSquare,
  FileText,
  Eye,
  Plus,
  ChevronRight,
  Info
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
  architecture: {
    modality: string
    tokenizer: string
    instruct_type?: string
  }
  pricing: {
    prompt: string
    completion: string
    request?: string
    image?: string
  }
  estimatedCost: {
    per1kInput: number
    per1kOutput: number
    perRequest: number
  }
}

export default function OpenRouterModelsPage() {
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("recommended")
  const [sortBy, setSortBy] = useState<"name" | "cost" | "context">("name")
  const [addingModel, setAddingModel] = useState<string | null>(null)

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/admin/ai-models/openrouter/models')
      const data = await response.json()
      if (data.success) {
        setModels(data.models)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error('OpenRouter 모델 정보를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const addModelToSystem = async (model: OpenRouterModel) => {
    setAddingModel(model.id)
    try {
      const response = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openrouter',
          modelName: model.id,
          displayName: model.name,
          context_length: model.context_length,
          pricing: model.pricing
        })
      })

      if (!response.ok) throw new Error('모델 추가 실패')

      toast.success(`${model.name} 모델이 추가되었습니다`)
      // Redirect to AI models page
      window.location.href = '/admin/ai-models'
    } catch (error) {
      toast.error('모델 추가 중 오류가 발생했습니다')
    } finally {
      setAddingModel(null)
    }
  }

  const filteredModels = models
    .filter(model => {
      if (!searchTerm) return true
      return model.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
             model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (model.description && model.description.toLowerCase().includes(searchTerm.toLowerCase()))
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "cost":
          return a.estimatedCost.per1kInput - b.estimatedCost.per1kInput
        case "context":
          return b.context_length - a.context_length
        default:
          return a.name.localeCompare(b.name)
      }
    })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "chat": return <MessageSquare className="h-4 w-4" />
      case "completion": return <FileText className="h-4 w-4" />
      case "vision": return <Eye className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const formatCost = (cost: number) => {
    if (cost === 0) return "무료"
    if (cost < 0.01) return `$${(cost * 1000).toFixed(3)}/1K`
    return `$${cost.toFixed(3)}/1K`
  }

  const formatContextLength = (length: number) => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K`
    return length.toString()
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
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <Link href="/admin" className="hover:text-gray-900 dark:hover:text-gray-100">
              관리자
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/admin/ai-models" className="hover:text-gray-900 dark:hover:text-gray-100">
              AI 모델 관리
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>OpenRouter 모델 탐색</span>
          </div>
          <h1 className="text-3xl font-bold">OpenRouter 모델 탐색</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            400개 이상의 AI 모델을 탐색하고 추가하세요
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="모델 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort" className="text-sm">정렬:</Label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border rounded-md dark:bg-gray-800"
            >
              <option value="name">이름순</option>
              <option value="cost">비용순</option>
              <option value="context">컨텍스트 크기순</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <Card key={model.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{model.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {model.id}
                </p>
              </div>

              {model.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {model.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Brain className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatContextLength(model.context_length)} 토큰
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatCost(model.estimatedCost.per1kInput)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {model.architecture.instruct_type && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded">
                    {model.architecture.instruct_type}
                  </span>
                )}
                {model.architecture.modality === 'multimodal' && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100 rounded">
                    비전
                  </span>
                )}
              </div>

              <Button
                onClick={() => addModelToSystem(model)}
                disabled={addingModel === model.id}
                className="w-full"
                size="sm"
              >
                {addingModel === model.id ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 추가 중...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" /> 시스템에 추가</>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card className="p-12 text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">
            검색 결과가 없습니다
          </p>
        </Card>
      )}
    </div>
  )
}