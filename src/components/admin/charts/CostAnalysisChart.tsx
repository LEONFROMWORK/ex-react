"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface CostAnalysisChartProps {
  data: {
    model: string
    requests: number
    tokens: number
    avgTokensPerRequest: number
    cost: number
  }[]
}

export function CostAnalysisChart({ data }: CostAnalysisChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    model: item.model.replace("gpt-", "GPT-"),
    costPerRequest: item.cost / item.requests,
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="model" />
        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === "비용") return `$${value.toFixed(4)}`
            return value.toLocaleString()
          }}
        />
        <Legend />
        <Bar yAxisId="left" dataKey="requests" fill="#8884d8" name="요청 수" />
        <Bar yAxisId="right" dataKey="cost" fill="#82ca9d" name="비용" />
      </BarChart>
    </ResponsiveContainer>
  )
}