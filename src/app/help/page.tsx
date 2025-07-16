"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Search,
  Shield,
  Zap,
  CreditCard,
  HelpCircle,
  BookOpen,
  Video,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">도움말 및 가이드</h1>
        <p className="text-muted-foreground">
          Excel 오류 수정 서비스를 효과적으로 사용하는 방법을 알아보세요
        </p>
      </div>

      <Tabs defaultValue="getting-started" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="getting-started">시작하기</TabsTrigger>
          <TabsTrigger value="features">기능 안내</TabsTrigger>
          <TabsTrigger value="troubleshooting">문제 해결</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        {/* 시작하기 */}
        <TabsContent value="getting-started">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  빠른 시작 가이드
                </CardTitle>
                <CardDescription>
                  5분 안에 첫 번째 Excel 파일을 분석하고 수정해보세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">회원가입 및 로그인</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        간편한 이메일 인증으로 회원가입하면 100개의 무료 토큰을 받습니다.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Excel 파일 업로드</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        분석할 Excel 파일을 끌어다 놓거나 클릭하여 업로드합니다. (최대 50MB)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">자동 분석 및 오류 감지</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI가 수식 오류, 참조 오류, 데이터 문제 등을 자동으로 찾아냅니다.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold">결과 확인 및 다운로드</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        수정된 내용을 확인하고 원본/수정본을 다운로드합니다.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">토큰 사용량</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>기본 분석</span>
                      <Badge variant="secondary">10 토큰</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>수식 오류 수정</span>
                      <Badge variant="secondary">5 토큰/오류</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>VBA 분석</span>
                      <Badge variant="secondary">20 토큰</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>AI 파일 생성</span>
                      <Badge variant="secondary">30 토큰</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">지원 파일 형식</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">.xlsx (Excel 2007+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">.xls (Excel 97-2003)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">.xlsm (VBA 포함)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">최대 50MB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 기능 안내 */}
        <TabsContent value="features">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>주요 기능</CardTitle>
                <CardDescription>
                  Excel 오류 수정 서비스의 강력한 기능들을 활용해보세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="error-detection">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        자동 오류 감지
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">다음과 같은 오류를 자동으로 감지합니다:</p>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                            <div>
                              <strong>수식 오류</strong>: #REF!, #VALUE!, #DIV/0!, 순환 참조 등
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <div>
                              <strong>데이터 일관성</strong>: 형식 불일치, 비어있는 셀, 중복 데이터
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                            <div>
                              <strong>성능 문제</strong>: 휠발성 함수, 복잡한 수식, 비효율적인 참조
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-purple-500 mt-0.5" />
                            <div>
                              <strong>VBA 코드</strong>: 구문 오류, 보안 취약점, 비효율적인 코드
                            </div>
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="auto-fix">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        자동 수정
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">AI가 다음 오류들을 자동으로 수정합니다:</p>
                        <ul className="space-y-2 text-sm">
                          <li>• 깨진 참조 복구 (#REF! 오류)</li>
                          <li>• 순환 참조 해결</li>
                          <li>• 누락된 괄호 및 따옴표 추가</li>
                          <li>• 잘못된 날짜/시간 형식 수정</li>
                          <li>• VLOOKUP을 INDEX/MATCH로 최적화</li>
                          <li>• VBA Option Explicit 추가</li>
                        </ul>
                        <Alert className="mt-3">
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            모든 수정 사항은 상세 리포트에서 확인할 수 있습니다.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="file-generation">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel 파일 생성
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">템플릿 또는 AI를 사용하여 새 Excel 파일을 생성할 수 있습니다:</p>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="border rounded-lg p-3">
                            <h5 className="font-semibold text-sm mb-2">템플릿</h5>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              <li>• 매출 보고서</li>
                              <li>• 재고 관리</li>
                              <li>• 프로젝트 관리</li>
                              <li>• 예산 계획</li>
                            </ul>
                          </div>
                          <div className="border rounded-lg p-3">
                            <h5 className="font-semibold text-sm mb-2">AI 생성</h5>
                            <p className="text-sm text-muted-foreground">
                              원하는 내용을 설명하면 AI가 
                              적절한 구조와 수식을 갖춘 
                              Excel 파일을 생성합니다.
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="version-control">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        버전 관리
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">모든 파일의 변경 사항이 자동으로 저장됩니다:</p>
                        <ul className="space-y-2 text-sm">
                          <li>• 각 수정 작업마다 새 버전 생성</li>
                          <li>• 버전 간 비교 및 차이점 확인</li>
                          <li>• 이전 버전으로 즉시 복원 가능</li>
                          <li>• 변경 사항 및 수정자 기록</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 문제 해결 */}
        <TabsContent value="troubleshooting">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>자주 발생하는 문제와 해결 방법</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>파일 업로드 실패</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• 파일 크기가 50MB를 초과하는지 확인하세요</li>
                        <li>• 파일이 암호화되어 있다면 암호를 해제하세요</li>
                        <li>• 파일 형식이 .xlsx, .xls, .xlsm인지 확인하세요</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>분석 시간이 오래 걸림</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• 파일에 많은 수의 수식이 포함되어 있을 수 있습니다</li>
                        <li>• VBA 코드가 포함된 파일은 추가 분석 시간이 필요합니다</li>
                        <li>• 대용량 파일의 경우 5-10분 소요될 수 있습니다</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>토큰 부족</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• 대시보드에서 잔여 토큰을 확인하세요</li>
                        <li>• 토큰 구매 페이지에서 추가 토큰을 구매할 수 있습니다</li>
                        <li>• 친구 초대로 보너스 토큰을 받을 수 있습니다</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>차트가 사라짐</strong>
                      <ul className="mt-2 space-y-1 text-sm">
                        <li>• 기존 차트는 자동으로 유지됩니다</li>
                        <li>• 데이터가 수정되면 차트도 자동 업데이트됩니다</li>
                        <li>• 차트 범위가 잘못된 경우 Excel에서 직접 수정해야 합니다</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>자주 묻는 질문</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="q1">
                    <AccordionTrigger>
                      어떤 종류의 Excel 오류를 수정할 수 있나요?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        수식 오류(#REF!, #VALUE!, #DIV/0! 등), 순환 참조, 
                        데이터 일관성 문제, VBA 코드 오류, 성능 문제 등 
                        대부분의 Excel 오류를 자동으로 감지하고 수정할 수 있습니다.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q2">
                    <AccordionTrigger>
                      원본 파일은 안전한가요?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        네, 원본 파일은 절대 수정되지 않습니다. 
                        모든 수정은 새로운 파일로 저장되며, 
                        버전 관리 시스템을 통해 언제든지 이전 상태로 돌아갈 수 있습니다.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q3">
                    <AccordionTrigger>
                      토큰은 어떻게 받을 수 있나요?
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-sm">
                        <p>토큰을 얻는 방법:</p>
                        <ul className="space-y-1 ml-4">
                          <li>• 회원가입 시 100개 무료 제공</li>
                          <li>• 토큰 구매 (다양한 패키지 선택 가능)</li>
                          <li>• 친구 초대 보너스</li>
                          <li>• 이벤트 참여</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q4">
                    <AccordionTrigger>
                      대용량 파일도 처리 가능한가요?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        최대 50MB까지의 Excel 파일을 처리할 수 있습니다. 
                        더 큰 파일의 경우, 불필요한 시트나 데이터를 제거한 후 
                        업로드하시기를 권장합니다.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q5">
                    <AccordionTrigger>
                      VBA 코드도 수정되나요?
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        네, VBA 코드의 구문 오류, 성능 문제, 보안 취약점 등을 
                        분석하고 수정합니다. Option Explicit 추가, 
                        Select/Activate 제거 등의 기본적인 개선을 자동으로 수행합니다.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>추가 도움말</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-semibold">피드백</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      서비스 개선을 위한 의견을 보내주세요
                    </p>
                  </div>
                  <div className="text-center">
                    <Video className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-semibold">튜토리얼</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      비디오 가이드로 쉽게 배워보세요
                    </p>
                  </div>
                  <div className="text-center">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-semibold">고객 지원</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      support@excelfix.com
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}