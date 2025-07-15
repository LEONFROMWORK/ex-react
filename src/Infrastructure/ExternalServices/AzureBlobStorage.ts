import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob"
import { IFileStorage } from "@/Infrastructure/DependencyInjection/Container"

export class AzureBlobStorage implements IFileStorage {
  private blobServiceClient: BlobServiceClient
  private containerName: string

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION!
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    this.containerName = process.env.AZURE_CONTAINER_NAME || "excel-files"
  }

  async save(file: Buffer, key: string): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(key)

    await blockBlobClient.upload(file, file.length, {
      blobHTTPHeaders: {
        blobContentType: this.getContentType(key),
      },
    })

    return blockBlobClient.url
  }

  async get(key: string): Promise<Buffer> {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(key)

    const downloadResponse = await blockBlobClient.download(0)
    const downloaded = await this.streamToBuffer(downloadResponse.readableStreamBody!)
    
    return downloaded
  }

  async delete(key: string): Promise<void> {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName)
    const blockBlobClient = containerClient.getBlockBlobClient(key)

    await blockBlobClient.delete()
  }

  private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      readableStream.on("data", (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data))
      })
      readableStream.on("end", () => {
        resolve(Buffer.concat(chunks))
      })
      readableStream.on("error", reject)
    })
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