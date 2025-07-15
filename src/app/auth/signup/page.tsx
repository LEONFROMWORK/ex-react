"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { signupSchema, type SignupInput } from "@/lib/validations/auth"
import { Loader2, Gift } from "lucide-react"
import axios from "axios"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const referralCode = searchParams.get("ref")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true)

    try {
      const signupData = {
        ...data,
        referralCode: referralCode || undefined,
      }
      
      const response = await axios.post("/api/auth/signup", signupData)

      if (response.data.success) {
        toast({
          title: "회원가입 성공",
          description: "이메일을 확인하여 계정을 활성화해주세요.",
        })
        router.push("/auth/login")
      }
    } catch (error: any) {
      toast({
        title: "회원가입 실패",
        description: error.response?.data?.message || "오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
          <CardDescription>
            계정을 생성하여 서비스를 시작하세요
          </CardDescription>
          {referralCode && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">추천 코드가 적용되었습니다!</p>
                <p className="text-blue-700">코드: {referralCode}</p>
              </div>
            </div>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                placeholder="홍길동"
                {...register("name")}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register("email")}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode">추천인 코드 (선택)</Label>
              <Input
                id="referralCode"
                placeholder="JOHN_A3B2"
                {...register("referralCode")}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              회원가입
            </Button>
            <p className="text-center text-sm text-gray-600">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/auth/login"
                className="text-blue-600 hover:underline"
              >
                로그인
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}