'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Code2 } from 'lucide-react'

export function VBAExtractionDashboard() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-6 h-6" />
            VBA 코드 추출
          </CardTitle>
          <CardDescription>
            Excel 파일에서 VBA 매크로 코드를 추출하고 보안 위험을 분석합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Code2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">개발 중</h3>
            <p className="text-muted-foreground">
              VBA 추출 기능은 현재 개발 중입니다.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              곧 사용 가능합니다!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}