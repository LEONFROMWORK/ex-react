import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from "@aws-sdk/client-s3"
import { IFileStorage } from "@/Infrastructure/DependencyInjection/Container"
import { Readable } from "stream"

export class S3StreamingStorage implements IFileStorage {
  private s3Client: S3Client
  private bucketName: string
  private readonly MULTIPART_THRESHOLD = 100 * 1024 * 1024 // 100MB
  private readonly PART_SIZE = 5 * 1024 * 1024 // 5MB

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
    this.bucketName = process.env.AWS_S3_BUCKET!
  }

  async save(file: Buffer, key: string): Promise<string> {
    try {
      // 큰 파일은 멀티파트 업로드 사용
      if (file.length > this.MULTIPART_THRESHOLD) {
        return await this.multipartUpload(file, key)
      }
      
      // 작은 파일은 일반 업로드
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: this.getContentType(key),
        ServerSideEncryption: "AES256",
        Metadata: {
          originalSize: file.length.toString(),
          uploadTime: new Date().toISOString()
        }
      })

      await this.s3Client.send(command)
      return `s3://${this.bucketName}/${key}`
    } catch (error) {
      console.error("S3 업로드 실패:", error)
      throw new Error(`파일 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  private async multipartUpload(file: Buffer, key: string): Promise<string> {
    let uploadId: string | undefined
    
    try {
      // 멀티파트 업로드 시작
      const createCommand = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: this.getContentType(key),
        ServerSideEncryption: "AES256",
        Metadata: {
          originalSize: file.length.toString(),
          uploadTime: new Date().toISOString()
        }
      })

      const createResponse = await this.s3Client.send(createCommand)
      uploadId = createResponse.UploadId!

      // 파일을 청크로 분할하여 업로드
      const parts: { ETag: string; PartNumber: number }[] = []
      const totalParts = Math.ceil(file.length / this.PART_SIZE)

      for (let i = 0; i < totalParts; i++) {
        const start = i * this.PART_SIZE
        const end = Math.min(start + this.PART_SIZE, file.length)
        const chunk = file.slice(start, end)

        const uploadPartCommand = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: key,
          PartNumber: i + 1,
          UploadId: uploadId,
          Body: chunk
        })

        const uploadPartResponse = await this.s3Client.send(uploadPartCommand)
        parts.push({
          ETag: uploadPartResponse.ETag!,
          PartNumber: i + 1
        })
      }

      // 멀티파트 업로드 완료
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
        }
      })

      await this.s3Client.send(completeCommand)
      return `s3://${this.bucketName}/${key}`

    } catch (error) {
      // 실패 시 멀티파트 업로드 중단
      if (uploadId) {
        try {
          await this.s3Client.send(new AbortMultipartUploadCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId
          }))
        } catch (abortError) {
          console.error("멀티파트 업로드 중단 실패:", abortError)
        }
      }
      throw error
    }
  }

  async get(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      const stream = response.Body as Readable
      
      const chunks: Uint8Array[] = []
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      
      return Buffer.concat(chunks)
    } catch (error) {
      console.error("S3 다운로드 실패:", error)
      throw new Error(`파일 다운로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.s3Client.send(command)
    } catch (error) {
      console.error("S3 삭제 실패:", error)
      throw new Error(`파일 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 스트리밍 다운로드 (큰 파일용)
  async getStream(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      return response.Body as Readable
    } catch (error) {
      console.error("S3 스트림 다운로드 실패:", error)
      throw new Error(`파일 스트림 다운로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  // 파일 메타데이터 확인
  async getMetadata(key: string): Promise<{ size: number; lastModified: Date; contentType: string }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      
      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream'
      }
    } catch (error) {
      console.error("S3 메타데이터 조회 실패:", error)
      throw new Error(`파일 메타데이터 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  private getContentType(key: string): string {
    if (key.endsWith(".xlsx")) {
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
    if (key.endsWith(".xls")) {
      return "application/vnd.ms-excel"
    }
    if (key.endsWith(".csv")) {
      return "text/csv"
    }
    if (key.endsWith(".json")) {
      return "application/json"
    }
    return "application/octet-stream"
  }

  // 헬스 체크
  async healthCheck(): Promise<boolean> {
    try {
      // 작은 테스트 파일 업로드 및 삭제
      const testKey = `health-check-${Date.now()}`
      const testData = Buffer.from("health check")
      
      await this.save(testData, testKey)
      await this.delete(testKey)
      
      return true
    } catch (error) {
      console.error("S3 헬스 체크 실패:", error)
      return false
    }
  }
}