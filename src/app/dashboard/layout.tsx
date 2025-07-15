import { getServerSession } from "@/lib/auth-helper"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard/nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={session.user} />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}