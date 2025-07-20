"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { SessionProvider } from "@/components/auth/SessionProvider"
import { AuthInitializer } from "@/components/auth/AuthInitializer"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthInitializer />
          {children}
        </QueryClientProvider>
      </NextThemesProvider>
    </SessionProvider>
  )
}