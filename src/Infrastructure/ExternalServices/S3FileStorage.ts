import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { IFileStorage } from "@/Infrastructure/DependencyInjection/Container"
import { Readable } from "stream"

export class S3FileStorage implements IFileStorage {
  private s3Client: S3Client
  private bucketName: string

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
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: this.getContentType(key),
    })

    await this.s3Client.send(command)
    return `s3://${this.bucketName}/${key}`
  }

  async get(key: string): Promise<Buffer> {
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
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await this.s3Client.send(command)
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
    return "application/octet-stream"
  }
}