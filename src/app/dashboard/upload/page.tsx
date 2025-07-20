"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileSpreadsheet, AlertCircle, Loader2, Coins } from "lucide-react"
import { cn } from "@/lib/utils"
import apiClient from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export default function UploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [userTokens, setUserTokens] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  useEffect(() => {
    // 로그인 확인
    const testUser = localStorage.getItem('testUser')
    if (!testUser) {
      router.push('/auth/simple-login')
    } else {
      const userData = JSON.parse(testUser)
      setUserTokens(userData.tokens || 0)
    }
  }, [router])

  // 파일 크기에 따른 예상 토큰 계산
  const calculateEstimatedTokens = (fileSize: number) => {
    const sizeInMB = fileSize / (1024 * 1024)
    // 1MB당 약 10토큰 소비 (예시)
    return Math.max(10, Math.ceil(sizeInMB * 10))
  }

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
      // 토큰 차감
      const userData = JSON.parse(localStorage.getItem('testUser') || '{}')
      const tokenCost = calculateEstimatedTokens(uploadedFile.size)
      
      if (userData.tokens < tokenCost) {
        toast({
          title: "토큰 부족",
          description: "토큰이 부족합니다. 충전 후 이용해주세요.",
          variant: "destructive",
        })
        return
      }

      // Mock 파일 ID 생성
      const fileId = `file-${Date.now()}`
      
      // 파일 업로드 시뮬레이션 (실제로는 서버로 전송)
      toast({
        title: "업로드 시작",
        description: "파일을 업로드하고 있습니다...",
      })

      // 진행률 시뮬레이션
      setUploadProgress(0)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            return 100
          }
          return prev + 10
        })
      }, 200)

      // 업로드 시뮬레이션 대기
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 업로드 완료 후 토큰 차감
      userData.tokens -= tokenCost
      localStorage.setItem('testUser', JSON.stringify(userData))
      
      // 토큰 사용 내역 추가
      const tokenHistory = JSON.parse(localStorage.getItem('tokenHistory') || '[]')
      tokenHistory.push({
        id: tokenHistory.length + 1,
        type: 'usage',
        amount: -tokenCost,
        description: `파일 분석: ${uploadedFile.name}`,
        date: new Date().toISOString()
      })
      localStorage.setItem('tokenHistory', JSON.stringify(tokenHistory))

      // 파일 정보 저장
      const uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles') || '[]')
      uploadedFiles.push({
        id: fileId,
        name: uploadedFile.name,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        status: 'processing',
        tokenCost
      })
      localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles))

      toast({
        title: "업로드 완료",
        description: `파일 분석을 시작합니다. (${tokenCost} 토큰 사용)`,
      })
      
      router.push(`/dashboard/analysis/${fileId}`)
    } catch (error: any) {
      toast({
        title: "업로드 실패",
        description: error.response?.data?.message || "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">파일 업로드</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Excel 파일을 업로드하여 오류를 자동으로 검사하고 수정하세요
        </p>
      </div>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-indigo-950/30">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-indigo-500/5" />
        <CardHeader className="relative">
          <CardTitle className="text-blue-700 dark:text-blue-300">Excel 파일 선택</CardTitle>
          <CardDescription className="text-blue-600/70 dark:text-blue-300/70">
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
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-lg font-medium mb-2 dark:text-white">
                {isDragActive
                  ? "파일을 여기에 놓으세요"
                  : "파일을 드래그하거나 클릭하여 선택하세요"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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

              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30 border-0 rounded-lg p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5" />
                <div className="relative flex items-start space-x-2">
                  <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <AlertCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-sm text-emerald-800 dark:text-emerald-200 flex-1">
                    <p className="font-medium mb-1">파일이 준비되었습니다</p>
                    <p>업로드 버튼을 클릭하면 파일 분석이 시작됩니다.</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>예상 토큰 사용량: {calculateEstimatedTokens(uploadedFile.size)}개</span>
                      </div>
                      <Badge variant={userTokens >= calculateEstimatedTokens(uploadedFile.size) ? "default" : "destructive"} className="bg-emerald-600 dark:bg-emerald-700">
                        잔액: {userTokens} 토큰
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={isUploading || userTokens < calculateEstimatedTokens(uploadedFile.size)}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : userTokens < calculateEstimatedTokens(uploadedFile.size) ? (
                  <>
                    <Coins className="mr-2 h-4 w-4" />
                    토큰이 부족합니다
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    파일 업로드 및 분석 시작
                  </>
                )}
              </Button>

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-center text-gray-600">
                    업로드 중... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-red-950/30">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5" />
        <CardHeader className="relative">
          <CardTitle className="text-amber-700 dark:text-amber-300">업로드 전 확인사항</CardTitle>
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