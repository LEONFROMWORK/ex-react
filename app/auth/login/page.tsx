"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { useToast } from "@/components/ui/use-toast"
import { Loader2, FileSpreadsheet } from "lucide-react"
// import { ThemeToggle } from "@/src/components/theme-toggle"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import Image from "next/image"

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="w-9 h-9"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // const { toast } = useToast()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const from = searchParams.get("from") || "/dashboard"

  const handleOAuthSignIn = async (provider: 'google' | 'kakao') => {
    setIsLoading(provider)
    try {
      await signIn(provider, {
        callbackUrl: from,
      })
    } catch (error) {
      // toast({
      //   title: "로그인 실패",
      //   description: "다시 시도해주세요.",
      //   variant: "destructive",
      // })
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <FileSpreadsheet className="h-6 w-6 dark:text-white" />
            <span className="text-xl font-bold dark:text-white">Exhell</span>
          </Link>
          <ThemeToggleButton />
        </div>
      </nav>
      
      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-4 pt-16">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">환영합니다</CardTitle>
            <CardDescription>
              간편하게 로그인하여 Excel 오류를 해결하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Login Button */}
            <Button
              variant="outline"
              className="w-full h-12 relative"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading !== null}
            >
              {isLoading === 'google' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
              )}
              구글로 로그인
            </Button>

            {/* Kakao Login Button */}
            <Button
              className="w-full h-12 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black"
              onClick={() => handleOAuthSignIn('kakao')}
              disabled={isLoading !== null}
            >
              {isLoading === 'kakao' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 3c-5.865 0-10.61 3.774-10.61 8.426 0 3.012 1.995 5.649 4.994 7.128-.213 1.003-.64 2.923-.737 3.371-.12.555.204.548.428.398.175-.117 2.803-1.915 3.954-2.705a12.85 12.85 0 001.971.151c5.865 0 10.61-3.773 10.61-8.425S17.865 3 12 3"
                  />
                </svg>
              )}
              카카오로 로그인
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">
                  소셜 로그인으로 간편하게 시작하세요
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              로그인 시{" "}
              <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                이용약관
              </Link>
              과{" "}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                개인정보처리방침
              </Link>
              에 동의하게 됩니다.
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-300">&copy; 2024 엑셀앱 (Exhell). 모든 권리 보유.</p>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="text-gray-300 hover:text-white transition-colors">
                이용약관
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}