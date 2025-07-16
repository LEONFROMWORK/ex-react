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
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          message: "파일이 제공되지 않았습니다." 
        },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv"
    ]
    
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "지원하지 않는 파일 형식입니다. XLSX, XLS, CSV 파일만 가능합니다." 
        },
        { status: 400 }
      )
    }

    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { 
          success: false, 
          message: "파일 크기는 50MB를 초과할 수 없습니다." 
        },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), "uploads")
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filepath = join(uploadDir, filename)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Create mock file record
    const fileId = nanoid()
    const fileRecord = {
      id: fileId,
      userId: session.user.id,
      fileName: filename,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadUrl: `/uploads/${filename}`,
      status: "PENDING",
      createdAt: new Date()
    }

    // Store file info in memory or local storage for mock
    if (typeof window !== 'undefined') {
      const files = JSON.parse(localStorage.getItem('mockFiles') || '[]')
      files.push(fileRecord)
      localStorage.setItem('mockFiles', JSON.stringify(files))
    }

    console.log('File uploaded:', fileRecord)

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      data: fileRecord
    })
  } catch (error) {
    console.error("File upload error:", error)
    return NextResponse.json(
      { 
        success: false, 
        message: "파일 업로드 중 오류가 발생했습니다." 
      },
      { status: 500 }
    )
  }
}