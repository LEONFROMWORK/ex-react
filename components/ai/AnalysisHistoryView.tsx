'use client';

import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Image as ImageIcon, 
  FileText,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  Eye,
  DollarSign,
  Zap,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface AnalysisHistory {
  id: string;
  analysisId: string;
  type: 'text' | 'image' | 'hybrid';
  tier: 'TIER1' | 'TIER2' | 'TIER3';
  query?: string;
  fileInfo: {
    excelFileName: string;
    excelFileSize: number;
    imageCount: number;
    totalSize: number;
  };
  result: {
    confidence: number;
    errorCount: number;
    correctionCount: number;
  };
  cost: {
    tokensUsed: number;
    estimatedCost: number;
  };
  createdAt: string;
}

interface UserStats {
  totalAnalyses: number;
  errorDetectionCount: number;
  visualComparisonCount: number;
  improvementSuggestionCount: number;
  totalTokensUsed: number;
  totalCost: number;
  preferredTier?: string;
  averageFileSize: number;
  averageErrorCount: number;
  averageProcessingTime: number;
  lastAnalysisAt?: string;
}

export default function AnalysisHistoryView() {
  const [histories, setHistories] = useState<AnalysisHistory[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    tier: '',
    startDate: '',
    endDate: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<string | null>(null);

  useEffect(() => {
    fetchHistories();
  }, [page, filters]);

  const fetchHistories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.type && { type: filters.type }),
        ...(filters.tier && { tier: filters.tier }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });
      
      const response = await fetch(`/api/ai/analysis-history?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setHistories(data.data.histories);
        setTotalPages(data.data.pagination.totalPages);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch histories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (historyId: string) => {
    try {
      const response = await fetch(`/api/ai/analysis-history?id=${historyId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchHistories();
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'hybrid': return <FileSpreadsheet className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'TIER1': return 'default';
      case 'TIER2': return 'secondary';
      case 'TIER3': return 'destructive';
      default: return 'outline';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 분석 횟수</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                마지막 분석: {stats.lastAnalysisAt ? format(new Date(stats.lastAnalysisAt), 'MM/dd HH:mm', { locale: ko }) : '-'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>발견된 오류</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.errorDetectionCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                평균 {stats.averageErrorCount.toFixed(1)}개/파일
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>사용한 토큰</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTokensUsed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                선호 티어: {stats.preferredTier || 'TIER2'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>총 비용</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                평균 ${(stats.totalCost / Math.max(stats.totalAnalyses, 1)).toFixed(3)}/분석
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="분석 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                <SelectItem value="text">텍스트</SelectItem>
                <SelectItem value="image">이미지</SelectItem>
                <SelectItem value="hybrid">하이브리드</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.tier} onValueChange={(value) => setFilters(prev => ({ ...prev, tier: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="AI 티어" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체</SelectItem>
                <SelectItem value="TIER1">TIER1 (기본)</SelectItem>
                <SelectItem value="TIER2">TIER2 (고급)</SelectItem>
                <SelectItem value="TIER3">TIER3 (프리미엄)</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="시작일"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />

            <Input
              type="date"
              placeholder="종료일"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 이력 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>분석 이력</CardTitle>
          <CardDescription>최근 분석한 Excel 파일들의 이력입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : histories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              분석 이력이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {histories.map((history) => (
                <div key={history.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(history.type)}
                        <span className="font-medium">{history.fileInfo.excelFileName}</span>
                        <Badge variant={getTierColor(history.tier)}>{history.tier}</Badge>
                      </div>
                      
                      {history.query && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{history.query}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(history.createdAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                        </span>
                        <span>크기: {formatFileSize(history.fileInfo.totalSize)}</span>
                        {history.fileInfo.imageCount > 0 && (
                          <span>이미지: {history.fileInfo.imageCount}개</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="gap-1">
                          <TrendingUp className="w-3 h-3" />
                          신뢰도 {(history.result.confidence * 100).toFixed(0)}%
                        </Badge>
                        {history.result.errorCount > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            오류 {history.result.errorCount}개
                          </Badge>
                        )}
                        {history.result.correctionCount > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            수정 제안 {history.result.correctionCount}개
                          </Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${history.cost.estimatedCost.toFixed(3)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {/* 상세보기 구현 */}}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {/* 다운로드 구현 */}}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedHistory(history.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>분석 이력 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 분석 이력을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedHistory && handleDelete(selectedHistory)}
            >
              삭제
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}