"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AnnouncementForm } from "./AnnouncementForm"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Edit, Trash2, Info, AlertTriangle, RefreshCw, Wrench, Loader2 } from "lucide-react"

interface AnnouncementListProps {
  announcements: any[]
  loading: boolean
  onUpdate: (id: string, data: any) => void
  onDelete: (id: string) => void
}

export function AnnouncementList({ announcements, loading, onUpdate, onDelete }: AnnouncementListProps) {
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setProcessingId(id)
    try {
      await onUpdate(id, { isActive })
    } finally {
      setProcessingId(null)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      INFO: Info,
      WARNING: AlertTriangle,
      UPDATE: RefreshCw,
      MAINTENANCE: Wrench,
    }
    const Icon = icons[type as keyof typeof icons] || Info
    return <Icon className="h-4 w-4" />
  }

  const getTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      INFO: "default",
      WARNING: "destructive",
      UPDATE: "secondary",
      MAINTENANCE: "outline",
    }

    return (
      <Badge variant={variants[type] || "default"} className="flex items-center gap-1">
        {getTypeIcon(type)}
        {type}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">아직 공지사항이 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>우선순위</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>작성일</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.map((announcement) => (
              <TableRow key={announcement.id}>
                <TableCell className="font-medium max-w-xs truncate">
                  {announcement.title}
                </TableCell>
                <TableCell>{getTypeBadge(announcement.type)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{announcement.priority}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {announcement.startsAt && (
                      <p>시작: {format(new Date(announcement.startsAt), "MM/dd", { locale: ko })}</p>
                    )}
                    {announcement.endsAt && (
                      <p>종료: {format(new Date(announcement.endsAt), "MM/dd", { locale: ko })}</p>
                    )}
                    {!announcement.startsAt && !announcement.endsAt && (
                      <p className="text-gray-500">상시</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={announcement.isActive}
                    onCheckedChange={(checked) => handleToggleActive(announcement.id, checked)}
                    disabled={processingId === announcement.id}
                  />
                </TableCell>
                <TableCell>
                  {format(new Date(announcement.createdAt), "yyyy.MM.dd", { locale: ko })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingAnnouncement(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(announcement.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingAnnouncement} onOpenChange={() => setEditingAnnouncement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>공지사항 수정</DialogTitle>
            <DialogDescription>
              공지사항 내용을 수정하세요.
            </DialogDescription>
          </DialogHeader>
          {editingAnnouncement && (
            <AnnouncementForm
              announcement={editingAnnouncement}
              onSubmit={async (data) => {
                await onUpdate(editingAnnouncement.id, data)
                setEditingAnnouncement(null)
              }}
              onCancel={() => setEditingAnnouncement(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}