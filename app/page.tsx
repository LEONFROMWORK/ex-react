import Link from "next/link";
import { FileSpreadsheet, BarChart3, Upload, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              엑셀 작업을 더 스마트하게
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              AI 기반 엑셀 오류 분석 및 자동화 솔루션으로 
              업무 효율성을 극대화하세요
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              시작하기
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="group">
            <div className="h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
              <FileSpreadsheet className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              스마트 오류 감지
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              AI가 엑셀 파일의 오류를 자동으로 감지하고 
              해결 방법을 제안합니다
            </p>
          </div>

          <div className="group">
            <div className="h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
              <BarChart3 className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              데이터 시각화
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              복잡한 데이터를 직관적인 차트와 그래프로 
              쉽게 변환합니다
            </p>
          </div>

          <div className="group">
            <div className="h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
              <Zap className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              자동화 워크플로우
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              반복적인 작업을 자동화하여 
              시간을 절약하세요
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            관리자 전용 시스템입니다. 승인된 계정으로 로그인하세요.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 엑셀앱. 모든 권리 보유.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                이용약관
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}