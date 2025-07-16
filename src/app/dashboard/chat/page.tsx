"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { 
  Send, 
  Loader2, 
  MessageSquare,
  Bot,
  User,
  Sparkles,
  Copy,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import apiClient from "@/lib/api-client"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  modelUsed?: string
  provider?: string
  tokensUsed?: number
  cost?: number
}

export default function ChatPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 로그인 확인
    const testUser = localStorage.getItem('testUser')
    if (!testUser) {
      router.push('/auth/simple-login')
    }
  }, [router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await apiClient.post("/api/ai/chat", {
        message: input,
        preferredModel: "auto",
        context: {
          conversationId: messages.length > 0 ? "current" : undefined
        }
      })

      const assistantMessage: Message = {
        id: response.data.messageId,
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
        modelUsed: response.data.modelUsed,
        provider: response.data.provider,
        tokensUsed: response.data.tokensUsed,
        cost: response.data.estimatedCost
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      toast({
        title: "오류 발생",
        description: error.response?.data?.message || "메시지 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(messageId)
      setTimeout(() => setCopiedId(null), 2000)
      toast({
        title: "복사됨",
        description: "클립보드에 복사되었습니다.",
      })
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const formatCost = (cost?: number) => {
    if (!cost) return null
    return cost < 0.01 ? `$${(cost * 100).toFixed(3)}¢` : `$${cost.toFixed(3)}`
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold dark:text-white mb-2">AI Excel 어시스턴트</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Excel 관련 질문을 하거나 도움을 요청하세요
        </p>
      </div>


      <Card className="flex flex-col h-[600px]">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            대화
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Excel에 대해 무엇이든 물어보세요!</p>
              <div className="mt-4 space-y-2 text-sm">
                <p>예시:</p>
                <p className="italic">&quot;VLOOKUP 함수 사용법을 알려줘&quot;</p>
                <p className="italic">&quot;판매 데이터 분석 템플릿을 만들어줘&quot;</p>
                <p className="italic">&quot;이 오류를 어떻게 해결하나요: #REF!&quot;</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex gap-3 max-w-[80%]",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {message.provider && message.modelUsed && (
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {message.provider}/{message.modelUsed}
                            </span>
                          )}
                          {message.tokensUsed && (
                            <span>{message.tokensUsed} 토큰</span>
                          )}
                          {message.cost && (
                            <span>{formatCost(message.cost)}</span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => copyToClipboard(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}