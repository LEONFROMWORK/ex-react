import { NextRequest, NextResponse } from "next/server"
import { getMockSession } from "@/lib/auth/mock-session"
import { writeFile } from "fs/promises"
import { join } from "path"
import { existsSync, mkdirSync } from "fs"
import { nanoid } from "nanoid"

export async function POST(req: NextRequest) {
  try {
    const session = await getMockSession()
    
    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          message: "인증이 필요합니다." 
        },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const analysisPrompt = formData.get("analysisPrompt") as string || ""
    
    // Collect all image files
    const files: File[] = []
    for (let i = 0; i < 10; i++) { // Support up to 10 files
      const file = formData.get(`imageFile${i}`) as File
      if (file) {
        files.push(file)
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "파일이 제공되지 않았습니다." 
        },
        { status: 400 }
      )
    }

    // Validate file types
    const validImageTypes = [
      "image/png",
      "image/jpeg", 
      "image/jpg",
      "image/gif",
      "image/webp"
    ]
    
    const validExcelTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv"
    ]
    
    const allValidTypes = [...validImageTypes, ...validExcelTypes]
    
    for (const file of files) {
      if (!allValidTypes.includes(file.type)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `지원하지 않는 파일 형식입니다: ${file.name}. 이미지(PNG, JPG, GIF, WebP) 또는 Excel(XLSX, XLS, CSV) 파일만 가능합니다.` 
          },
          { status: 400 }
        )
      }
    }

    // Check file sizes (50MB limit per file)
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { 
            success: false, 
            message: `파일 크기는 50MB를 초과할 수 없습니다: ${file.name}` 
          },
          { status: 400 }
        )
      }
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "uploads")
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    // Process and save files
    const sessionId = nanoid()
    const uploadedFiles = []
    
    for (const file of files) {
      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${sessionId}-${timestamp}-${file.name}`
      const filepath = join(uploadDir, filename)

      // Save file
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      // Create file record
      const fileRecord = {
        id: nanoid(),
        sessionId,
        userId: session.user.id,
        fileName: filename,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadUrl: `/uploads/${filename}`,
        isImage: validImageTypes.includes(file.type),
        status: "PENDING",
        createdAt: new Date()
      }

      uploadedFiles.push(fileRecord)
    }

    console.log('Multiple files uploaded:', {
      sessionId,
      fileCount: uploadedFiles.length,
      analysisPrompt
    })

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        files: uploadedFiles,
        analysisPrompt,
        totalFiles: uploadedFiles.length
      }
    })
  } catch (error) {
    console.error("Multiple file upload error:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: "파일 업로드 중 오류가 발생했습니다." 
      },
      { status: 500 }
    )
  }
}