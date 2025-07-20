'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, Image as ImageIcon, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { TierRecommendation } from './TierRecommendation';
import { TierRecommendationEngine } from '@/lib/ai/tier-recommendation';
import { ImageQualityAlert } from './ImageQualityAlert';
import { useAnalysisProgress, AnalysisProgressIndicator } from '@/hooks/useAnalysisProgress';

interface UploadedFile {
  file: File;
  type: 'excel' | 'image';
  preview?: string;
}

interface MultiFileAnalyzerProps {
  onAnalysisComplete?: (result: any) => void;
}

export default function MultiFileAnalyzer({ onAnalysisComplete }: MultiFileAnalyzerProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [tierRecommendation, setTierRecommendation] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<'TIER1' | 'TIER2' | 'TIER3'>('TIER2');
  const [imageQualityIssues, setImageQualityIssues] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // 실시간 진행상황 훅
  const { progress, reset: resetProgress } = useAnalysisProgress(currentSessionId);

  // Excel 파일 드롭존
  const onDropExcel = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setExcelFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps: getExcelRootProps, getInputProps: getExcelInputProps, isDragActive: isExcelDragActive } = useDropzone({
    onDrop: onDropExcel,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    multiple: false
  });

  // 이미지 파일 드롭존
  const onDropImages = useCallback(async (acceptedFiles: File[]) => {
    // 이미지 품질 검증
    const validatedFiles: File[] = [];
    const qualityIssues: any[] = [];
    
    for (const file of acceptedFiles) {
      const issues: string[] = [];
      const suggestions: string[] = [];
      let quality: 'high' | 'medium' | 'low' = 'high';
      
      // 기본 검증: 파일 크기
      if (file.size < 50 * 1024) { // 50KB 미만
        issues.push('파일 크기가 너무 작습니다');
        suggestions.push('고화질로 다시 캡처해주세요');
        quality = 'low';
      } else if (file.size > 10 * 1024 * 1024) { // 10MB 초과
        issues.push('파일 크기가 너무 큽니다');
        suggestions.push('이미지 크기를 줄여주세요 (10MB 이하)');
        continue;
      } else if (file.size < 200 * 1024) { // 200KB 미만
        quality = 'medium';
        suggestions.push('더 선명한 이미지를 위해 PNG 형식 사용 권장');
      }
      
      validatedFiles.push(file);
      
      if (issues.length > 0 || quality !== 'high') {
        qualityIssues.push({
          fileName: file.name,
          issues,
          suggestions,
          quality
        });
      }
    }
    
    setImageQualityIssues(qualityIssues);
    setImageFiles(prev => {
      const newFiles = [...prev, ...validatedFiles];
      // 최대 5개까지만 허용
      return newFiles.slice(0, 5);
    });
  }, []);

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps, isDragActive: isImageDragActive } = useDropzone({
    onDrop: onDropImages,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 5
  });

  // 파일 제거
  const removeExcelFile = () => setExcelFile(null);
  const removeImageFile = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 파일이나 프롬프트가 변경될 때마다 티어 추천 업데이트
  useEffect(() => {
    if (!excelFile && imageFiles.length === 0 && !analysisPrompt) return;
    
    // 임시 사용자 프로필 (실제로는 DB에서 가져옴)
    const userProfile = {
      userId: 'demo-user',
      usageHistory: {
        totalAnalyses: 10,
        errorDetectionCount: 5,
        visualComparisonCount: 3,
        improvementSuggestionCount: 2,
        averageFileSize: 500000,
        averageErrorCount: 3
      },
      subscription: {
        plan: 'pro' as const,
        monthlyBudget: 50,
        remainingCredits: 40
      },
      preferences: {
        speedVsAccuracy: 'balanced' as const,
        costSensitivity: 'medium' as const
      }
    };
    
    // 분석 컨텍스트 생성
    const context = {
      fileSize: excelFile?.size || 0,
      errorCount: 0, // 실제로는 Excel 파싱 후 알 수 있음
      hasImages: imageFiles.length > 0,
      imageCount: imageFiles.length,
      queryComplexity: TierRecommendationEngine.analyzeQueryComplexity(analysisPrompt),
      urgency: 'normal' as const,
      previousAttempts: 0
    };
    
    // 티어 추천
    const recommendation = TierRecommendationEngine.recommendTier(userProfile, context);
    setTierRecommendation(recommendation);
    setSelectedTier(recommendation.recommendedTier);
    
    // 비용 예측
    const costEstimate = TierRecommendationEngine.estimateCost(
      recommendation.recommendedTier,
      context
    );
    setTierRecommendation({
      ...recommendation,
      estimatedCost: costEstimate
    });
  }, [excelFile, imageFiles, analysisPrompt]);

  // 파일 업로드 및 분석
  const handleUploadAndAnalyze = async () => {
    if (!excelFile || imageFiles.length === 0) {
      setError('Excel 파일과 최소 1개의 이미지를 업로드해주세요.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('excelFile', excelFile);
      imageFiles.forEach((file, index) => {
        formData.append(`imageFile${index}`, file);
      });
      formData.append('analysisPrompt', analysisPrompt);

      // 파일 업로드
      const uploadResponse = await fetch('/api/ai/upload-multiple', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('파일 업로드 실패');
      }

      const uploadData = await uploadResponse.json();
      setUploadResult(uploadData.data);
      setCurrentSessionId(uploadData.data.sessionId);
      
      // 즉시 분석 시작
      setIsUploading(false);
      setIsAnalyzing(true);

      // 하이브리드 분석 요청
      const analysisResponse = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'hybrid',
          sessionId: uploadData.data.sessionId,
          query: analysisPrompt,
          selectedTier: selectedTier,
          options: {
            compareMode: true,
            analysisDepth: 'comprehensive'
          }
        })
      });

      if (!analysisResponse.ok) {
        throw new Error('분석 요청 실패');
      }

      const analysisData = await analysisResponse.json();
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisData.data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 파일 업로드 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Excel 파일 업로드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Excel 파일
            </CardTitle>
            <CardDescription>분석할 Excel 파일을 업로드하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {!excelFile ? (
              <div
                {...getExcelRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isExcelDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
                )}
              >
                <input {...getExcelInputProps()} />
                <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Excel 파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  .xlsx, .xls, .csv 지원
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">{excelFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeExcelFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 이미지 파일 업로드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              스크린샷 이미지
            </CardTitle>
            <CardDescription>Excel 스크린샷을 업로드하세요 (최대 5개)</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getImageRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4",
                isImageDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400",
                imageFiles.length >= 5 && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getImageInputProps()} disabled={imageFiles.length >= 5} />
              <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                이미지를 드래그하거나 클릭하여 선택
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, JPEG, GIF, WebP 지원
              </p>
            </div>

            {/* 업로드된 이미지 목록 */}
            {imageFiles.length > 0 && (
              <div className="space-y-2">
                {imageFiles.map((file, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImageFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 분석 프롬프트 */}
      <Card>
        <CardHeader>
          <CardTitle>분석 요청</CardTitle>
          <CardDescription>
            Excel 파일과 스크린샷을 어떻게 분석할지 설명해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="예: 이 부분의 숫자가 왜 오류가 나고 있는지 궁금해. 그리고 여기에는 이런 데이터가 나오면 좋겠어..."
            value={analysisPrompt}
            onChange={(e) => setAnalysisPrompt(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* 이미지 품질 경고 */}
      {imageQualityIssues.length > 0 && (
        <div className="space-y-2">
          {imageQualityIssues.map((issue, idx) => (
            <ImageQualityAlert
              key={idx}
              issues={issue.issues}
              suggestions={issue.suggestions}
              quality={issue.quality}
              onRetry={() => {
                setImageFiles(prev => prev.filter(f => f.name !== issue.fileName));
                setImageQualityIssues(prev => prev.filter((_, i) => i !== idx));
              }}
              onIgnore={() => {
                setImageQualityIssues(prev => prev.filter((_, i) => i !== idx));
              }}
            />
          ))}
        </div>
      )}

      {/* AI 티어 추천 */}
      {tierRecommendation && (excelFile || imageFiles.length > 0) && (
        <TierRecommendation
          recommendedTier={tierRecommendation.recommendedTier}
          confidence={tierRecommendation.confidence}
          reasons={tierRecommendation.reasons}
          alternativeTiers={tierRecommendation.alternativeTiers}
          estimatedCost={tierRecommendation.estimatedCost}
          onTierSelect={setSelectedTier}
        />
      )}

      {/* 에러 메시지 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 실시간 진행상황 표시 */}
      {progress && (isUploading || isAnalyzing) && (
        <AnalysisProgressIndicator progress={progress} />
      )}

      {/* 업로드 성공 메시지 */}
      {uploadResult && !isAnalyzing && !progress && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            파일이 성공적으로 업로드되었습니다. 분석을 시작합니다...
          </AlertDescription>
        </Alert>
      )}

      {/* 분석 버튼 */}
      <Button
        onClick={handleUploadAndAnalyze}
        disabled={!excelFile || imageFiles.length === 0 || isUploading || isAnalyzing}
        className="w-full"
        size="lg"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            파일 업로드 중...
          </>
        ) : isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI 분석 중...
          </>
        ) : (
          '파일 업로드 및 분석 시작'
        )}
      </Button>
    </div>
  );
}