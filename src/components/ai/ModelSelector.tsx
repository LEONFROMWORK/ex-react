"use client"

import { useState, useEffect } from "react"
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Brain, Settings, Sparkles } from "lucide-react"
import Link from "next/link"

interface AIModel {
  id: string
  provider: string
  modelName: string
  displayName: string
  isActive: boolean
  isDefault: boolean
}

interface ModelSelectorProps {
  value?: string
  onChange?: (modelId: string) => void
  showSettings?: boolean
  className?: string
}

export function ModelSelector({ 
  value, 
  onChange, 
  showSettings = false,
  className 
}: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState(value || "auto")

  useEffect(() => {
    fetchModels()
  }, [])

  useEffect(() => {
    if (value) {
      setSelectedModel(value)
    }
  }, [value])

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/ai/models/active')
      const data = await response.json()
      if (data.models) {
        setModels(data.models)
        // Set default model if no value provided
        if (!value) {
          const defaultModel = data.models.find((m: AIModel) => m.isDefault)
          if (defaultModel) {
            setSelectedModel(defaultModel.id)
            onChange?.(defaultModel.id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (modelId: string) => {
    setSelectedModel(modelId)
    onChange?.(modelId)
  }

  const groupedModels = models.reduce((acc, model) => {
    const provider = model.provider.charAt(0).toUpperCase() + model.provider.slice(1)
    if (!acc[provider]) {
      acc[provider] = []
    }
    acc[provider].push(model)
    return acc
  }, {} as Record<string, AIModel[]>)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedModel} onValueChange={handleChange} disabled={loading}>
        <SelectTrigger className="w-[250px]">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <SelectValue placeholder="AI 모델 선택" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>자동 선택</SelectLabel>
            <SelectItem value="auto">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>자동 모델 선택</span>
              </div>
            </SelectItem>
          </SelectGroup>
          
          {Object.entries(groupedModels).map(([provider, providerModels]) => (
            <SelectGroup key={provider}>
              <SelectLabel>{provider}</SelectLabel>
              {providerModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{model.displayName}</span>
                    {model.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-1.5 py-0.5 rounded ml-2">
                        기본
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {showSettings && (
        <Link href="/admin/ai-models">
          <Button variant="outline" size="icon" title="AI 모델 설정">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  )
}