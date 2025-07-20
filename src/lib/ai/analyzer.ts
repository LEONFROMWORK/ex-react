import OpenAI from "openai"
import { ExcelError } from "@/types/excel"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AIAnalysisResult {
  tier: "TIER1" | "TIER2"
  confidence: number
  corrections: ExcelError[]
  insights: string
  tokensUsed: number
  promptTokens: number
  completionTokens: number
  cost: number
  tokensSaved?: number
  costSaved?: number
}

export async function analyzeWithAI(
  errors: ExcelError[],
  aiTier: "auto" | "economy" | "premium"
): Promise<AIAnalysisResult> {
  // Check cache first
  const cacheKey = generateCacheKey(errors)
  const cachedResult = await checkCache(cacheKey)
  
  if (cachedResult) {
    return {
      ...cachedResult,
      tokensSaved: cachedResult.tokensUsed,
      costSaved: cachedResult.cost,
    }
  }

  // Prepare error summary for AI
  const errorSummary = prepareErrorSummary(errors)

  // Start with Tier 1 analysis
  let result = await analyzeTier1(errorSummary)

  // Check if we need Tier 2 analysis
  if (shouldUseTier2(result, errors, aiTier)) {
    result = await analyzeTier2(errorSummary, result)
  }

  // Save to cache
  await saveToCache(cacheKey, result)

  return result
}

function prepareErrorSummary(errors: ExcelError[]): string {
  const summary = errors.slice(0, 50).map(error => ({
    type: error.type,
    location: error.location,
    description: error.description,
    value: error.value,
  }))

  return JSON.stringify(summary, null, 2)
}

async function analyzeTier1(errorSummary: string): Promise<AIAnalysisResult> {
  const prompt = `You are an Excel error analysis assistant. Analyze these errors and provide corrections.

Errors:
${errorSummary}

Respond in JSON format:
{
  "confidence": 0-100,
  "corrections": [
    {
      "location": "cell location",
      "suggestion": "specific fix",
      "corrected": true/false
    }
  ],
  "insights": "brief analysis"
}`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an Excel expert. Analyze errors and suggest fixes. Be concise and accurate.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(response.choices[0].message.content || "{}")
    const usage = response.usage!

    return {
      tier: "TIER1",
      confidence: result.confidence || 0,
      corrections: result.corrections || [],
      insights: result.insights || "",
      tokensUsed: usage.total_tokens,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      cost: calculateCost("gpt-3.5-turbo", usage.total_tokens),
    }
  } catch (error) {
    console.error("Tier 1 analysis error:", error)
    return {
      tier: "TIER1",
      confidence: 0,
      corrections: [],
      insights: "분석 중 오류가 발생했습니다.",
      tokensUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
    }
  }
}

async function analyzeTier2(
  errorSummary: string,
  tier1Result: AIAnalysisResult
): Promise<AIAnalysisResult> {
  const prompt = `You are an advanced Excel error analysis expert. The initial analysis had low confidence.
Please provide a more detailed analysis with specific corrections.

Errors:
${errorSummary}

Initial Analysis (Confidence: ${tier1Result.confidence}%):
${tier1Result.insights}

Provide detailed corrections and insights. Focus on complex formulas and business logic.

Respond in JSON format:
{
  "confidence": 0-100,
  "corrections": [
    {
      "location": "cell location",
      "suggestion": "detailed fix with explanation",
      "corrected": true,
      "formula": "corrected formula if applicable"
    }
  ],
  "insights": "detailed analysis with business context"
}`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an Excel expert with deep knowledge of formulas, data analysis, and business processes. Provide detailed, actionable corrections.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(response.choices[0].message.content || "{}")
    const usage = response.usage!

    return {
      tier: "TIER2",
      confidence: result.confidence || 0,
      corrections: result.corrections || [],
      insights: result.insights || "",
      tokensUsed: usage.total_tokens + tier1Result.tokensUsed,
      promptTokens: usage.prompt_tokens + tier1Result.promptTokens,
      completionTokens: usage.completion_tokens + tier1Result.completionTokens,
      cost: calculateCost("gpt-4", usage.total_tokens) + tier1Result.cost,
    }
  } catch (error) {
    console.error("Tier 2 analysis error:", error)
    return tier1Result // Fallback to Tier 1 result
  }
}

function shouldUseTier2(
  tier1Result: AIAnalysisResult,
  errors: ExcelError[],
  aiTier: string
): boolean {
  // User preference
  if (aiTier === "economy") return false
  if (aiTier === "premium") return true

  // Auto mode logic
  const conditions = [
    tier1Result.confidence < 85, // Low confidence
    errors.some(e => e.severity === "high"), // High severity errors
    errors.length > 20, // Many errors
    errors.some(e => e.type === "FORMULA_ERROR" && e.description.includes("complex")),
  ]

  return conditions.filter(Boolean).length >= 2
}

function calculateCost(model: string, tokens: number): number {
  const costs = {
    "gpt-3.5-turbo": 0.0005 / 1000, // $0.0005 per 1K tokens
    "gpt-4": 0.03 / 1000, // $0.03 per 1K tokens
  }

  return tokens * (costs[model as keyof typeof costs] || 0)
}

function generateCacheKey(errors: ExcelError[]): string {
  const data = errors.map(e => `${e.type}:${e.location}:${e.description}`).join("|")
  return crypto.createHash("md5").update(data).digest("hex")
}

async function checkCache(key: string): Promise<AIAnalysisResult | null> {
  const cached = await prisma.aIPromptCache.findUnique({
    where: { promptHash: key },
  })

  if (cached && cached.expiresAt > new Date()) {
    await prisma.aIPromptCache.update({
      where: { id: cached.id },
      data: { hitCount: cached.hitCount + 1 },
    })

    return cached.response as unknown as AIAnalysisResult
  }

  return null
}

async function saveToCache(key: string, result: AIAnalysisResult) {
  await prisma.aIPromptCache.create({
    data: {
      promptHash: key,
      model: result.tier === "TIER1" ? "gpt-3.5-turbo" : "gpt-4",
      response: result as any,
      confidence: result.confidence,
      creditsUsed: (result as any).creditsUsed || (result as any).tokensUsed || 0,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    },
  }).catch(() => {}) // Ignore duplicate key errors
}