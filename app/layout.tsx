import type { Metadata } from "next"
import "../src/app/globals.css"
import { ThemeProvider } from "@/components/providers/ThemeProvider"

export const metadata: Metadata = {
  title: "엑셀앱 - AI 엑셀 분석",
  description: "AI 기반 엑셀 오류 수정 및 자동화 솔루션",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="font-pretendard">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}