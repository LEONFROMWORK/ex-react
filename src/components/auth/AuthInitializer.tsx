'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useUserStore } from '@/lib/stores/userStore'

export function AuthInitializer() {
  const { data: session } = useSession()
  const setTokens = useUserStore((state) => state.setTokens)
  
  useEffect(() => {
    if (session?.user?.tokens !== undefined) {
      setTokens(session.user.tokens)
    }
  }, [session, setTokens])
  
  return null
}