'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Image, Loader2, Star, MessageSquare } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface AnalysisResult {
  analysis: string;
  confidence: number;
  sessionId?: string;
  metadata?: {
    model: string;
    processingTime: number;
    optimizations: string[];
    experimentInfo?: {
      experimentId: string;
      variantId: string;
    };
  };
}

export function ExcelAnalyzer() {
  const [analysisType, setAnalysisType] = useState<'text' | 'image'>('text');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 피드백 상태
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');

  // 파일 드롭존
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setImageFile(acceptedFiles[0]);
      setAnalysisType('image');
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1
  });

  // 분석 실행
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let requestContent: string;
      
      if (analysisType === 'image' && imageFile) {
        // 이미지를 base64로 변환
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
        requestContent = base64;
      } else {
        requestContent = content;
      }

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: analysisType,
          content: requestContent,
          options: {
            language: 'ko',
            analysisDepth: 'detailed',
            includeRecommendations: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('분석 요청 실패');
      }

      const data = await response.json();
      setResult(data.data);
      
      // 피드백 UI 표시
      if (data.data.sessionId) {
        setShowFeedback(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 피드백 제출
  const handleFeedbackSubmit = async () => {
    if (!result?.sessionId || rating === 0) return;

    try {
      await fetch('/api/ai/analyze', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          rating,
          accuracy: rating,
          usefulness: rating,
          comments: feedbackComments
        })
      });

      setShowFeedback(false);
      alert('피드백이 제출되었습니다. 감사합니다!');
    } catch (err) {
      console.error('피드백 제출 실패:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 입력 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>Excel 분석</CardTitle>
          <CardDescription>
            텍스트 질문이나 Excel 스크린샷을 업로드하여 AI 분석을 받아보세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 분석 유형 선택 */}
          <RadioGroup value={analysisType} onValueChange={(v) => setAnalysisType(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id="text" />
              <Label htmlFor="text" className="flex items-center gap-2 cursor-pointer">
                <FileText className="w-4 h-4" />
                텍스트 질문
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="image" id="image" />
              <Label htmlFor="image" className="flex items-center gap-2 cursor-pointer">
                <Image className="w-4 h-4" />
                이미지 업로드
              </Label>
            </div>
          </RadioGroup>

          {/* 입력 영역 */}
          {analysisType === 'text' ? (
            <Textarea
              placeholder="Excel 관련 질문을 입력하세요... (예: VLOOKUP 함수 사용법을 알려주세요)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}`}
            >
              <input {...getInputProps()} />
              {imageFile ? (
                <div className="space-y-2">
                  <Image className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-sm">{imageFile.name}</p>
                  <p className="text-xs text-gray-500">클릭하여 다른 이미지 선택</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <p>이미지를 드래그하거나 클릭하여 업로드</p>
                  <p className="text-sm text-gray-500">PNG, JPG, JPEG 지원</p>
                </div>
              )}
            </div>
          )}

          {/* 분석 버튼 */}
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (analysisType === 'text' ? !content : !imageFile)}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                분석 중...
              </>
            ) : (
              '분석 시작'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 에러 표시 */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 분석 결과 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>분석 결과</CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>신뢰도: {(result.confidence * 100).toFixed(1)}%</span>
              <Progress value={result.confidence * 100} className="w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap">{result.analysis}</div>
            </div>

            {/* 메타데이터 */}
            {result.metadata && (
              <div className="pt-4 border-t space-y-2 text-sm text-gray-500">
                <p>모델: {result.metadata.model}</p>
                <p>처리 시간: {result.metadata.processingTime}ms</p>
                {result.metadata.optimizations.length > 0 && (
                  <p>최적화: {result.metadata.optimizations.join(', ')}</p>
                )}
                {result.metadata.experimentInfo && (
                  <p className="text-xs">
                    실험 ID: {result.metadata.experimentInfo.experimentId}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 피드백 섹션 */}
      {showFeedback && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              피드백
            </CardTitle>
            <CardDescription>
              분석 결과가 도움이 되셨나요? 의견을 공유해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 별점 */}
            <div className="flex items-center gap-2">
              <span className="text-sm">평가:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 코멘트 */}
            <Textarea
              placeholder="추가 의견이 있으시면 작성해주세요..."
              value={feedbackComments}
              onChange={(e) => setFeedbackComments(e.target.value)}
              rows={3}
            />

            <Button
              onClick={handleFeedbackSubmit}
              disabled={rating === 0}
              variant="outline"
              className="w-full"
            >
              피드백 제출
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}