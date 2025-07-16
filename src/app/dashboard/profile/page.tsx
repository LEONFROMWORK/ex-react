"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { User, CreditCard, Share2, Settings, Loader2 } from "lucide-react"
import axios from "axios"
import * as z from "zod"

const profileSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다"),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [referralCode, setReferralCode] = useState("")
  const [tokens, setTokens] = useState(100)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    const testUser = localStorage.getItem('testUser')
    if (!testUser) {
      router.push("/auth/simple-login")
      return
    }
    
    const userData = JSON.parse(testUser)
    setUser(userData)
    setReferralCode(`REF${userData.id.toUpperCase().slice(0, 6)}`)
    reset({
      name: userData.name,
      phone: "",
      company: "",
      position: "",
    })
  }, [router, reset])

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      // 로컬 스토리지 업데이트 (테스트용)
      const updatedUser = { ...user, name: data.name }
      localStorage.setItem('testUser', JSON.stringify(updatedUser))
      setUser(updatedUser)
      
      toast({
        title: "프로필 업데이트",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      })
    } catch (error) {
      toast({
        title: "업데이트 실패",
        description: "프로필 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode)
    toast({
      title: "복사 완료",
      description: "추천 코드가 클립보드에 복사되었습니다.",
    })
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">프로필</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          계정 정보를 관리하고 설정을 변경하세요
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            프로필 정보
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            결제 및 토큰
          </TabsTrigger>
          <TabsTrigger value="referral">
            <Share2 className="h-4 w-4 mr-2" />
            추천 프로그램
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>프로필 정보</CardTitle>
              <CardDescription>
                개인 정보를 업데이트하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">회사명</Label>
                  <Input
                    id="company"
                    {...register("company")}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">직책</Label>
                  <Input
                    id="position"
                    {...register("position")}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  저장
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>토큰 및 구독</CardTitle>
              <CardDescription>
                현재 토큰 잔액과 구독 정보를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">현재 토큰</p>
                  <p className="text-2xl font-bold">{tokens} 토큰</p>
                </div>
                <Button>토큰 구매</Button>
              </div>

              <div>
                <h3 className="font-medium mb-4">토큰 패키지</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Starter</CardTitle>
                      <CardDescription>100 토큰</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">₩5,000</p>
                      <Button className="w-full mt-4" variant="outline">
                        구매
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Professional</CardTitle>
                      <CardDescription>500 토큰</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">₩20,000</p>
                      <Badge className="mb-2">20% 할인</Badge>
                      <Button className="w-full mt-4" variant="outline">
                        구매
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Business</CardTitle>
                      <CardDescription>2000 토큰</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">₩70,000</p>
                      <Badge className="mb-2">30% 할인</Badge>
                      <Button className="w-full mt-4">
                        구매
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referral">
          <Card>
            <CardHeader>
              <CardTitle>추천 프로그램</CardTitle>
              <CardDescription>
                친구를 초대하고 보너스 토큰을 받으세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium mb-2">나의 추천 코드</h3>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={referralCode}
                      readOnly
                      className="font-mono"
                    />
                    <Button onClick={copyReferralCode} variant="outline">
                      복사
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">추천 보상</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      추천인: 500 토큰 보상
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      피추천인: 200 토큰 보상
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      피추천인이 이메일 인증을 완료하면 보상이 지급됩니다
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2">추천 현황</h3>
                  <p className="text-sm text-gray-600">
                    아직 추천한 사용자가 없습니다
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}