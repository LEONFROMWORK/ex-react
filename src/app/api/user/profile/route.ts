import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { prisma } from "@/lib/prisma"
import * as z from "zod"

export const dynamic = 'force-dynamic'

const profileUpdateSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      tokens: user.tokens,
      referralCode: user.referralCode,
      role: user.role,
      profile: user.profile,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { success: false, message: "프로필 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const body = await req.json()
    const validatedData = profileUpdateSchema.parse(body)

    // Update user name
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: validatedData.name },
    })

    // Update or create profile
    await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        phone: validatedData.phone,
        company: validatedData.company,
        position: validatedData.position,
      },
      create: {
        userId: session.user.id,
        phone: validatedData.phone,
        company: validatedData.company,
        position: validatedData.position,
      },
    })

    return NextResponse.json({
      success: true,
      message: "프로필이 업데이트되었습니다.",
    })
  } catch (error) {
    console.error("Profile update error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "입력 데이터를 확인해주세요.", errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}