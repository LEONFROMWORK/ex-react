import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signupSchema } from "@/lib/validations/auth"
import { generateReferralCode } from "@/lib/utils/referral"
import { ProcessReferralHandler } from "@/Features/Referral/ProcessReferral/ProcessReferral"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "이미 사용 중인 이메일입니다." },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Generate unique referral code
    const referralCode = await generateReferralCode(validatedData.name)

    // Create user with transaction to ensure atomicity
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          referralCode,
          referredBy: validatedData.referralCode || null,
        },
      })

      // Create default subscription
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: "FREE",
          tokensRemaining: 100, // Initial free tokens
          monthlyTokens: 100,
        },
      })

      return newUser
    })

    // Handle referral rewards if applicable
    if (validatedData.referralCode) {
      const referralHandler = new ProcessReferralHandler()
      const referralResult = await referralHandler.handle({
        referrerCode: validatedData.referralCode,
        refereeEmail: user.email,
        refereeUserId: user.id,
      })

      if (!referralResult.isSuccess) {
        console.warn("Referral processing failed:", referralResult.error)
      }
    }

    // TODO: Send verification email

    return NextResponse.json({
      success: true,
      message: "회원가입이 완료되었습니다. 이메일을 확인해주세요.",
    })
  } catch (error: any) {
    console.error("Signup error:", error)
    
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, message: "입력 데이터를 확인해주세요.", errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}