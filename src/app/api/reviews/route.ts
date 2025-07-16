import { NextRequest, NextResponse } from "next/server"
import { GetReviewsValidator, GetReviewsHandler } from "@/Features/Review/GetReviews/GetReviews"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    
    const request = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
      sortBy: searchParams.get("sortBy") || "recent",
      filterRating: searchParams.get("rating") ? parseInt(searchParams.get("rating")!) : undefined,
    }

    // Validate request
    const validation = GetReviewsValidator.validate(request)
    if (!validation.isSuccess) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Handle request
    const handler = new GetReviewsHandler()
    const result = await handler.handle(validation.value)

    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("Get reviews error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}