"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts"

interface ErrorPatternChartProps {
  data: any[]
  type: "category" | "confidence"
}

export function ErrorPatternChart({ data, type }: ErrorPatternChartProps) {
  if (type === "category") {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="발생 횟수" />
          <Bar yAxisId="right" dataKey="resolutionRate" fill="#82ca9d" name="해결률 (%)" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="errorType" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="avgConfidence" stroke="#8884d8" name="평균 신뢰도" />
        <Line type="monotone" dataKey="frequency" stroke="#82ca9d" name="발생 빈도" />
      </LineChart>
    </ResponsiveContainer>
  )
}