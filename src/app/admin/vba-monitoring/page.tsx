import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Code2, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Users,
  FileCode,
  Activity
} from 'lucide-react'

export default function VBAMonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">VBA 모니터링</h1>
        <p className="text-muted-foreground">
          VBA 처리 현황 및 보안 위험 모니터링
        </p>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 VBA 파일</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,349</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> 지난 달 대비
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5%</span> 지난 주 대비
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">보안 위험</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">23</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">+3</span> 새로운 위험
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">처리 성공률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <p className="text-xs text-muted-foreground">
              목표: 95%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="security">보안 모니터링</TabsTrigger>
          <TabsTrigger value="performance">성능 분석</TabsTrigger>
          <TabsTrigger value="users">사용자 활동</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 최근 처리 현황 */}
            <Card>
              <CardHeader>
                <CardTitle>최근 VBA 처리 현황</CardTitle>
                <CardDescription>지난 24시간 동안의 처리 결과</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { file: 'financial_model.xlsm', user: 'john@company.com', status: 'success', modules: 5, threats: 0 },
                    { file: 'automation_script.xlsb', user: 'sarah@company.com', status: 'warning', modules: 3, threats: 2 },
                    { file: 'data_processor.xlsm', user: 'mike@company.com', status: 'success', modules: 8, threats: 0 },
                    { file: 'legacy_system.xls', user: 'admin@company.com', status: 'error', modules: 0, threats: 0 },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          item.status === 'success' ? 'bg-green-500' : 
                          item.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{item.file}</p>
                          <p className="text-xs text-muted-foreground">{item.user}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{item.modules} 모듈</Badge>
                        {item.threats > 0 && (
                          <Badge variant="destructive">{item.threats} 위험</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* VBA 모듈 유형 분포 */}
            <Card>
              <CardHeader>
                <CardTitle>VBA 모듈 유형 분포</CardTitle>
                <CardDescription>감지된 모듈 유형별 통계</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'Standard Module', count: 1456, percentage: 65 },
                    { type: 'Class Module', count: 423, percentage: 19 },
                    { type: 'Form Module', count: 267, percentage: 12 },
                    { type: 'Sheet Module', count: 89, percentage: 4 },
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.type}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 보안 위험 현황 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  보안 위험 현황
                </CardTitle>
                <CardDescription>감지된 보안 위험 유형별 분포</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'Shell 명령 실행', count: 8, severity: 'critical' },
                    { type: 'COM 객체 생성', count: 12, severity: 'high' },
                    { type: '파일 시스템 접근', count: 31, severity: 'medium' },
                    { type: '환경 변수 접근', count: 67, severity: 'low' },
                  ].map((threat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {threat.severity === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {threat.severity === 'high' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                        {threat.severity === 'medium' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        {threat.severity === 'low' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                        <span className="text-sm font-medium">{threat.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={threat.severity === 'critical' || threat.severity === 'high' ? 'destructive' : 'secondary'}>
                          {threat.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 위험 파일 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>고위험 파일 목록</CardTitle>
                <CardDescription>즉시 검토가 필요한 파일들</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { file: 'suspicious_macro.xlsm', user: 'external@domain.com', threats: 5, date: '2시간 전' },
                    { file: 'legacy_automation.xls', user: 'admin@company.com', threats: 3, date: '1일 전' },
                    { file: 'data_exporter.xlsb', user: 'finance@company.com', threats: 2, date: '2일 전' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.file}</p>
                        <p className="text-xs text-muted-foreground">{item.user} · {item.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{item.threats} 위험</Badge>
                        <Button size="sm" variant="outline">
                          검토
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 처리 성능 메트릭 */}
            <Card>
              <CardHeader>
                <CardTitle>처리 성능 메트릭</CardTitle>
                <CardDescription>VBA 추출 및 분석 성능 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">1.2s</div>
                      <div className="text-sm text-muted-foreground">평균 처리 시간</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">98.5%</div>
                      <div className="text-sm text-muted-foreground">성공률</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">15MB</div>
                      <div className="text-sm text-muted-foreground">평균 파일 크기</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">4.2</div>
                      <div className="text-sm text-muted-foreground">평균 모듈 수</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 오류 분석 */}
            <Card>
              <CardHeader>
                <CardTitle>오류 분석</CardTitle>
                <CardDescription>처리 실패 원인별 분석</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { reason: '파일 형식 불일치', count: 12, percentage: 45 },
                    { reason: '파일 손상', count: 8, percentage: 30 },
                    { reason: '메모리 부족', count: 4, percentage: 15 },
                    { reason: '기타', count: 3, percentage: 10 },
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.reason}</span>
                        <span className="text-muted-foreground">{item.count}건</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>사용자 활동 분석</CardTitle>
              <CardDescription>VBA 기능 사용 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { user: 'john@company.com', files: 23, lastActive: '2시간 전', tier: 'Premium' },
                  { user: 'sarah@company.com', files: 18, lastActive: '5시간 전', tier: 'Basic' },
                  { user: 'mike@company.com', files: 15, lastActive: '1일 전', tier: 'Premium' },
                  { user: 'admin@company.com', files: 12, lastActive: '2일 전', tier: 'Admin' },
                  { user: 'finance@company.com', files: 9, lastActive: '3일 전', tier: 'Basic' },
                ].map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{user.user}</p>
                      <p className="text-xs text-muted-foreground">마지막 활동: {user.lastActive}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{user.files} 파일</Badge>
                      <Badge variant={user.tier === 'Admin' ? 'default' : user.tier === 'Premium' ? 'secondary' : 'outline'}>
                        {user.tier}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}