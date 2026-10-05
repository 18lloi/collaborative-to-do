import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  displayName: string
  avatarUrl: string | null
  approvalStatus: ApprovalStatus
  isSiteAdmin: boolean
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** Calls `callback` on every sign-in/out. Returns an unsubscribe function. */
export function onSessionChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function fetchMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, approval_status, is_site_admin')
    .eq('id', userId)
    .single()
  if (error) throw error
  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    approvalStatus: data.approval_status,
    isSiteAdmin: data.is_site_admin,
  }
}
