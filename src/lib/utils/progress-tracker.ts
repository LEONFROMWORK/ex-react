export interface AnalysisProgress {
  stage: 'uploading' | 'parsing' | 'analyzing' | 'generating' | 'completed' | 'error'
  progress: number
  message: string
  details?: string
  timestamp: Date
}

export interface AnalysisStage {
  id: string
  name: string
  progress: number
  status: 'pending' | 'in_progress' | 'completed' | 'error'
}

export const ANALYSIS_STAGES: AnalysisStage[] = [
  { id: 'upload', name: '파일 업로드', progress: 0, status: 'pending' },
  { id: 'parse', name: '파일 파싱', progress: 0, status: 'pending' },
  { id: 'validate', name: '데이터 검증', progress: 0, status: 'pending' },
  { id: 'errors', name: '오류 분석', progress: 0, status: 'pending' },
  { id: 'performance', name: '성능 분석', progress: 0, status: 'pending' },
  { id: 'vba', name: 'VBA 코드 분석', progress: 0, status: 'pending' },
  { id: 'report', name: '리포트 생성', progress: 0, status: 'pending' }
]

export class ProgressTracker {
  private stages: Map<string, AnalysisStage>
  private listeners: ((progress: AnalysisProgress) => void)[] = []
  
  constructor() {
    this.stages = new Map(
      ANALYSIS_STAGES.map(stage => [stage.id, { ...stage }])
    )
  }
  
  subscribe(listener: (progress: AnalysisProgress) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
  
  updateStage(stageId: string, progress: number, status?: AnalysisStage['status']) {
    const stage = this.stages.get(stageId)
    if (!stage) return
    
    stage.progress = progress
    if (status) stage.status = status
    
    this.notifyListeners()
  }
  
  setError(stageId: string, error: string) {
    const stage = this.stages.get(stageId)
    if (!stage) return
    
    stage.status = 'error'
    
    this.notifyListeners({
      stage: 'error',
      message: error,
      details: `단계: ${stage.name}`
    })
  }
  
  private notifyListeners(customProgress?: Partial<AnalysisProgress>) {
    const totalProgress = this.calculateTotalProgress()
    const currentStage = this.getCurrentStage()
    
    const progress: AnalysisProgress = {
      stage: currentStage?.id as any || 'analyzing',
      progress: totalProgress,
      message: currentStage?.name || '분석 중',
      timestamp: new Date(),
      ...customProgress
    }
    
    this.listeners.forEach(listener => listener(progress))
  }
  
  private calculateTotalProgress(): number {
    const stages = Array.from(this.stages.values())
    const totalWeight = stages.length
    const completedWeight = stages.reduce((sum, stage) => {
      return sum + (stage.progress / 100)
    }, 0)
    
    return Math.round((completedWeight / totalWeight) * 100)
  }
  
  private getCurrentStage(): AnalysisStage | undefined {
    return Array.from(this.stages.values()).find(
      stage => stage.status === 'in_progress'
    )
  }
  
  getStages(): AnalysisStage[] {
    return Array.from(this.stages.values())
  }
  
  reset() {
    this.stages.forEach(stage => {
      stage.progress = 0
      stage.status = 'pending'
    })
    this.notifyListeners()
  }
}