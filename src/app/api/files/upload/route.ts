import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { UploadExcelHandler } from "@/Features/ExcelUpload/UploadExcel"
import { AuthErrors } from "@/Common/Errors"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          error: AuthErrors.Unauthorized 
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

    // Use vertical slice handler
    const handler = new UploadExcelHandler()
    const result = await handler.handle({
      file,
      userId: session.user.id,
    })

    if (result.isFailure) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.value,
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