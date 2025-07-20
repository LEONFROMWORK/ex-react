// Temporary stub for excel analyzer module
export class ExcelAnalyzer {
  async analyze(buffer: Buffer) {
    return {
      errors: [],
      formulas: [],
      analysis: "Mock analysis"
    };
  }
}

export async function analyzeExcelFile(buffer: Buffer) {
  return {
    errors: [],
    formulas: [],
    analysis: "Mock analysis"
  };
}