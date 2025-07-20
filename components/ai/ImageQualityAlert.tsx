'use client';

import { useState } from 'react';
import { AlertCircle, Camera, Info, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ImageQualityAlertProps {
  issues: string[];
  suggestions: string[];
  quality: 'high' | 'medium' | 'low';
  onRetry?: () => void;
  onIgnore?: () => void;
}

export function ImageQualityAlert({ 
  issues, 
  suggestions, 
  quality,
  onRetry,
  onIgnore 
}: ImageQualityAlertProps) {
  const [showGuide, setShowGuide] = useState(false);

  if (quality === 'high') return null;

  const alertVariant = quality === 'low' ? 'destructive' : 'default';
  const icon = quality === 'low' ? <AlertCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />;

  return (
    <>
      <Alert variant={alertVariant}>
        {icon}
        <AlertTitle>
          {quality === 'low' ? '이미지 품질 개선 필요' : '이미지 품질 향상 권장'}
        </AlertTitle>
        <AlertDescription className="mt-2">
          <div className="space-y-2">
            {issues.length > 0 && (
              <div>
                <p className="font-semibold mb-1">발견된 문제:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {suggestions.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold mb-1">개선 방법:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {suggestions.slice(0, 2).map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-4">
            <Dialog open={showGuide} onOpenChange={setShowGuide}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Camera className="w-4 h-4 mr-2" />
                  캡처 가이드
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>최적의 스크린샷 촬영 가이드</DialogTitle>
                  <DialogDescription>
                    더 정확한 분석을 위한 스크린샷 촬영 방법
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Windows 사용자</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="font-medium">Snipping Tool (권장)</p>
                        <p className="text-sm text-gray-600">Win + Shift + S 단축키로 필요한 영역만 캡처</p>
                      </div>
                      <div>
                        <p className="font-medium">전체 화면 캡처</p>
                        <p className="text-sm text-gray-600">Print Screen 또는 Alt + Print Screen (활성 창만)</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Mac 사용자</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="font-medium">부분 캡처 (권장)</p>
                        <p className="text-sm text-gray-600">Cmd + Shift + 4로 영역 선택</p>
                      </div>
                      <div>
                        <p className="font-medium">전체 화면</p>
                        <p className="text-sm text-gray-600">Cmd + Shift + 3</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">품질 향상 팁</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          Excel 화면을 100% 배율로 설정
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          필요한 데이터가 모두 보이도록 조정
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          밝은 곳에서 화면 밝기 적절히 조절
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          PNG 형식으로 저장 (JPEG보다 텍스트 선명)
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">피해야 할 것들</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          휴대폰 카메라로 모니터 촬영
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          과도한 압축 또는 크기 축소
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          흐릿하거나 기울어진 이미지
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-600">✗</span>
                          반사광이나 그림자가 있는 사진
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
            
            {onRetry && quality === 'low' && (
              <Button variant="default" size="sm" onClick={onRetry}>
                다시 업로드
              </Button>
            )}
            
            {onIgnore && (
              <Button variant="ghost" size="sm" onClick={onIgnore}>
                계속 진행
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </>
  );
}