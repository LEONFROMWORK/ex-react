"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface AIUsageChartProps {
  data: {
    date: string
    tier1: number
    tier2: number
    tokens: number
    cost: number
  }[]
}

export function AIUsageChart({ data }: AIUsageChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    date: format(new Date(item.date), "MM/dd", { locale: ko }),
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip 
          formatter={(value: number) => value.toLocaleString()}
          labelFormatter={(label) => `날짜: ${label}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="tier1" 
          stroke="#3B82F6" 
          name="Tier 1" 
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="tier2" 
          stroke="#8B5CF6" 
          name="Tier 2" 
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}