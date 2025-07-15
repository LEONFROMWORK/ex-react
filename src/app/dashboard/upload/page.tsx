"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import axios from "axios"

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0])
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
  })

  const handleUpload = async () => {
    if (!uploadedFile) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", uploadedFile)

    try {
      const response = await axios.post("/api/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.data.success) {
        toast({
          title: "업로드 성공",
          description: "파일 분석을 시작합니다.",
        })
        router.push(`/dashboard/analysis/${response.data.fileId}`)
      }
    } catch (error: any) {
      toast({
        title: "업로드 실패",
        description: error.response?.data?.message || "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">파일 업로드</h1>
        <p className="text-gray-600 mt-2">
          Excel 파일을 업로드하여 오류를 자동으로 검사하고 수정하세요
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Excel 파일 선택</CardTitle>
          <CardDescription>
            지원 형식: XLSX, XLS, CSV (최대 50MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!uploadedFile ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-primary"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">
                {isDragActive
                  ? "파일을 여기에 놓으세요"
                  : "파일을 드래그하거나 클릭하여 선택하세요"}
              </p>
              <p className="text-sm text-gray-500">
                XLSX, XLS, CSV 파일 지원 (최대 50MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  제거
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">파일이 준비되었습니다</p>
                    <p>업로드 버튼을 클릭하면 파일 분석이 시작됩니다.</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    파일 업로드 및 분석 시작
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>업로드 전 확인사항</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              파일에 민감한 정보가 포함되어 있지 않은지 확인하세요
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              복잡한 매크로나 VBA 코드는 제거될 수 있습니다
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              분석에는 파일 크기에 따라 수 초에서 수 분이 소요될 수 있습니다
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              업로드된 파일은 안전하게 암호화되어 저장됩니다
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}