import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExcelProcessingService } from '@/src/Features/ExcelAnalysis/ExcelProcessingService';
import { FileAssociationService } from '@/src/Features/ExcelUpload/FileAssociationService';
import { FileRepository } from '@/src/Infrastructure/Repositories/FileRepository';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    
    if (!session?.user && !demoMode) {
      return Response.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const type = searchParams.get('type') || 'excel'; // excel, pdf, both
    
    if (!sessionId) {
      return Response.json(
        { error: 'sessionId가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 파일 정보 조회
    const fileRepository = new FileRepository();
    const associationService = new FileAssociationService(fileRepository);
    const filesResult = await associationService.getAssociatedFiles(sessionId);
    
    if (!filesResult.isSuccess) {
      return Response.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    const { excel: excelFile } = filesResult.value;
    
    if (!excelFile) {
      return Response.json(
        { error: 'Excel 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 분석 결과 조회
    const analysisHistory = await getAnalysisResult(sessionId);
    
    if (!analysisHistory) {
      return Response.json(
        { error: '분석 결과를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    if (type === 'pdf') {
      // PDF 보고서 생성
      const pdfBuffer = await generatePDFReport(analysisHistory, filesResult.value);
      
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="analysis-report-${sessionId}.pdf"`,
        },
      });
    } else if (type === 'excel') {
      // 수정된 Excel 파일 생성
      const excelBuffer = await generateCorrectedExcel(
        excelFile,
        analysisHistory.result.corrections || []
      );
      
      return new Response(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="corrected-${excelFile.originalName}"`,
        },
      });
    } else if (type === 'both') {
      // ZIP 파일로 둘 다 제공
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      
      // Excel 파일 추가
      const excelBuffer = await generateCorrectedExcel(
        excelFile,
        analysisHistory.result.corrections || []
      );
      zip.file(`corrected-${excelFile.originalName}`, excelBuffer);
      
      // PDF 보고서 추가
      const pdfBuffer = await generatePDFReport(analysisHistory, filesResult.value);
      zip.file(`analysis-report-${sessionId}.pdf`, pdfBuffer);
      
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      
      return new Response(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="analysis-results-${sessionId}.zip"`,
        },
      });
    }
    
  } catch (error) {
    console.error('Download error:', error);
    return Response.json(
      { error: '다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 분석 결과 조회
async function getAnalysisResult(sessionId: string) {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    const history = await prisma.analysisHistory.findFirst({
      where: { analysisId: sessionId },
      orderBy: { createdAt: 'desc' }
    });
    
    return history;
  } catch (error) {
    console.error('Failed to get analysis result:', error);
    return null;
  }
}

// 수정된 Excel 파일 생성
async function generateCorrectedExcel(
  originalFile: any,
  corrections: any[]
): Promise<Buffer> {
  try {
    // 원본 파일 읽기
    let originalBuffer: Buffer;
    if (originalFile.uploadUrl.startsWith('/uploads/')) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), originalFile.uploadUrl);
      originalBuffer = await fs.readFile(filePath);
    } else {
      const response = await fetch(originalFile.uploadUrl);
      const arrayBuffer = await response.arrayBuffer();
      originalBuffer = Buffer.from(arrayBuffer);
    }
    
    // Excel 파일 파싱
    const workbook = XLSX.read(originalBuffer, { type: 'buffer' });
    
    // 수정사항 적용
    corrections.forEach(correction => {
      const { cell, suggestedValue } = correction;
      const [sheetName, cellRef] = cell.includes('!') 
        ? cell.split('!') 
        : [workbook.SheetNames[0], cell];
      
      const worksheet = workbook.Sheets[sheetName];
      if (worksheet) {
        worksheet[cellRef] = { 
          v: suggestedValue,
          t: typeof suggestedValue === 'number' ? 'n' : 's'
        };
      }
    });
    
    // 수정 로그 시트 추가
    const logSheet = XLSX.utils.json_to_sheet(
      corrections.map(c => ({
        '셀 위치': c.cell,
        '원래 값': c.currentValue,
        '수정된 값': c.suggestedValue,
        '수정 이유': c.reason,
        '신뢰도': `${(c.confidence * 100).toFixed(0)}%`
      }))
    );
    XLSX.utils.book_append_sheet(workbook, logSheet, '수정 내역');
    
    // Buffer로 변환
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });
    
    return buffer;
  } catch (error) {
    console.error('Failed to generate corrected Excel:', error);
    throw error;
  }
}

// PDF 보고서 생성
async function generatePDFReport(
  analysisHistory: any,
  files: any
): Promise<Uint8Array> {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // 기본 폰트 설정
  doc.setFont('helvetica');
  
  // 제목
  doc.setFontSize(20);
  doc.text('Excel 분석 보고서', 105, yPosition, { align: 'center' });
  yPosition += 20;
  
  // 기본 정보
  doc.setFontSize(12);
  doc.text(`분석 ID: ${analysisHistory.analysisId}`, 20, yPosition);
  yPosition += 10;
  doc.text(`분석 일시: ${new Date(analysisHistory.createdAt).toLocaleString('ko-KR')}`, 20, yPosition);
  yPosition += 10;
  doc.text(`사용 티어: ${analysisHistory.tier}`, 20, yPosition);
  yPosition += 15;
  
  // 파일 정보
  doc.setFontSize(14);
  doc.text('파일 정보', 20, yPosition);
  yPosition += 10;
  doc.setFontSize(11);
  
  const fileInfo = analysisHistory.fileInfo as any;
  doc.text(`- Excel 파일: ${fileInfo.excelFileName || 'N/A'}`, 25, yPosition);
  yPosition += 7;
  doc.text(`- 파일 크기: ${(fileInfo.excelFileSize / 1024).toFixed(2)} KB`, 25, yPosition);
  yPosition += 7;
  doc.text(`- 이미지 수: ${fileInfo.imageCount || 0}개`, 25, yPosition);
  yPosition += 15;
  
  // 분석 결과 요약
  doc.setFontSize(14);
  doc.text('분석 결과', 20, yPosition);
  yPosition += 10;
  doc.setFontSize(11);
  
  const result = analysisHistory.result as any;
  doc.text(`- 신뢰도: ${(result.confidence * 100).toFixed(0)}%`, 25, yPosition);
  yPosition += 7;
  doc.text(`- 발견된 오류: ${result.errorCount || 0}개`, 25, yPosition);
  yPosition += 7;
  doc.text(`- 수정 제안: ${result.correctionCount || 0}개`, 25, yPosition);
  yPosition += 15;
  
  // 비용 정보
  doc.setFontSize(14);
  doc.text('비용 정보', 20, yPosition);
  yPosition += 10;
  doc.setFontSize(11);
  
  const cost = analysisHistory.cost as any;
  doc.text(`- 사용 토큰: ${cost.tokensUsed}`, 25, yPosition);
  yPosition += 7;
  doc.text(`- 예상 비용: $${cost.estimatedCost.toFixed(4)}`, 25, yPosition);
  yPosition += 20;
  
  // 수정 사항 상세 (새 페이지)
  if (result.corrections && result.corrections.length > 0) {
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(16);
    doc.text('수정 사항 상세', 20, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    result.corrections.forEach((correction: any, index: number) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(`${index + 1}. 셀 ${correction.cell}`, 20, yPosition);
      yPosition += 7;
      doc.text(`   원래 값: ${correction.currentValue}`, 25, yPosition);
      yPosition += 7;
      doc.text(`   수정 값: ${correction.suggestedValue}`, 25, yPosition);
      yPosition += 7;
      doc.text(`   이유: ${correction.reason}`, 25, yPosition);
      yPosition += 10;
    });
  }
  
  return doc.output('arraybuffer');
}