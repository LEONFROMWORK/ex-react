import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import { createHash } from 'crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

interface FileVersion {
  id: string
  fileId: string
  versionNumber: number
  fileName: string
  fileSize: number
  checksum: string
  storageUrl: string
  changes?: string
  createdBy: string
  createdAt: Date
  tags?: string[]
}

interface VersionComparisonResult {
  added: Change[]
  modified: Change[]
  deleted: Change[]
  summary: {
    totalChanges: number
    sheetsModified: number
    cellsChanged: number
  }
}

interface Change {
  type: 'cell' | 'sheet' | 'formula' | 'format'
  location: {
    sheet: string
    cell?: string
    range?: string
  }
  oldValue?: any
  newValue?: any
  description: string
}

export class FileVersionService {
  private s3Client: S3Client
  private bucketName: string

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    })
    this.bucketName = process.env.S3_BUCKET_NAME || 'excelapp-files'
  }

  /**
   * 새 버전 생성
   */
  async createVersion(
    fileId: string,
    workbook: ExcelJS.Workbook,
    userId: string,
    changes?: string,
    tags?: string[]
  ): Promise<FileVersion> {
    // 현재 최신 버전 번호 가져오기
    const latestVersion = await prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { versionNumber: 'desc' }
    })
    
    const versionNumber = (latestVersion?.versionNumber || 0) + 1
    
    // Excel 파일을 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer()
    const arrayBuffer = buffer instanceof ArrayBuffer ? buffer : buffer.buffer
    
    // 체크섬 생성
    const checksum = createHash('sha256')
      .update(Buffer.from(arrayBuffer))
      .digest('hex')
    
    // S3에 업로드
    const key = `versions/${fileId}/v${versionNumber}_${Date.now()}.xlsx`
    await this.uploadToS3(key, Buffer.from(arrayBuffer))
    
    // 데이터베이스에 버전 정보 저장
    const version = await prisma.fileVersion.create({
      data: {
        fileId,
        versionNumber,
        fileName: `version_${versionNumber}.xlsx`,
        fileSize: buffer.byteLength,
        checksum,
        storageUrl: key,
        changes,
        createdBy: userId,
        tags: tags || [],
        metadata: {
          sheets: workbook.worksheets.length,
          createdWith: 'ExcelJS'
        }
      }
    })
    
    // 파일의 최신 버전 업데이트
    await prisma.file.update({
      where: { id: fileId },
      data: {
        currentVersion: versionNumber,
        updatedAt: new Date()
      }
    })
    
    return version
  }

  /**
   * 버전 목록 조회
   */
  async getVersionHistory(
    fileId: string,
    limit?: number,
    offset?: number
  ): Promise<{ versions: FileVersion[]; total: number }> {
    const [versions, total] = await Promise.all([
      prisma.fileVersion.findMany({
        where: { fileId },
        orderBy: { versionNumber: 'desc' },
        take: limit || 10,
        skip: offset || 0,
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.fileVersion.count({ where: { fileId } })
    ])
    
    return { versions, total }
  }

  /**
   * 특정 버전 다운로드
   */
  async downloadVersion(versionId: string): Promise<string> {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId }
    })
    
    if (!version) {
      throw new Error('버전을 찾을 수 없습니다')
    }
    
    // S3에서 다운로드 URL 생성
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: version.storageUrl
    })
    
    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600 // 1시간
    })
    
    return url
  }

  /**
   * 버전 비교
   */
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<VersionComparisonResult> {
    const [version1, version2] = await Promise.all([
      this.getVersionWorkbook(versionId1),
      this.getVersionWorkbook(versionId2)
    ])
    
    const changes: VersionComparisonResult = {
      added: [],
      modified: [],
      deleted: [],
      summary: {
        totalChanges: 0,
        sheetsModified: 0,
        cellsChanged: 0
      }
    }
    
    // 시트 비교
    const sheets1 = new Set(version1.worksheets.map(ws => ws.name))
    const sheets2 = new Set(version2.worksheets.map(ws => ws.name))
    
    // 삭제된 시트
    for (const sheetName of sheets1) {
      if (!sheets2.has(sheetName)) {
        changes.deleted.push({
          type: 'sheet',
          location: { sheet: sheetName },
          oldValue: sheetName,
          description: `시트 '${sheetName}'이(가) 삭제되었습니다`
        })
      }
    }
    
    // 추가된 시트
    for (const sheetName of sheets2) {
      if (!sheets1.has(sheetName)) {
        changes.added.push({
          type: 'sheet',
          location: { sheet: sheetName },
          newValue: sheetName,
          description: `시트 '${sheetName}'이(가) 추가되었습니다`
        })
      }
    }
    
    // 공통 시트의 셀 비교
    for (const sheetName of sheets1) {
      if (sheets2.has(sheetName)) {
        const worksheet1 = version1.getWorksheet(sheetName)
        const worksheet2 = version2.getWorksheet(sheetName)
        
        if (worksheet1 && worksheet2) {
          const cellChanges = this.compareWorksheets(worksheet1, worksheet2)
          changes.modified.push(...cellChanges)
          
          if (cellChanges.length > 0) {
            changes.summary.sheetsModified++
            changes.summary.cellsChanged += cellChanges.length
          }
        }
      }
    }
    
    changes.summary.totalChanges = 
      changes.added.length + changes.modified.length + changes.deleted.length
    
    return changes
  }

  /**
   * 워크시트 비교
   */
  private compareWorksheets(
    worksheet1: ExcelJS.Worksheet,
    worksheet2: ExcelJS.Worksheet
  ): Change[] {
    const changes: Change[] = []
    const processedCells = new Set<string>()
    
    // worksheet1의 셀 검사
    worksheet1.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const address = cell.address
        processedCells.add(address)
        
        const cell2 = worksheet2.getCell(address)
        
        // 값 비교
        if (this.getCellValue(cell) !== this.getCellValue(cell2)) {
          changes.push({
            type: 'cell',
            location: {
              sheet: worksheet1.name,
              cell: address
            },
            oldValue: this.getCellValue(cell),
            newValue: this.getCellValue(cell2),
            description: `셀 ${address}의 값이 변경되었습니다`
          })
        }
        
        // 수식 비교
        if (cell.formula !== cell2.formula) {
          changes.push({
            type: 'formula',
            location: {
              sheet: worksheet1.name,
              cell: address
            },
            oldValue: cell.formula,
            newValue: cell2.formula,
            description: `셀 ${address}의 수식이 변경되었습니다`
          })
        }
      })
    })
    
    // worksheet2에만 있는 셀 찾기
    worksheet2.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const address = cell.address
        if (!processedCells.has(address) && this.getCellValue(cell)) {
          changes.push({
            type: 'cell',
            location: {
              sheet: worksheet2.name,
              cell: address
            },
            newValue: this.getCellValue(cell),
            description: `셀 ${address}에 새 값이 추가되었습니다`
          })
        }
      })
    })
    
    return changes
  }

  /**
   * 셀 값 가져오기
   */
  private getCellValue(cell: ExcelJS.Cell): any {
    if (cell.type === ExcelJS.ValueType.Formula) {
      return cell.result
    }
    return cell.value
  }

  /**
   * 버전 워크북 가져오기
   */
  private async getVersionWorkbook(versionId: string): Promise<ExcelJS.Workbook> {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId }
    })
    
    if (!version) {
      throw new Error('버전을 찾을 수 없습니다')
    }
    
    // S3에서 파일 다운로드
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: version.storageUrl
    })
    
    const response = await this.s3Client.send(command)
    const buffer = await this.streamToBuffer(response.Body as any)
    
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    
    return workbook
  }

  /**
   * 버전 복원
   */
  async restoreVersion(
    versionId: string,
    userId: string
  ): Promise<FileVersion> {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId },
      include: { file: true }
    })
    
    if (!version) {
      throw new Error('버전을 찾을 수 없습니다')
    }
    
    // 버전 워크북 가져오기
    const workbook = await this.getVersionWorkbook(versionId)
    
    // 새 버전으로 저장
    const restoredVersion = await this.createVersion(
      version.fileId,
      workbook,
      userId,
      `버전 ${version.versionNumber}에서 복원`,
      ['restored']
    )
    
    return restoredVersion
  }

  /**
   * 버전 삭제 (관리자 전용)
   */
  async deleteVersion(versionId: string): Promise<void> {
    const version = await prisma.fileVersion.findUnique({
      where: { id: versionId }
    })
    
    if (!version) {
      throw new Error('버전을 찾을 수 없습니다')
    }
    
    // S3에서 파일 삭제
    // 실제 구현에서는 soft delete를 고려할 수 있음
    
    // 데이터베이스에서 삭제
    await prisma.fileVersion.delete({
      where: { id: versionId }
    })
  }

  /**
   * S3 업로드
   */
  private async uploadToS3(key: string, buffer: Buffer): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    
    await this.s3Client.send(command)
  }

  /**
   * Stream을 Buffer로 변환
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = []
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }
}