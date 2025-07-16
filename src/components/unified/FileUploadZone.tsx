'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, AlertCircle, Zap, Code, X } from 'lucide-react'
import { validateExcelFile, getFileValidationError, FILE_CONSTRAINTS } from '@/lib/utils/file-validation'

interface FileUploadZoneProps {
  onUpload: (file: File) => Promise<void>
}

export function FileUploadZone({ onUpload }: FileUploadZoneProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationError(null)
    
    // 파일이 거부된 경우
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0]
      if (error.code === 'file-too-large') {
        setValidationError(`파일 크기는 ${FILE_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB를 초과할 수 없습니다.`)
      } else {
        setValidationError('지원되지 않는 파일 형식입니다.')
      }
      return
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // 클라이언트 사이드 검증
      const quickError = getFileValidationError(file)
      if (quickError) {
        setValidationError(quickError)
        return
      }
      
      // 상세 검증
      const validation = await validateExcelFile(file)
      if (!validation.valid) {
        setValidationError(validation.errors[0])
        return
      }
      
      // 업로드 시작
      setUploading(true)
      setUploadProgress(0)
      
      // 진행률 시뮬레이션 (실제로는 XMLHttpRequest나 axios로 진행률 추적)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)
      
      try {
        await onUpload(file)
        setUploadProgress(100)
      } catch (error) {
        setValidationError('업로드 중 오류가 발생했습니다.')
      } finally {
        clearInterval(progressInterval)
        setUploading(false)
        setTimeout(() => setUploadProgress(0), 1000)
      }
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12': ['.xlsb']
    },
    maxSize: FILE_CONSTRAINTS.MAX_FILE_SIZE,
    multiple: false,
    disabled: uploading
  })

  return (
    <div className="space-y-4">
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{validationError}</span>
            <button 
              onClick={() => setValidationError(null)}
              className="ml-2 hover:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="border-2 border-dashed">
        <CardContent className="p-12">
        <div
          {...getRootProps()}
          className={`text-center cursor-pointer transition-colors ${
            isDragActive ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="flex justify-center mb-4">
            {isDragActive ? (
              <FileSpreadsheet className="h-16 w-16 animate-pulse" />
            ) : (
              <Upload className="h-16 w-16" />
            )}
          </div>
          
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive
              ? '파일을 놓으세요'
              : 'Excel 파일을 드래그하거나 클릭하여 업로드'}
          </h3>
          
          <p className="text-sm">
            지원 형식: XLS, XLSX, XLSM, XLSB (최대 {FILE_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB)
          </p>
          
          {uploading && (
            <div className="mt-4 space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                업로드 중... {uploadProgress}%
              </p>
            </div>
          )}
          
          <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-red-100 p-3 mb-2">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <span>오류 감지</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-blue-100 p-3 mb-2">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <span>성능 최적화</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-purple-100 p-3 mb-2">
                <Code className="h-6 w-6 text-purple-600" />
              </div>
              <span>VBA 분석</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}