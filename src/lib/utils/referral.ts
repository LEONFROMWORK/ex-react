import { prisma } from "@/lib/prisma"

export async function generateReferralCode(userName: string): Promise<string> {
  const baseCode = userName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4)
    .padEnd(4, "X")

  let attempts = 0
  let code = ""

  while (attempts < 10) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    code = `${baseCode}_${randomSuffix}`

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
    })

    if (!existing) {
      return code
    }

    attempts++
  }

  // Fallback to timestamp-based code
  const timestamp = Date.now().toString(36).toUpperCase()
  return `${baseCode}_${timestamp.slice(-4)}`
}