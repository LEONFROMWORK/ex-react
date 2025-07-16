import { IFileService } from '../interfaces'

export class FileService implements IFileService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api'

  async uploadFile(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseUrl}/files/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.fileId
    } catch (error) {
      console.error('File upload error:', error)
      throw new Error('Failed to upload file')
    }
  }

  async downloadFile(fileId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('File download error:', error)
      throw new Error('Failed to download file')
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('File delete error:', error)
      throw new Error('Failed to delete file')
    }
  }

  private getAuthToken(): string {
    // In production, get from auth service
    const userData = localStorage.getItem('testUser')
    if (userData) {
      const user = JSON.parse(userData)
      return user.token || 'mock-token'
    }
    return 'mock-token'
  }
}