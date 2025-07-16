'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Code, Lightbulb, Trash2 } from 'lucide-react'
import { useChatService } from '@/lib/services/container'
import { useFileStore } from '@/lib/stores/fileStore'
import { CodeBlock } from '@/components/ui/code-block'

interface FileContextChatProps {
  fileId: string
}

export function FileContextChat({ fileId }: FileContextChatProps) {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const { chatHistory, addChatMessage, loadChatHistory, saveChatHistory, clearChatHistory } = useFileStore()
  const chatService = useChatService()
  
  // Load chat history when component mounts or fileId changes
  useEffect(() => {
    loadChatHistory(fileId)
  }, [fileId, loadChatHistory])
  
  // Save chat history whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      saveChatHistory(fileId)
    }
  }, [chatHistory, fileId, saveChatHistory])
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])
  
  const handleSend = async () => {
    if (!message.trim()) return
    
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
      fileContext: fileId
    }
    
    addChatMessage(userMessage)
    setMessage('')
    setIsLoading(true)
    
    try {
      const response = await chatService.sendMessage(message, { fileId })
      
      const assistantMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant' as const,
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
        codeSnippets: response.codeSnippets
      }
      
      addChatMessage(assistantMessage)
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleClearHistory = () => {
    if (confirm('채팅 기록을 모두 삭제하시겠습니까?')) {
      clearChatHistory(fileId)
    }
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Excel 도우미
          </CardTitle>
          {chatHistory.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              기록 삭제
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Excel 파일에 대해 무엇이든 물어보세요!</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    수식 최적화 방법
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    오류 해결 방법
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    VBA 코드 개선
                  </Badge>
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="flex-shrink-0">
                    {msg.role === 'user' ? (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="prose prose-sm dark:prose-invert">
                      <p>{msg.content}</p>
                    </div>
                    
                    {msg.role === 'assistant' && (msg as any).suggestions?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(msg as any).suggestions.map((suggestion: string, i: number) => (
                          <Badge key={i} variant="secondary" className="cursor-pointer">
                            <Lightbulb className="mr-1 h-3 w-3" />
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {msg.role === 'assistant' && (msg as any).codeSnippets?.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {(msg as any).codeSnippets.map((snippet: any, i: number) => (
                          <div key={i}>
                            <div className="flex items-center gap-2 mb-1">
                              <Code className="h-4 w-4" />
                              <span className="text-xs font-medium">{snippet.language}</span>
                            </div>
                            <CodeBlock 
                              code={snippet.code} 
                              language={snippet.language}
                              className="text-sm"
                            />
                            {snippet.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {snippet.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        
        <div className="mt-4 flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Excel 파일에 대해 질문하세요..."
            className="min-h-[80px] resize-none"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || isLoading}
            className="px-8"
          >
            {isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}