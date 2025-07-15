import { ReferralWidgetV2 } from "@/components/referral/ReferralWidgetV2"

export default function ReferralPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">추천 프로그램</h1>
        <p className="text-muted-foreground mt-2">
          친구가 첫 결제를 완료하면 토큰과 현금 보상을 받으세요
        </p>
      </div>

      <ReferralWidgetV2 />
    </div>
  )
}