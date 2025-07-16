import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  withAuth, 
  handleApiError, 
  validateRequest,
  createApiResponse,
  createErrorResponse 
} from '@/lib/utils/common-patterns'
import { z } from 'zod'

// Define request schema
const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  title: z.string().min(1).max(100),
  content: z.string().min(10).max(1000),
  isAnonymous: z.boolean().default(false),
})

/**
 * Refactored version using common patterns
 * This reduces code duplication and improves maintainability
 */
export const POST = withAuth(async (req, session) => {
  try {
    // Parse request body
    const body = await req.json()
    
    // Validate request
    const validation = validateRequest(body, createReviewSchema)
    if (!validation.success) {
      return createErrorResponse(validation.error, 400)
    }
    
    const { rating, title, content, isAnonymous } = validation.data
    
    // Check if user already has a review
    const existingReview = await prisma.review.findUnique({
      where: { userId: session.user.id }
    })
    
    if (existingReview) {
      return createErrorResponse("You have already submitted a review", 400)
    }
    
    // Create review
    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        rating,
        title,
        content,
        isAnonymous,
        status: 'PENDING', // Reviews require admin approval
      }
    })
    
    // Log for fine-tuning if needed
    await prisma.fineTuningData.create({
      data: {
        input: `User review: ${title} - ${content}`,
        output: `Review created with rating ${rating}`,
        category: 'REVIEW',
        metadata: {
          reviewId: review.id,
          userId: session.user.id,
        }
      }
    })
    
    return createApiResponse({
      id: review.id,
      message: "Review submitted successfully. It will be visible after approval.",
    })
    
  } catch (error) {
    return handleApiError(error, 'create review')
  }
})

/**
 * Original implementation for comparison:
 * 
 * export async function POST(req: NextRequest) {
 *   try {
 *     const session = await getServerSession()
 *     if (!session) {
 *       return NextResponse.json(
 *         { error: "Unauthorized" },
 *         { status: 401 }
 *       )
 *     }
 *     
 *     const body = await req.json()
 *     // ... rest of the logic
 *     
 *   } catch (error) {
 *     console.error("Error creating review:", error)
 *     return NextResponse.json(
 *       { error: "Failed to create review" },
 *       { status: 500 }
 *     )
 *   }
 * }
 * 
 * Benefits of refactored version:
 * 1. Authentication is handled by withAuth wrapper
 * 2. Validation is centralized and type-safe
 * 3. Error handling is consistent across all routes
 * 4. Response format is standardized
 * 5. Less boilerplate code
 */