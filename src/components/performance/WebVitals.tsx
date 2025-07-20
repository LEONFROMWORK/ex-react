'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

function sendToAnalytics(metric: any) {
  // 프로덕션에서는 실제 분석 서비스로 전송
  if (process.env.NODE_ENV === 'production') {
    // PostHog, Google Analytics, Vercel Analytics 등으로 전송
    console.log('Web Vitals:', metric)
  }
}

export function WebVitals() {
  useEffect(() => {
    // Core Web Vitals 측정
    onCLS(sendToAnalytics)
    onINP(sendToAnalytics)
    onFCP(sendToAnalytics)
    onLCP(sendToAnalytics)
    onTTFB(sendToAnalytics)
  }, [])

  return null // 렌더링할 UI 없음
}