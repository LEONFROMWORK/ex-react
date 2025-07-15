"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

interface AnnouncementFormProps {
  announcement?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function AnnouncementForm({ announcement, onSubmit, onCancel }: AnnouncementFormProps) {
  const [title, setTitle] = useState(announcement?.title || "")
  const [content, setContent] = useState(announcement?.content || "")
  const [type, setType] = useState(announcement?.type || "INFO")
  const [priority, setPriority] = useState(announcement?.priority || 0)
  const [isActive, setIsActive] = useState(announcement?.isActive ?? true)
  const [startsAt, setStartsAt] = useState<Date | undefined>(
    announcement?.startsAt ? new Date(announcement.startsAt) : undefined
  )
  const [endsAt, setEndsAt] = useState<Date | undefined>(
    announcement?.endsAt ? new Date(announcement.endsAt) : undefined
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.")
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        title,
        content,
        type,
        priority,
        isActive,
        startsAt: startsAt?.toISOString(),
        endsAt: endsAt?.toISOString(),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="공지사항 제목을 입력하세요"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">내용</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="공지사항 내용을 입력하세요"
          className="min-h-[200px]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">유형</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INFO">정보</SelectItem>
              <SelectItem value="WARNING">경고</SelectItem>
              <SelectItem value="UPDATE">업데이트</SelectItem>
              <SelectItem value="MAINTENANCE">점검</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">우선순위</Label>
          <Input
            id="priority"
            type="number"
            min="0"
            max="10"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>시작일 (선택)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startsAt && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startsAt ? format(startsAt, "yyyy년 MM월 dd일", { locale: ko }) : "시작일 선택"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startsAt}
                onSelect={setStartsAt}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>종료일 (선택)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endsAt && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endsAt ? format(endsAt, "yyyy년 MM월 dd일", { locale: ko }) : "종료일 선택"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endsAt}
                onSelect={setEndsAt}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="isActive">즉시 활성화</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          취소
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중..." : announcement ? "수정" : "작성"}
        </Button>
      </div>
    </form>
  )
}