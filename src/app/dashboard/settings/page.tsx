"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationSettings } from "@/components/settings/NotificationSettings"
import { Settings, User, Shield, Bell } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          설정
        </h1>
        <p className="text-muted-foreground mt-2">
          계정 설정 및 서비스 환경을 관리하세요
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            프로필
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            알림
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            보안
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="text-center py-8">
            <p className="text-muted-foreground">프로필 설정은 준비 중입니다.</p>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="security">
          <div className="text-center py-8">
            <p className="text-muted-foreground">보안 설정은 준비 중입니다.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}