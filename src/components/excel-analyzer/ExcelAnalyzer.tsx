'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileAnalysisTab } from './FileAnalysisTab'
import { QATab } from './QATab'

export function ExcelAnalyzer() {
  const [activeTab, setActiveTab] = useState<'file' | 'qa'>('file')
  
  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Excel 분석 도구</h1>
        <p className="text-gray-600">
          Excel 파일의 오류를 자동으로 찾아주고, 질문에 답변해드립니다.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'file' | 'qa')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            파일 분석
          </TabsTrigger>
          <TabsTrigger value="qa" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Q&A 도우미
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="file" className="mt-6">
          <FileAnalysisTab />
        </TabsContent>
        
        <TabsContent value="qa" className="mt-6">
          <QATab />
        </TabsContent>
      </Tabs>
    </div>
  )
}