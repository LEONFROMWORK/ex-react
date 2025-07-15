"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface ErrorPattern {
  id: string
  errorType: string
  errorMessage: string
  frequency: number
  category: string
  severity: string
  resolutionRate: number
}

interface ErrorPatternTableProps {
  patterns: ErrorPattern[]
}

export function ErrorPatternTable({ patterns }: ErrorPatternTableProps) {
  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "secondary" | "default"> = {
      HIGH: "destructive",
      MEDIUM: "secondary",
      LOW: "default",
    }

    return (
      <Badge variant={variants[severity] || "default"}>
        {severity}
      </Badge>
    )
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      FORMULA: "text-blue-600",
      DATA_TYPE: "text-purple-600",
      REFERENCE: "text-red-600",
      FORMAT: "text-green-600",
      VALIDATION: "text-yellow-600",
      OTHER: "text-gray-600",
    }

    return colors[category] || "text-gray-600"
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>오류 유형</TableHead>
            <TableHead>카테고리</TableHead>
            <TableHead>심각도</TableHead>
            <TableHead>빈도</TableHead>
            <TableHead>해결률</TableHead>
            <TableHead className="w-[300px]">오류 메시지</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patterns.map((pattern) => (
            <TableRow key={pattern.id}>
              <TableCell className="font-medium">{pattern.errorType}</TableCell>
              <TableCell>
                <span className={`font-medium ${getCategoryColor(pattern.category)}`}>
                  {pattern.category}
                </span>
              </TableCell>
              <TableCell>{getSeverityBadge(pattern.severity)}</TableCell>
              <TableCell>
                <span className="font-mono">{pattern.frequency.toLocaleString()}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={pattern.resolutionRate} className="w-[60px]" />
                  <span className="text-sm text-muted-foreground">
                    {pattern.resolutionRate.toFixed(1)}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm text-muted-foreground truncate max-w-xs" title={pattern.errorMessage}>
                  {pattern.errorMessage}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}