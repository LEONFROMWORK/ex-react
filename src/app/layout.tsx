import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"
// TailwindCDN removed - using built-in Tailwind CSS
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout"
import { WebVitals } from "@/components/performance/WebVitals"
import Script from 'next/script'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://exhell.vercel.app'),
  title: {
    default: "Exhell - AI 기반 Excel 오류 수정 플랫폼",
    template: "%s | Exhell"
  },
  description: "3단계 AI 시스템으로 Excel 파일의 오류를 자동 감지하고 수정합니다. Mistral → Llama → GPT-4 순으로 비용 효율적인 분석을 제공하는 SaaS 플랫폼입니다.",
  keywords: ["Excel", "오류수정", "AI", "자동화", "VBA", "엑셀분석", "데이터처리", "스프레드시트"],
  authors: [{ name: "Exhell Team" }],
  creator: "Exhell",
  publisher: "Exhell",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: 'Exhell',
    title: 'Exhell - AI 기반 Excel 오류 수정 플랫폼',
    description: '3단계 AI 시스템으로 Excel 파일의 오류를 자동 감지하고 수정합니다.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Exhell - AI Excel Error Correction Platform',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Exhell - AI 기반 Excel 오류 수정',
    description: '3단계 AI 시스템으로 Excel 오류를 자동 수정하는 플랫폼',
    images: ['/og-image.jpg'],
    creator: '@exhell_ai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: {
      'naver-site-verification': process.env.NAVER_SITE_VERIFICATION || '',
    },
  },
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
            <AuthenticatedLayout>
              {children}
            </AuthenticatedLayout>
            <Toaster />
            <WebVitals />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}