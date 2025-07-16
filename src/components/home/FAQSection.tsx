'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export function FAQSection() {
  const canDoItems = [
    {
      question: "VLOOKUP, INDEX/MATCH 등 함수 오류를 해결할 수 있나요?",
      answer: "네, 가능합니다. #N/A, #REF!, #VALUE! 등의 오류 원인을 진단하고, 데이터 형식 불일치, 범위 오류, 공백 문제 등을 찾아 즉시 사용 가능한 수정된 수식을 제공합니다."
    },
    {
      question: "순환 참조 오류를 찾고 해결할 수 있나요?",
      answer: "네, 가능합니다. 복잡한 스프레드시트에서도 순환 참조가 발생한 정확한 위치를 찾아내고, 순환 고리를 시각화하여 보여드리며, 해결 방안을 제시합니다."
    },
    {
      question: "텍스트로 저장된 숫자를 변환할 수 있나요?",
      answer: "네, 가능합니다. VALUE(), TEXT(), TRIM() 등의 함수를 활용한 변환 방법과 대량 데이터 일괄 변환을 위한 VBA 코드까지 제공합니다."
    },
    {
      question: "피벗 테이블 문제를 해결할 수 있나요?",
      answer: "네, 가능합니다. 데이터 범위 설정, 빈 셀 처리, 그룹화 오류, 필터 문제 등 피벗 테이블 관련 대부분의 문제를 진단하고 해결책을 제시합니다."
    },
    {
      question: "VBA 매크로의 보안 위험을 검사할 수 있나요?",
      answer: "네, 가능합니다. Shell 명령, CreateObject, Kill 등 위험한 코드를 감지하고, 성능 문제를 일으킬 수 있는 패턴을 찾아 개선안을 제시합니다."
    },
    {
      question: "Excel 파일의 성능을 개선할 수 있나요?",
      answer: "네, 부분적으로 가능합니다. 비효율적인 수식 패턴을 찾아 최적화 방안을 제시하고, Select/Activate 사용 최소화, 배열 수식 활용 등의 개선 방법을 안내합니다."
    }
  ]

  const cannotDoItems = [
    {
      question: "손상된 Excel 파일을 복구할 수 있나요?",
      answer: "아니요, 불가능합니다. 물리적으로 손상된 파일의 복구는 전문 복구 도구가 필요합니다. 다만 파일을 여는 다양한 방법과 예방법은 안내해 드릴 수 있습니다."
    },
    {
      question: "Excel 버전 간 호환성 문제를 완벽히 해결할 수 있나요?",
      answer: "아니요, 제한적입니다. 각 버전의 기능 차이는 안내할 수 있지만, 새로운 함수를 이전 버전에서 작동하게 만들 수는 없습니다. 대체 방법은 제시 가능합니다."
    },
    {
      question: "실시간 외부 데이터 연동 문제를 해결할 수 있나요?",
      answer: "아니요, 제한적입니다. API 연결, 데이터베이스 연동 등의 설정 방법은 안내할 수 있지만, 네트워크나 권한 문제는 직접 해결할 수 없습니다."
    },
    {
      question: "복잡한 차트의 시각적 디자인을 자동으로 개선할 수 있나요?",
      answer: "아니요, 불가능합니다. 차트 생성 방법과 기본 설정은 안내할 수 있지만, 미적 감각이 필요한 디자인 작업은 사용자가 직접 해야 합니다."
    },
    {
      question: "OneDrive/SharePoint 동기화 문제를 해결할 수 있나요?",
      answer: "아니요, 제한적입니다. 일반적인 해결 방법은 제시할 수 있지만, 서버나 네트워크 관련 문제는 IT 관리자의 도움이 필요합니다."
    }
  ]

  const partiallyDoItems = [
    {
      question: "복잡한 중첩 함수 오류를 해결할 수 있나요?",
      answer: "부분적으로 가능합니다. 일반적인 중첩 함수 패턴은 분석 가능하지만, 매우 복잡한 경우 단계별로 분해하여 확인하는 방법을 안내합니다.",
      limitations: "10단계 이상 중첩된 함수나 사용자 정의 함수가 포함된 경우 제한적"
    },
    {
      question: "VBA 코드를 디버깅할 수 있나요?",
      answer: "부분적으로 가능합니다. 문법 오류, 일반적인 런타임 오류는 찾을 수 있지만, 복잡한 로직 오류는 디버깅 방법을 안내하는 수준입니다.",
      limitations: "외부 라이브러리 참조, COM 객체 관련 문제는 해결 어려움"
    },
    {
      question: "대용량 데이터 처리 문제를 해결할 수 있나요?",
      answer: "부분적으로 가능합니다. Power Query 활용법, 데이터 모델 최적화 방법을 제시할 수 있지만, 하드웨어 한계는 극복할 수 없습니다.",
      limitations: "100만 행 이상의 데이터는 Excel 자체의 한계"
    }
  ]

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 dark:text-white">
            자주 묻는 질문
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Exhell이 해결할 수 있는 것과 없는 것을 명확히 알려드립니다
          </p>
        </div>

        <div className="grid gap-8">
          {/* 할 수 있는 것 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                해결 가능한 문제들
              </CardTitle>
              <CardDescription>
                AI와 전문 분석 모듈로 즉시 해결 가능한 Excel 문제들입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {canDoItems.map((item, index) => (
                  <AccordionItem key={`can-${index}`} value={`can-${index}`}>
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-gray-600 dark:text-gray-300">
                        {item.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* 부분적으로 가능한 것 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                부분적으로 해결 가능한 문제들
              </CardTitle>
              <CardDescription>
                기본적인 해결책은 제공하지만 상황에 따라 제한이 있을 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {partiallyDoItems.map((item, index) => (
                  <AccordionItem key={`partial-${index}`} value={`partial-${index}`}>
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                        {item.answer}
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ 제한사항: {item.limitations}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* 할 수 없는 것 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-500" />
                해결할 수 없는 문제들
              </CardTitle>
              <CardDescription>
                시스템의 한계로 직접 해결은 불가능하지만 대안을 제시할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {cannotDoItems.map((item, index) => (
                  <AccordionItem key={`cannot-${index}`} value={`cannot-${index}`}>
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-gray-600 dark:text-gray-300">
                        {item.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* 추가 안내 */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            더 궁금한 점이 있으신가요?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Excel 분석 도구에서 직접 질문해보세요. AI가 실시간으로 답변해드립니다.
          </p>
        </div>
      </div>
    </section>
  )
}