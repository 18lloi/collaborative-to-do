import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../data/auth'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'ready'; session: Session; profile: Profile }

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
