import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { CloudWatchClient, PutMetricDataCommand, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'

export interface S3CostMetrics {
  totalObjects: number
  totalSize: number
  standardStorage: number
  standardIAStorage: number
  glacierStorage: number
  estimatedMonthlyCost: number
  requestCosts: {
    putRequests: number
    getRequests: number
    deleteRequests: number
  }
  lastUpdated: Date
}

export interface S3UsageAlert {
  type: 'cost' | 'storage' | 'requests'
  threshold: number
  currentValue: number
  message: string
  severity: 'low' | 'medium' | 'high'
}

export class S3CostMonitor {
  private s3Client: S3Client
  private cloudWatchClient: CloudWatchClient
  private bucketName: string
  private region: string

  // 비용 상수 (ap-northeast-2 기준, USD)
  private readonly COSTS = {
    STANDARD_STORAGE: 0.023, // per GB/month
    STANDARD_IA_STORAGE: 0.0125, // per GB/month
    GLACIER_STORAGE: 0.0045, // per GB/month
    PUT_REQUESTS: 0.0047, // per 1000 requests
    GET_REQUESTS: 0.0004, // per 1000 requests
    DELETE_REQUESTS: 0.0004, // per 1000 requests
  }

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
    
    this.cloudWatchClient = new CloudWatchClient({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
    
    this.bucketName = process.env.AWS_S3_BUCKET!
    this.region = process.env.AWS_REGION || 'ap-northeast-2'
  }

  async getStorageMetrics(): Promise<S3CostMetrics> {
    try {
      const objects = await this.listAllObjects()
      const totalSize = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0)
      const totalObjects = objects.length

      // 스토리지 클래스별 분류 (라이프사이클 정책 기반 추정)
      const now = new Date()
      let standardStorage = 0
      let standardIAStorage = 0
      let glacierStorage = 0

      for (const obj of objects) {
        const daysSinceModified = Math.floor((now.getTime() - (obj.LastModified?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24))
        const sizeInGB = (obj.Size || 0) / (1024 * 1024 * 1024)

        if (daysSinceModified < 30) {
          standardStorage += sizeInGB
        } else if (daysSinceModified < 90) {
          standardIAStorage += sizeInGB
        } else {
          glacierStorage += sizeInGB
        }
      }

      // 요청 메트릭 가져오기
      const requestCosts = await this.getRequestMetrics()

      // 월 비용 계산
      const estimatedMonthlyCost = 
        (standardStorage * this.COSTS.STANDARD_STORAGE) +
        (standardIAStorage * this.COSTS.STANDARD_IA_STORAGE) +
        (glacierStorage * this.COSTS.GLACIER_STORAGE) +
        (requestCosts.putRequests * this.COSTS.PUT_REQUESTS / 1000) +
        (requestCosts.getRequests * this.COSTS.GET_REQUESTS / 1000) +
        (requestCosts.deleteRequests * this.COSTS.DELETE_REQUESTS / 1000)

      return {
        totalObjects,
        totalSize,
        standardStorage,
        standardIAStorage,
        glacierStorage,
        estimatedMonthlyCost,
        requestCosts,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('S3 메트릭 수집 실패:', error)
      throw new Error(`S3 메트릭 수집 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  private async listAllObjects(): Promise<Array<{ Key?: string; Size?: number; LastModified?: Date }>> {
    const objects: Array<{ Key?: string; Size?: number; LastModified?: Date }> = []
    let continuationToken: string | undefined

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      })

      const response = await this.s3Client.send(command)
      
      if (response.Contents) {
        objects.push(...response.Contents)
      }

      continuationToken = response.NextContinuationToken
    } while (continuationToken)

    return objects
  }

  private async getRequestMetrics(): Promise<{ putRequests: number; getRequests: number; deleteRequests: number }> {
    try {
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000) // 30일 전

      const [putRequests, getRequests, deleteRequests] = await Promise.all([
        this.getCloudWatchMetric('NumberOfObjects', 'PUT', startTime, endTime),
        this.getCloudWatchMetric('NumberOfObjects', 'GET', startTime, endTime),
        this.getCloudWatchMetric('NumberOfObjects', 'DELETE', startTime, endTime)
      ])

      return {
        putRequests: putRequests || 0,
        getRequests: getRequests || 0,
        deleteRequests: deleteRequests || 0
      }
    } catch (error) {
      console.error('CloudWatch 메트릭 조회 실패:', error)
      return { putRequests: 0, getRequests: 0, deleteRequests: 0 }
    }
  }

  private async getCloudWatchMetric(metricName: string, operation: string, startTime: Date, endTime: Date): Promise<number> {
    const command = new GetMetricStatisticsCommand({
      Namespace: 'AWS/S3',
      MetricName: metricName,
      Dimensions: [
        {
          Name: 'BucketName',
          Value: this.bucketName
        },
        {
          Name: 'StorageType',
          Value: operation
        }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 3600, // 1시간
      Statistics: ['Sum']
    })

    const response = await this.cloudWatchClient.send(command)
    
    if (response.Datapoints && response.Datapoints.length > 0) {
      return response.Datapoints.reduce((sum, point) => sum + (point.Sum || 0), 0)
    }

    return 0
  }

  async checkCostAlerts(metrics: S3CostMetrics, thresholds: {
    monthlyCost: number
    totalSize: number
    totalObjects: number
  }): Promise<S3UsageAlert[]> {
    const alerts: S3UsageAlert[] = []

    // 월 비용 알림
    if (metrics.estimatedMonthlyCost > thresholds.monthlyCost) {
      alerts.push({
        type: 'cost',
        threshold: thresholds.monthlyCost,
        currentValue: metrics.estimatedMonthlyCost,
        message: `월 예상 비용이 임계값을 초과했습니다 ($${metrics.estimatedMonthlyCost.toFixed(2)} > $${thresholds.monthlyCost})`,
        severity: metrics.estimatedMonthlyCost > thresholds.monthlyCost * 2 ? 'high' : 'medium'
      })
    }

    // 스토리지 사용량 알림
    const totalSizeGB = metrics.totalSize / (1024 * 1024 * 1024)
    if (totalSizeGB > thresholds.totalSize) {
      alerts.push({
        type: 'storage',
        threshold: thresholds.totalSize,
        currentValue: totalSizeGB,
        message: `스토리지 사용량이 임계값을 초과했습니다 (${totalSizeGB.toFixed(2)}GB > ${thresholds.totalSize}GB)`,
        severity: totalSizeGB > thresholds.totalSize * 2 ? 'high' : 'medium'
      })
    }

    // 객체 수 알림
    if (metrics.totalObjects > thresholds.totalObjects) {
      alerts.push({
        type: 'storage',
        threshold: thresholds.totalObjects,
        currentValue: metrics.totalObjects,
        message: `저장된 객체 수가 임계값을 초과했습니다 (${metrics.totalObjects} > ${thresholds.totalObjects})`,
        severity: metrics.totalObjects > thresholds.totalObjects * 2 ? 'high' : 'low'
      })
    }

    return alerts
  }

  async sendCostReport(metrics: S3CostMetrics, alerts: S3UsageAlert[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      bucketName: this.bucketName,
      region: this.region,
      metrics,
      alerts,
      recommendations: this.generateRecommendations(metrics, alerts)
    }

    // 여기에 실제 알림 전송 로직 추가 (이메일, Slack, 웹훅 등)
    console.log('S3 비용 리포트:', JSON.stringify(report, null, 2))

    // CloudWatch 커스텀 메트릭 전송
    await this.sendCustomMetrics(metrics)
  }

  private generateRecommendations(metrics: S3CostMetrics, alerts: S3UsageAlert[]): string[] {
    const recommendations: string[] = []

    // 비용 최적화 권장사항
    if (metrics.estimatedMonthlyCost > 20) {
      recommendations.push('라이프사이클 정책을 검토하여 오래된 파일을 더 저렴한 스토리지 클래스로 이동하세요.')
    }

    if (metrics.standardStorage > 50) {
      recommendations.push('30일 이상된 파일을 Standard-IA로 이동하는 것을 고려하세요.')
    }

    if (metrics.requestCosts.getRequests > 10000) {
      recommendations.push('CloudFront를 사용하여 GET 요청을 줄이는 것을 고려하세요.')
    }

    if (metrics.totalObjects > 100000) {
      recommendations.push('불필요한 파일을 정리하고 자동 삭제 정책을 설정하세요.')
    }

    return recommendations
  }

  private async sendCustomMetrics(metrics: S3CostMetrics): Promise<void> {
    const metricData = [
      {
        MetricName: 'EstimatedMonthlyCost',
        Value: metrics.estimatedMonthlyCost,
        Unit: 'None' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'TotalStorageSize',
        Value: metrics.totalSize / (1024 * 1024 * 1024), // GB
        Unit: 'Bytes' as const,
        Timestamp: new Date()
      },
      {
        MetricName: 'TotalObjects',
        Value: metrics.totalObjects,
        Unit: 'Count' as const,
        Timestamp: new Date()
      }
    ]

    const command = new PutMetricDataCommand({
      Namespace: 'ExcelApp/S3',
      MetricData: metricData
    })

    await this.cloudWatchClient.send(command)
  }

  // 정기적인 모니터링 실행
  async runMonitoring(thresholds: {
    monthlyCost: number
    totalSize: number
    totalObjects: number
  }): Promise<void> {
    try {
      const metrics = await this.getStorageMetrics()
      const alerts = await this.checkCostAlerts(metrics, thresholds)
      
      if (alerts.length > 0) {
        await this.sendCostReport(metrics, alerts)
      }
    } catch (error) {
      console.error('S3 모니터링 실행 실패:', error)
    }
  }
}

// 기본 임계값 설정
export const DEFAULT_THRESHOLDS = {
  monthlyCost: 20, // $20/month
  totalSize: 10, // 10GB
  totalObjects: 10000 // 10,000 objects
}

// 싱글톤 인스턴스
export const s3CostMonitor = new S3CostMonitor()

// 정기적인 모니터링 시작 (매일 오전 9시)
export function startS3Monitoring(): void {
  const runDaily = async () => {
    await s3CostMonitor.runMonitoring(DEFAULT_THRESHOLDS)
  }

  // 즉시 실행
  runDaily()

  // 매 24시간마다 실행
  setInterval(runDaily, 24 * 60 * 60 * 1000)
}