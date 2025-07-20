'use client'

import AnalysisHistoryView from '@/components/ai/AnalysisHistoryView';
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget"

export default function HistoryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AnalysisHistoryView />
      
      {/* 피드백 위젯 */}
      <FeedbackWidget />
    </div>
  )
}