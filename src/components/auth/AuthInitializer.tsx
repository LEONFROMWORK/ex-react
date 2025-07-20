'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useUserStore } from '@/lib/stores/userStore'

export function AuthInitializer() {
  const { data: session } = useSession()
  const setCredits = useUserStore((state) => state.setCredits)
  
  useEffect(() => {
    if (session?.user?.tokens !== undefined) {
      setCredits(session.user.tokens)
    }
  }, [session, setCredits])
  
  return null
}