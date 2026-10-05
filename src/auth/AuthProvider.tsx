import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { fetchMyProfile, getSession, onSessionChange } from '../data/auth'
import { AuthContext, type AuthState } from './AuthContext'

// A pending user waits for an admin; re-check now and then so they get in without a reload.
const PENDING_POLL_MS = 5000

export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = still asking Supabase; null = signed out
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    getSession().then((s) => active && setSession((prev) => (prev === undefined ? s : prev)))
    const unsubscribe = onSessionChange((s) => active && setSession(s))
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const userId = session?.user.id
  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchMyProfile(userId!),
    enabled: !!userId,
    refetchInterval: (query) =>
      query.state.data?.approvalStatus === 'approved' ? false : PENDING_POLL_MS,
  })

  let value: AuthState
  if (session === undefined) value = { status: 'loading' }
  else if (session === null) value = { status: 'signed-out' }
  else if (!profile.data) value = { status: 'loading' }
  else value = { status: 'ready', session, profile: profile.data }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
