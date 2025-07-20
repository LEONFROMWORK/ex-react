'use client';

import React, { useState } from 'react';
import MultiFileAnalyzer from '@/components/ai/MultiFileAnalyzer';
import AnalysisResultView from '@/components/ai/AnalysisResultView';

export default function TestMultiFilePage() {
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleAnalysisComplete = (result: any) => {
    console.log('Analysis result:', result);
    setAnalysisResult(result);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Excel + 이미지 비교 분석 테스트
      </h1>
      
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">테스트 시나리오</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">시나리오 1: 오류 분석</h3>
              <p className="text-sm text-blue-800">
                1. Excel 파일 업로드: /public/samples/test-excel-with-errors.csv<br/>
                2. 스크린샷 업로드: /public/samples/excel-error-screenshot.svg<br/>
                3. 질문: &quot;이부분의 숫자가 왜 오류가 나고 있는지 궁금해 그리고 여기에는 이런 데이터가 나오면 좋겠어&quot;
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">시나리오 2: 기능 개선</h3>
              <p className="text-sm text-green-800">
                1. Excel 파일 업로드: 정상 Excel 파일<br/>
                2. 스크린샷 업로드: 개선하고 싶은 부분 캡처<br/>
                3. 요청: &quot;이부분의 기능을 차트로 변경하고 또 여기에는 이런게 나왔으면 좋겠어&quot;
              </p>
            </div>
          </div>
        </div>
        
        {!analysisResult ? (
          <MultiFileAnalyzer onAnalysisComplete={handleAnalysisComplete} />
        ) : (
          <div className="space-y-6">
            <AnalysisResultView result={analysisResult} />
            <button
              onClick={() => setAnalysisResult(null)}
              className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              새로운 분석 시작
            </button>
          </div>
        )}
      </div>
    </div>
  );
}