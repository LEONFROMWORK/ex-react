'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface SystemStats {
  circuitBreakers: {
    [key: string]: {
      state: string
      failures: number
      successRate: string
    }
  }
  cache: {
    [key: string]: {
      hits: number
      misses: number
      hitRate: string
      size: number
    }
  }
  performance: {
    avgResponseTime: number
    throughput: number
    errorRate: number
  }
}

export function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/system/stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch system stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // 초기 로드
    fetchStats()

    // 5초마다 갱신
    const interval = setInterval(fetchStats, 5000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading || !stats) {
    return <div>Loading system stats...</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Circuit Breakers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Circuit Breakers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.circuitBreakers).map(([name, breaker]) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{name}</span>
                  {breaker.state === 'CLOSED' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {breaker.state === 'OPEN' && (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {breaker.state === 'HALF_OPEN' && (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <Badge variant={breaker.state === 'CLOSED' ? 'default' : 'destructive'}>
                  {breaker.state}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cache Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.cache).map(([name, cache]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium">{cache.hitRate}</span>
                </div>
                <Progress 
                  value={parseFloat(cache.hitRate)} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Hits: {cache.hits}</span>
                  <span>Misses: {cache.misses}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span>Avg Response Time</span>
                <span className="font-medium">{stats.performance.avgResponseTime}ms</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Throughput</span>
                <span className="font-medium">{stats.performance.throughput} req/s</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Error Rate</span>
                <span className="font-medium text-red-500">
                  {stats.performance.errorRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}