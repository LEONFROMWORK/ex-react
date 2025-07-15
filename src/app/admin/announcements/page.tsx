"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AnnouncementForm } from "@/components/admin/AnnouncementForm"
import { AnnouncementList } from "@/components/admin/AnnouncementList"
import { Plus, Megaphone } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/announcements")
      if (!response.ok) {
        throw new Error("Failed to fetch announcements")
      }
      const data = await response.json()
      setAnnouncements(data.announcements || [])
    } catch (error) {
      console.error("Error fetching announcements:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: any) => {
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to create announcement")
      }

      setShowCreateDialog(false)
      fetchAnnouncements()
    } catch (error) {
      console.error("Error creating announcement:", error)
    }
  }

  const handleUpdate = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update announcement")
      }

      fetchAnnouncements()
    } catch (error) {
      console.error("Error updating announcement:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 공지사항을 삭제하시겠습니까?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete announcement")
      }

      fetchAnnouncements()
    } catch (error) {
      console.error("Error deleting announcement:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">공지사항 관리</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          새 공지사항
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            공지사항 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementList
            announcements={announcements}
            loading={loading}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 공지사항 작성</DialogTitle>
            <DialogDescription>
              사용자에게 표시될 공지사항을 작성하세요.
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}