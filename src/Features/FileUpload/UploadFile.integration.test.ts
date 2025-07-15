import { UploadFileHandler } from './UploadFile'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs/promises'
import * as path from 'path'

jest.mock('fs/promises')
jest.mock('nanoid', () => ({ nanoid: () => 'test_file_id' }))

describe('File Upload Integration Tests', () => {
  const mockFs = fs as jest.Mocked<typeof fs>
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('UploadFileHandler', () => {
    it('should successfully upload an Excel file', async () => {
      const handler = new UploadFileHandler()
      const mockFile = {
        id: 'file_123',
        userId: 'user_123',
        fileName: 'test_file_id.xlsx',
        originalName: 'test.xlsx',
        fileSize: 1024,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        uploadUrl: '/uploads/test_file_id.xlsx',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.writeFile.mockResolvedValue(undefined)
      ;(prisma.file.create as jest.Mock).mockResolvedValue(mockFile)

      const fileBuffer = Buffer.from('test excel content')
      const result = await handler.handle({
        userId: 'user_123',
        file: {
          buffer: fileBuffer,
          originalname: 'test.xlsx',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1024,
        },
      })

      expect(result.isSuccess).toBe(true)
      expect(result.value?.fileId).toBe('file_123')
      expect(prisma.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          originalName: 'test.xlsx',
          fileSize: 1024,
        }),
      })
    })

    it('should reject non-Excel files', async () => {
      const handler = new UploadFileHandler()
      
      const result = await handler.handle({
        userId: 'user_123',
        file: {
          buffer: Buffer.from('test content'),
          originalname: 'test.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        },
      })

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('File.InvalidType')
    })

    it('should reject files exceeding size limit', async () => {
      const handler = new UploadFileHandler()
      
      const result = await handler.handle({
        userId: 'user_123',
        file: {
          buffer: Buffer.alloc(51 * 1024 * 1024), // 51MB
          originalname: 'large.xlsx',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 51 * 1024 * 1024,
        },
      })

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('File.TooLarge')
    })

    it('should handle file system errors gracefully', async () => {
      const handler = new UploadFileHandler()
      
      mockFs.mkdir.mockRejectedValue(new Error('Disk full'))

      const result = await handler.handle({
        userId: 'user_123',
        file: {
          buffer: Buffer.from('test content'),
          originalname: 'test.xlsx',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1024,
        },
      })

      expect(result.isSuccess).toBe(false)
      expect(result.error.code).toBe('File.UploadFailed')
    })
  })
})