import NextAuth from "next-auth"
import { authOptions } from "./auth"

export async function getServerSession() {
  const { auth } = NextAuth(authOptions as any)
  return await auth()
}