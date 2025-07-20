'use client';

import { useState } from 'react';
import { 
  FileSpreadsheet, 
  Image as ImageIcon, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Lightbulb,
  FileText,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AnalysisResultViewProps {
  result: {
    analysis: string;
    confidence?: number;
    sessionId?: string;
    comparisons?: Array<{
      aspect: string;
      excelValue: any;
      imageValue: any;
      difference: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    corrections?: Array<{
      cell: string;
      currentValue: any;
      suggestedValue: any;
      reason: string;
      confidence: number;
    }>;
    metadata?: any;
  };
}

export default function AnalysisResultView({ result }: AnalysisResultViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (type: 'excel' | 'pdf' | 'both') => {
    if (!result.sessionId) {
      alert('세션 ID가 없습니다.');
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/ai/download-result?sessionId=${result.sessionId}&type=${type}`);
      
      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      if (type === 'excel') {
        a.download = `corrected-excel-${result.sessionId}.xlsx`;
      } else if (type === 'pdf') {
        a.download = `analysis-report-${result.sessionId}.pdf`;
      } else {
        a.download = `analysis-results-${result.sessionId}.zip`;
      }
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
    }
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <AlertCircle className="w-4 h-4" />;
      case 'high': return <XCircle className="w-4 h-4" />;
    }
  };

  // Markdown을 간단한 HTML로 변환
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-semibold mt-6 mb-3">{line.replace('### ', '')}</h3>;
        } else if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-bold mt-6 mb-4">{line.replace('## ', '')}</h2>;
        } else if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-semibold my-2">{line.replace(/\*\*/g, '')}</p>;
        } else if (line.startsWith('- ')) {
          return <li key={i} className="ml-4 my-1">{line.replace('- ', '')}</li>;
        } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
          return <li key={i} className="ml-4 my-1 list-decimal list-inside">{line.substring(3)}</li>;
        } else if (line.trim() === '') {
          return <br key={i} />;
        } else {
          return <p key={i} className="my-2">{line}</p>;
        }
      });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI 분석 결과</CardTitle>
              {result.sessionId && (
                <CardDescription className="mt-1">세션 ID: {result.sessionId}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {result.confidence && (
                <Badge variant="outline">
                  신뢰도: {(result.confidence * 100).toFixed(0)}%
                </Badge>
              )}
              {result.sessionId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          다운로드 중...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          다운로드
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload('excel')}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      수정된 Excel 파일
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                      <FileText className="w-4 h-4 mr-2" />
                      분석 보고서 (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('both')}>
                      <Package className="w-4 h-4 mr-2" />
                      전체 다운로드 (ZIP)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">전체 분석</TabsTrigger>
          <TabsTrigger value="comparisons">비교 결과</TabsTrigger>
          <TabsTrigger value="corrections">수정 제안</TabsTrigger>
        </TabsList>

        {/* 전체 분석 탭 */}
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none">
                {renderMarkdown(result.analysis)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 비교 결과 탭 */}
        <TabsContent value="comparisons" className="mt-6">
          {result.comparisons && result.comparisons.length > 0 ? (
            <div className="space-y-4">
              {result.comparisons.map((comparison, idx) => (
                <Card key={idx} className={cn(getSeverityColor(comparison.severity))}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getSeverityIcon(comparison.severity)}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{comparison.aspect}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Excel 값:</p>
                            <p className="font-mono bg-gray-100 p-2 rounded mt-1">
                              {JSON.stringify(comparison.excelValue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">이미지 값:</p>
                            <p className="font-mono bg-gray-100 p-2 rounded mt-1">
                              {JSON.stringify(comparison.imageValue)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm">{comparison.difference}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">비교 결과가 없습니다.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 수정 제안 탭 */}
        <TabsContent value="corrections" className="mt-6">
          {result.corrections && result.corrections.length > 0 ? (
            <div className="space-y-4">
              {result.corrections.map((correction, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{correction.cell}</Badge>
                          <Badge variant={correction.confidence >= 0.8 ? "default" : "secondary"}>
                            신뢰도 {(correction.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">현재 값:</span>
                            <code className="ml-2 bg-red-50 text-red-600 px-2 py-1 rounded">
                              {correction.currentValue}
                            </code>
                          </div>
                          <div>
                            <span className="text-gray-600">제안 값:</span>
                            <code className="ml-2 bg-green-50 text-green-600 px-2 py-1 rounded">
                              {correction.suggestedValue}
                            </code>
                          </div>
                          <p className="text-gray-700 mt-2">{correction.reason}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        적용
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">수정 제안이 없습니다.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 메타데이터 */}
      {result.metadata && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">모델</p>
                <p className="font-medium">{result.metadata.model || 'GPT-4'}</p>
              </div>
              <div>
                <p className="text-gray-600">처리 시간</p>
                <p className="font-medium">{result.metadata.processingTime}ms</p>
              </div>
              <div>
                <p className="text-gray-600">토큰 사용량</p>
                <p className="font-medium">{result.metadata.tokensUsed || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}