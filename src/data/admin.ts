import { supabase } from './supabase'
import type { ApprovalStatus } from './auth'

export interface AdminUser {
  id: string
  email: string | null
  displayName: string
  approvalStatus: ApprovalStatus
  isSiteAdmin: boolean
  createdAt: string
}

/** Site admins only: every user with their email. Enforced in Postgres, not here. */
export async function listUsersForAdmin(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('list_users_for_admin')
  if (error) throw error
  return data.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    approvalStatus: u.approval_status,
    isSiteAdmin: u.is_site_admin,
    createdAt: u.created_at,
  }))
}

export async function setApprovalStatus(userId: string, status: ApprovalStatus): Promise<void> {
  const { error } = await supabase.rpc('set_approval_status', {
    target_user: userId,
    new_status: status,
  })
  if (error) throw error
}
