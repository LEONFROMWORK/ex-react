"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { 
  Bug, 
  Lightbulb, 
  Heart, 
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  MessageCircle,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface FeedbackItem {
  id: string
  type: 'bug' | 'feature' | 'improvement' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  subject: string
  description: string
  email?: string
  userId?: string
  user?: {
    id: string
    name: string
    email: string
  }
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  metadata?: any
  screenshotPath?: string
  response?: string
  respondedBy?: string
  respondedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const typeIcons = {
  bug: Bug,
  feature: Lightbulb,
  improvement: Heart,
  other: MessageSquare
}

const typeLabels = {
  bug: '버그 신고',
  feature: '기능 제안',
  improvement: '개선 사항',
  other: '기타'
}

const priorityColors = {
  low: 'secondary',
  medium: 'default',
  high: 'warning',
  urgent: 'destructive'
} as const

const statusIcons = {
  OPEN: Clock,
  IN_PROGRESS: Loader2,
  RESOLVED: CheckCircle,
  CLOSED: XCircle
}

const statusLabels = {
  OPEN: '열림',
  IN_PROGRESS: '진행 중',
  RESOLVED: '해결됨',
  CLOSED: '닫힘'
}

export default function AdminFeedbackPage() {
  const { toast } = useToast()
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)
  const [responseDialog, setResponseDialog] = useState(false)
  const [response, setResponse] = useState('')
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    status: '',
    search: ''
  })
  const [currentTab, setCurrentTab] = useState('all')

  useEffect(() => {
    fetchFeedbacks()
  }, [filters])

  const fetchFeedbacks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.priority) params.append('priority', filters.priority)
      if (filters.status) params.append('status', filters.status)
      
      const response = await fetch(`/api/feedback?${params}`)
      if (!response.ok) throw new Error('Failed to fetch feedbacks')
      
      const data = await response.json()
      setFeedbacks(data.feedbacks)
    } catch (error) {
      toast({
        title: "오류",
        description: "피드백을 불러오는데 실패했습니다.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (feedbackId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!response.ok) throw new Error('Failed to update status')
      
      toast({
        title: "상태 변경",
        description: "피드백 상태가 변경되었습니다."
      })
      
      fetchFeedbacks()
    } catch (error) {
      toast({
        title: "오류",
        description: "상태 변경에 실패했습니다.",
        variant: "destructive"
      })
    }
  }

  const handleResponseSubmit = async () => {
    if (!selectedFeedback || !response.trim()) return
    
    try {
      const res = await fetch(`/api/feedback/${selectedFeedback.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      })
      
      if (!res.ok) throw new Error('Failed to submit response')
      
      toast({
        title: "답변 전송",
        description: "피드백에 대한 답변이 전송되었습니다."
      })
      
      setResponseDialog(false)
      setResponse('')
      setSelectedFeedback(null)
      fetchFeedbacks()
    } catch (error) {
      toast({
        title: "오류",
        description: "답변 전송에 실패했습니다.",
        variant: "destructive"
      })
    }
  }

  const getFilteredFeedbacks = () => {
    let filtered = feedbacks
    
    if (currentTab === 'urgent') {
      filtered = filtered.filter(f => f.priority === 'urgent')
    } else if (currentTab === 'open') {
      filtered = filtered.filter(f => f.status === 'OPEN')
    } else if (currentTab === 'in_progress') {
      filtered = filtered.filter(f => f.status === 'IN_PROGRESS')
    }
    
    if (filters.search) {
      filtered = filtered.filter(f => 
        f.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
        f.description.toLowerCase().includes(filters.search.toLowerCase())
      )
    }
    
    return filtered
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">피드백 관리</h1>
        <p className="text-muted-foreground mt-2">
          사용자들이 보낸 피드백을 관리하고 답변할 수 있습니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">전체 피드백</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{feedbacks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">열린 피드백</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {feedbacks.filter(f => f.status === 'OPEN').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">긴급 피드백</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {feedbacks.filter(f => f.priority === 'urgent').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">해결됨</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {feedbacks.filter(f => f.status === 'RESOLVED').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="검색..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full"
              />
            </div>
            <Select 
              value={filters.type} 
              onValueChange={(value) => setFilters({ ...filters, type: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체 유형</SelectItem>
                <SelectItem value="bug">버그</SelectItem>
                <SelectItem value="feature">기능 제안</SelectItem>
                <SelectItem value="improvement">개선 사항</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={filters.priority} 
              onValueChange={(value) => setFilters({ ...filters, priority: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="우선순위" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체 우선순위</SelectItem>
                <SelectItem value="low">낮음</SelectItem>
                <SelectItem value="medium">보통</SelectItem>
                <SelectItem value="high">높음</SelectItem>
                <SelectItem value="urgent">긴급</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체 상태</SelectItem>
                <SelectItem value="OPEN">열림</SelectItem>
                <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
                <SelectItem value="RESOLVED">해결됨</SelectItem>
                <SelectItem value="CLOSED">닫힘</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 피드백 목록 */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="urgent" className="text-red-600">긴급</TabsTrigger>
          <TabsTrigger value="open">열림</TabsTrigger>
          <TabsTrigger value="in_progress">진행 중</TabsTrigger>
        </TabsList>
        
        <TabsContent value={currentTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>유형</TableHead>
                        <TableHead>제목</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>우선순위</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>날짜</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredFeedbacks().map((feedback) => {
                        const TypeIcon = typeIcons[feedback.type]
                        const StatusIcon = statusIcons[feedback.status]
                        
                        return (
                          <TableRow key={feedback.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4" />
                                <span className="text-sm">
                                  {typeLabels[feedback.type]}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{feedback.subject}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {feedback.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {feedback.user ? (
                                <div className="text-sm">
                                  <p>{feedback.user.name}</p>
                                  <p className="text-muted-foreground">
                                    {feedback.user.email}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {feedback.email || '익명'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={priorityColors[feedback.priority]}>
                                {feedback.priority === 'urgent' && (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {feedback.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusIcon className="h-4 w-4" />
                                <span className="text-sm">
                                  {statusLabels[feedback.status]}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(feedback.createdAt), 'MM/dd HH:mm', { locale: ko })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedFeedback(feedback)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedFeedback(feedback)
                                    setResponseDialog(true)
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      
                      {getFilteredFeedbacks().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">피드백이 없습니다</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 상세 보기 다이얼로그 */}
      {selectedFeedback && !responseDialog && (
        <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                피드백 상세 정보
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">유형</p>
                  <div className="flex items-center gap-2 mt-1">
                    {React.createElement(typeIcons[selectedFeedback.type], { className: "h-4 w-4" })}
                    <span>{typeLabels[selectedFeedback.type]}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">우선순위</p>
                  <Badge variant={priorityColors[selectedFeedback.priority]} className="mt-1">
                    {selectedFeedback.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">상태</p>
                  <Select 
                    value={selectedFeedback.status} 
                    onValueChange={(value) => handleStatusChange(selectedFeedback.id, value)}
                  >
                    <SelectTrigger className="w-[140px] mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">열림</SelectItem>
                      <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
                      <SelectItem value="RESOLVED">해결됨</SelectItem>
                      <SelectItem value="CLOSED">닫힘</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">제출일</p>
                  <p className="mt-1">
                    {format(new Date(selectedFeedback.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">제목</p>
                <p className="mt-1 font-medium">{selectedFeedback.subject}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">설명</p>
                <p className="mt-1 whitespace-pre-wrap">{selectedFeedback.description}</p>
              </div>
              
              {selectedFeedback.metadata && (
                <div>
                  <p className="text-sm text-muted-foreground">메타데이터</p>
                  <pre className="mt-1 text-xs bg-muted p-2 rounded">
                    {JSON.stringify(selectedFeedback.metadata, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedFeedback.response && (
                <div>
                  <p className="text-sm text-muted-foreground">답변</p>
                  <p className="mt-1 whitespace-pre-wrap bg-muted p-3 rounded">
                    {selectedFeedback.response}
                  </p>
                  {selectedFeedback.respondedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      답변일: {format(new Date(selectedFeedback.respondedAt), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 답변 다이얼로그 */}
      <Dialog open={responseDialog} onOpenChange={setResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>피드백 답변</DialogTitle>
            <DialogDescription>
              {selectedFeedback?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="답변을 입력하세요..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResponseDialog(false)}>
                취소
              </Button>
              <Button onClick={handleResponseSubmit}>
                답변 전송
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}