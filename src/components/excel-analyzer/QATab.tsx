'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SearchResult {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
  score: number
  source?: string
  date?: string
}

export function QATab() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [references, setReferences] = useState<SearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchMode, setSearchMode] = useState<'ask' | 'search'>('ask')
  
  const handleSubmit = async () => {
    if (!question.trim()) return
    
    setLoading(true)
    setError(null)
    setAnswer(null)
    setReferences([])
    
    const formData = new FormData()
    formData.append('mode', 'question')
    formData.append('question', question)
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'x-test-user-id': 'user-1' // Mock auth
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('질문 처리 실패')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setAnswer(data.answer)
        setCategory(data.category)
        setKeywords(data.keywords || [])
        setReferences(data.references || [])
      } else {
        throw new Error(data.message || '오류가 발생했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSearch = async () => {
    if (!question.trim()) return
    
    setLoading(true)
    setError(null)
    setSearchResults([])
    
    try {
      const response = await fetch(`/api/analyze?q=${encodeURIComponent(question)}&limit=10`, {
        headers: {
          'x-test-user-id': 'user-1' // Mock auth
        }
      })
      
      if (!response.ok) {
        throw new Error('검색 실패')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data.results || [])
      } else {
        throw new Error(data.message || '검색 중 오류가 발생했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  const popularQuestions = [
    "순환 참조 오류를 해결하는 방법은?",
    "VLOOKUP이 #N/A 오류를 반환합니다",
    "Excel 파일이 너무 느려졌어요",
    "매크로 실행 시 보안 경고가 나타납니다",
    "피벗 테이블이 업데이트되지 않아요"
  ]
  
  return (
    <div className="space-y-6">
      {/* 질문 입력 영역 */}
      <Card>
        <CardHeader>
          <CardTitle>Excel 질문하기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as 'ask' | 'search')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ask">AI에게 질문</TabsTrigger>
              <TabsTrigger value="search">유사 질문 검색</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Textarea
            placeholder="Excel 관련 질문을 입력하세요..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-[100px]"
          />
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              예: "VLOOKUP 함수가 #N/A 오류를 반환하는 이유는?"
            </div>
            <Button
              onClick={searchMode === 'ask' ? handleSubmit : handleSearch}
              disabled={loading || !question.trim()}
            >
              {loading ? '처리 중...' : (searchMode === 'ask' ? '질문하기' : '검색하기')}
            </Button>
          </div>
          
          {/* 인기 질문 */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">자주 묻는 질문:</p>
            <div className="flex flex-wrap gap-2">
              {popularQuestions.map((q, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 오류 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* AI 답변 결과 */}
      {answer && searchMode === 'ask' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>AI 답변</span>
              <div className="flex gap-2">
                {category && <Badge variant="outline">{category}</Badge>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{answer}</div>
            </div>
            
            {keywords.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">관련 키워드:</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 검색 결과 */}
      {searchResults.length > 0 && searchMode === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle>검색 결과 ({searchResults.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <SearchResultCard key={result.id} result={result} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {/* 참고 자료 */}
      {references.length > 0 && searchMode === 'ask' && (
        <Card>
          <CardHeader>
            <CardTitle>참고 자료</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {references.map((ref, index) => (
                  <SearchResultCard key={`ref-${index}`} result={ref} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm flex-1">{result.question}</h4>
            {result.score > 0 && (
              <Badge variant="outline" className="ml-2">
                {Math.round(result.score * 100)}% 일치
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-gray-600 line-clamp-3">{result.answer}</p>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {result.source && <span>출처: {result.source}</span>}
            {result.date && <span>{result.date}</span>}
            {result.category && <Badge variant="secondary" className="text-xs">{result.category}</Badge>}
          </div>
          
          {result.tags && result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {result.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}