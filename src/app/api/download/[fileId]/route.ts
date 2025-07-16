import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import * as XLSX from 'xlsx'

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }
    
    const { fileId } = params
    
    // TODO: 실제로는 DB에서 파일 정보와 수정 내역을 가져옴
    // const file = await getFileById(fileId)
    // const corrections = await getCorrections(fileId)
    
    // Mock 데이터로 Excel 파일 생성
    const workbook = XLSX.utils.book_new()
    
    // 샘플 데이터
    const data = [
      ['ID', '이름', '값', '상태', '수정됨'],
      [1, '항목 A', 100, '정상', '예'],
      [2, '항목 B', 200, '정상', '예'],
      [3, '항목 C', 300, '정상', '아니오'],
    ]
    
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 스타일 적용 (수정된 셀 강조)
    worksheet['E2'].s = { fill: { fgColor: { rgb: 'D4EDDA' } } }
    worksheet['E3'].s = { fill: { fgColor: { rgb: 'D4EDDA' } } }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '수정된 데이터')
    
    // 수정 내역 시트 추가
    const correctionLog = [
      ['타임스탬프', '셀 위치', '원본 값', '수정된 값', '오류 유형'],
      [new Date().toISOString(), 'B2', '#DIV/0!', '0', '0으로 나누기 오류'],
      [new Date().toISOString(), 'C3', '#REF!', '200', '잘못된 참조'],
    ]
    
    const logSheet = XLSX.utils.aoa_to_sheet(correctionLog)
    XLSX.utils.book_append_sheet(workbook, logSheet, '수정 내역')
    
    // Excel 파일을 버퍼로 변환
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true 
    })
    
    // 파일명 생성
    const fileName = `corrected_${fileId}_${new Date().getTime()}.xlsx`
    
    // 응답 헤더 설정
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`)
    headers.set('Content-Length', buffer.length.toString())
    
    return new NextResponse(buffer, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: '파일 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}