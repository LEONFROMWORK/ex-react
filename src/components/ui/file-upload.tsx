"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { Cloud, FileIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  value?: File | null
  onChange?: (file: File | null) => void
  accept?: Record<string, string[]>
  maxSize?: number
  disabled?: boolean
  className?: string
}

export function FileUpload({
  value,
  onChange,
  accept = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv'],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  disabled,
  className,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false)

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onChange?.(acceptedFiles[0])
      }
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled: disabled || isUploading,
    multiple: false,
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
        isDragActive && "border-primary bg-primary/5",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">업로드 중...</p>
        </div>
      ) : value ? (
        <div className="flex flex-col items-center gap-2">
          <FileIcon className="h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {value.name}
          </p>
          <p className="text-xs text-gray-500">
            {(value.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Cloud className="h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {isDragActive
              ? "파일을 놓으세요"
              : "파일을 드래그하여 놓으세요"}
          </p>
          <p className="text-xs text-gray-500">
            또는 클릭하여 선택
          </p>
          <p className="text-xs text-gray-400 mt-2">
            지원 형식: XLSX, XLS, CSV (최대 50MB)
          </p>
        </div>
      )}
    </div>
  )
}