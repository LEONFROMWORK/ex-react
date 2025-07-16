'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, FileSpreadsheet, Wand2, Download, Clock, TrendingUp } from 'lucide-react'
import { GenerateFromPromptPanel } from './GenerateFromPromptPanel'
import { TemplateGallery } from './TemplateGallery'
import { RecentGenerations } from './RecentGenerations'
import { motion } from 'framer-motion'

export function ExcelGenerationDashboard() {
  const [activeTab, setActiveTab] = useState('prompt')

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-2"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Excel 생성기
        </h1>
        <p className="text-muted-foreground">
          프롬프트나 템플릿을 사용하여 전문적인 Excel 파일을 즉시 생성하세요
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">이번 달 생성</p>
                <p className="text-2xl font-bold">156</p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +23% 증가
                </p>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950 dark:to-background">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">인기 템플릿</p>
                <p className="text-2xl font-bold">재무 보고서</p>
                <p className="text-xs text-muted-foreground mt-1">
                  45회 사용
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-background">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">평균 생성 시간</p>
                <p className="text-2xl font-bold">8.5초</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI 최적화됨
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Excel 파일 생성</CardTitle>
            <CardDescription>
              AI를 활용하여 필요한 Excel 파일을 빠르게 생성하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prompt" className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  AI 프롬프트
                </TabsTrigger>
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  템플릿
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prompt" className="space-y-4">
                <GenerateFromPromptPanel />
              </TabsContent>

              <TabsContent value="template" className="space-y-4">
                <TemplateGallery />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Generations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <RecentGenerations />
      </motion.div>
    </div>
  )
}