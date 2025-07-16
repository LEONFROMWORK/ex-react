import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"
// TailwindCDN removed - using built-in Tailwind CSS
import { ErrorBoundary } from "@/components/ErrorBoundary"
import Script from 'next/script'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Exhell - AI 기반 엑셀 오류 수정 플랫폼",
  description: "엑셀 파일의 오류를 자동으로 감지하고 수정하는 AI 기반 SaaS 플랫폼",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <Script
          id="block-web3"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Web3 주입 차단
              if (typeof window !== 'undefined') {
                const blockList = ['ethereum', 'web3', 'tronWeb', 'solana'];
                blockList.forEach(prop => {
                  try {
                    Object.defineProperty(window, prop, {
                      get: () => undefined,
                      set: () => false,
                      configurable: false
                    });
                  } catch (e) {}
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}