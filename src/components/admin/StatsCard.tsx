import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  description?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend = "neutral",
  trendValue,
  description,
  className,
}: StatsCardProps) {
  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-400",
  }

  const TrendIcon = trendIcons[trend]

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold">{value}</p>
              {description && (
                <span className="text-sm text-gray-500">{description}</span>
              )}
            </div>
            {trendValue && (
              <div className={cn("flex items-center space-x-1 text-sm", trendColors[trend])}>
                <TrendIcon className="w-4 h-4" />
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-gray-100 rounded-lg">
            <Icon className="w-6 h-6 text-gray-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}