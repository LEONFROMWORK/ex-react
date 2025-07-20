'use client';

import { useState } from 'react';
import { MultiFileAnalyzer } from '@/components/ai/MultiFileAnalyzer';
import { AnalysisResultView } from '@/components/ai/AnalysisResultView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet, Sparkles } from 'lucide-react';

export default function ExcelAnalyzerPage() {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalysisComplete = (result: any) => {
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  const handleApplyCorrection = async (correction: any) => {
    // TODO: 실제 수정 적용 API 호출
    console.log('Applying correction:', correction);
  };

  const handleDownloadCorrected = async () => {
    // TODO: 수정된 파일 다운로드 API 호출
    console.log('Downloading corrected file');
  };

  const handleReanalyze = () => {
    setAnalysisResult(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Excel AI 분석</h1>
            <p className="text-gray-600">Excel 파일과 스크린샷을 비교 분석하여 문제를 해결합니다</p>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      {!analysisResult ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              새로운 분석 시작
            </CardTitle>
            <CardDescription>
              Excel 파일과 스크린샷을 업로드하면 AI가 차이점을 분석하고 해결 방법을 제안합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MultiFileAnalyzer 
              onAnalysisComplete={handleAnalysisComplete}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 분석 결과 */}
          <AnalysisResultView
            result={analysisResult}
            onApplyCorrection={handleApplyCorrection}
            onDownloadCorrected={handleDownloadCorrected}
            onReanalyze={handleReanalyze}
          />
        </div>
      )}

      {/* 사용 예시 */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">사용 시나리오</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scenario1" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scenario1">시나리오 1</TabsTrigger>
              <TabsTrigger value="scenario2">시나리오 2</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scenario1" className="space-y-2 mt-4">
              <h3 className="font-semibold">문제가 있는 Excel 파일 분석</h3>
              <p className="text-sm text-gray-600">
                1. 오류가 발생한 Excel 파일을 업로드합니다.<br />
                2. 문제가 되는 부분의 스크린샷을 업로드합니다.<br />
                3. &quot;이 부분의 숫자가 왜 오류가 나고 있는지 궁금해&quot;라고 입력합니다.<br />
                4. AI가 파일과 이미지를 비교 분석하여 원인과 해결책을 제시합니다.
              </p>
            </TabsContent>
            
            <TabsContent value="scenario2" className="space-y-2 mt-4">
              <h3 className="font-semibold">Excel 기능 개선 요청</h3>
              <p className="text-sm text-gray-600">
                1. 수정하고 싶은 Excel 파일을 업로드합니다.<br />
                2. 변경하고 싶은 부분의 스크린샷을 업로드합니다.<br />
                3. &quot;이 부분의 기능을 자동화하고 차트를 추가하고 싶어&quot;라고 입력합니다.<br />
                4. AI가 구체적인 수정 방법과 수식을 제안합니다.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}