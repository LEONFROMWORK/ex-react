import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-helper"
import { z } from "zod"
import { FineTuningLogger } from "@/lib/fine-tuning/logger"
import { prisma } from "@/lib/prisma"

// Request validation schema
const FeedbackSchema = z.object({
  messageId: z.string().optional(),
  fineTuningDataId: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  helpful: z.boolean().optional(),
  feedbackText: z.string().optional(),
  correctedResponse: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      )
    }

    const body = await req.json()
    
    // Validate request
    const validationResult = FeedbackSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: "잘못된 요청입니다." },
        { status: 400 }
      )
    }

    const { messageId, fineTuningDataId, rating, helpful, feedbackText, correctedResponse } = validationResult.data
    
    const logger = new FineTuningLogger()
    
    // Update feedback for ChatMessage
    if (messageId) {
      await logger.updateChatMessageFeedback(messageId, {
        userRating: rating,
        wasHelpful: helpful,
        feedbackText,
        correctedResponse,
      })
    }
    
    // Update feedback for FineTuningData
    if (fineTuningDataId) {
      await logger.updateFeedback(fineTuningDataId, {
        userRating: rating,
        isHelpful: helpful,
        editedResponse: correctedResponse,
        wasEdited: !!correctedResponse,
      })
    }
    
    // Reward user with tokens for providing feedback
    if (rating || helpful !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          tokens: {
            increment: 5 // 피드백 제공 시 5 토큰 보상
          }
        }
      })
      
      // Log the token reward
      await prisma.transaction.create({
        data: {
          userId: session.user.id,
          type: "BONUS",
          amount: 0,
          tokens: 5,
          description: "AI 응답 피드백 제공 보상",
          status: "COMPLETED",
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      message: "피드백이 저장되었습니다.",
      tokensAwarded: rating || helpful !== undefined ? 5 : 0,
    })
  } catch (error) {
    console.error("Feedback error:", error)
    return NextResponse.json(
      { success: false, message: "피드백 처리 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// Get user's contribution stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다." },
        { status: 401 }
      )
    }
    
    const logger = new FineTuningLogger()
    const contribution = await logger.getUserContribution(session.user.id)
    
    return NextResponse.json({
      success: true,
      contribution,
    })
  } catch (error) {
    console.error("Get contribution error:", error)
    return NextResponse.json(
      { success: false, message: "기여도 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}