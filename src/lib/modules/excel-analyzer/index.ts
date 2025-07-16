import { CircularReferenceModule } from './circular-reference'
import { DataValidationModule } from './data-validation'
import { ErrorDetectionModule } from './error-detection'
import { FormulaOptimizationModule } from './formula-optimization'
import { DataCleaningModule } from './data-cleaning'

export interface AnalysisModuleResult {
  moduleId: string
  moduleName: string
  results: AnalysisItem[]
}

export interface AnalysisItem {
  id: string
  type: 'error' | 'warning' | 'optimization' | 'info'
  severity: 'critical' | 'high' | 'medium' | 'low'
  location: CellLocation
  description: string
  details?: string
  suggestion?: string
  autoFixAvailable: boolean
  confidence: number
}

export interface CellLocation {
  sheet: string
  cell?: string
  range?: string
  row?: number
  column?: number
}

export interface AnalysisOptions {
  includeOptimizations?: boolean
  includeWarnings?: boolean
  autoFixThreshold?: number
  deepAnalysis?: boolean
}

export class ExcelAnalyzer {
  private modules: Map<string, AnalysisModule> = new Map()
  
  constructor() {
    this.registerDefaultModules()
  }
  
  private registerDefaultModules() {
    this.registerModule('circular-reference', new CircularReferenceModule())
    this.registerModule('error-detection', new ErrorDetectionModule())
    this.registerModule('data-validation', new DataValidationModule())
    this.registerModule('formula-optimization', new FormulaOptimizationModule())
    this.registerModule('data-cleaning', new DataCleaningModule())
  }
  
  registerModule(id: string, module: AnalysisModule) {
    this.modules.set(id, module)
  }
  
  async analyze(workbook: any, options: AnalysisOptions = {}): Promise<AnalysisModuleResult[]> {
    const results: AnalysisModuleResult[] = []
    
    // Run all modules in parallel for better performance
    const modulePromises = Array.from(this.modules.entries()).map(async ([id, module]) => {
      try {
        // Skip optimization modules if not requested
        if (!options.includeOptimizations && module.type === 'optimization') {
          return null
        }
        
        const moduleResults = await module.analyze(workbook, options)
        
        return {
          moduleId: id,
          moduleName: module.name,
          results: moduleResults
        }
      } catch (error) {
        console.error(`Error in module ${id}:`, error)
        return null
      }
    })
    
    const moduleResults = await Promise.all(modulePromises)
    
    // Filter out null results and sort by severity
    return moduleResults
      .filter((result): result is AnalysisModuleResult => result !== null)
      .map(result => ({
        ...result,
        results: this.sortBySeverity(result.results)
      }))
  }
  
  private sortBySeverity(items: AnalysisItem[]): AnalysisItem[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  }
  
  async applyFixes(workbook: any, fixIds: string[]): Promise<ApplyFixResult> {
    const results: FixResult[] = []
    
    for (const moduleResult of await this.analyze(workbook)) {
      for (const item of moduleResult.results) {
        if (fixIds.includes(item.id) && item.autoFixAvailable) {
          const module = this.modules.get(moduleResult.moduleId)
          if (module && module.fix) {
            try {
              const fixResult = await module.fix(workbook, item)
              results.push({
                itemId: item.id,
                success: fixResult.success,
                message: fixResult.message
              })
            } catch (error) {
              results.push({
                itemId: item.id,
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
        }
      }
    }
    
    return {
      totalFixes: fixIds.length,
      successfulFixes: results.filter(r => r.success).length,
      failedFixes: results.filter(r => !r.success).length,
      results
    }
  }
}

// Type definitions
export interface AnalysisModule {
  name: string
  type: 'error' | 'optimization' | 'validation'
  analyze(workbook: any, options?: AnalysisOptions): Promise<AnalysisItem[]>
  fix?(workbook: any, item: AnalysisItem): Promise<FixResult>
}

export interface FixResult {
  itemId?: string
  success: boolean
  message: string
}

export interface ApplyFixResult {
  totalFixes: number
  successfulFixes: number
  failedFixes: number
  results: FixResult[]
}