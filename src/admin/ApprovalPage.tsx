import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listUsersForAdmin, setApprovalStatus, type AdminUser } from '../data/admin'
import type { ApprovalStatus } from '../data/auth'

const TABS: ApprovalStatus[] = ['pending', 'approved', 'rejected']
const REFRESH_MS = 10_000

export function ApprovalPage({ currentUserId }: { currentUserId: string }) {
  const [tab, setTab] = useState<ApprovalStatus>('pending')
  const queryClient = useQueryClient()

  const users = useQuery({
    queryKey: ['admin-users'],
    queryFn: listUsersForAdmin,
    refetchInterval: REFRESH_MS,
  })

  const change = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApprovalStatus }) =>
      setApprovalStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const counts = (status: ApprovalStatus) =>
    users.data?.filter((u) => u.approvalStatus === status).length ?? 0
  const visible = users.data?.filter((u) => u.approvalStatus === tab) ?? []

  return (
    <section>
      <h2>User approvals</h2>
      <div role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{ fontWeight: tab === t ? 'bold' : 'normal' }}
          >
            {t} ({counts(t)})
          </button>
        ))}
      </div>

      {users.isPending && <p>Loading…</p>}
      {users.isError && <p role="alert">Could not load users: {users.error.message}</p>}
      {change.isError && <p role="alert">Could not update user: {change.error.message}</p>}
      {users.data && visible.length === 0 && <p>No {tab} users.</p>}

      {visible.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Signed up</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === currentUserId}
                busy={change.isPending}
                onChange={(status) => change.mutate({ id: user.id, status })}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function UserRow({
  user,
  isSelf,
  busy,
  onChange,
}: {
  user: AdminUser
  isSelf: boolean
  busy: boolean
  onChange: (status: ApprovalStatus) => void
}) {
  return (
    <tr>
      <td>{user.email ?? '(no email)'}</td>
      <td>{user.displayName}</td>
      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        {isSelf ? (
          <em>you</em>
        ) : (
          <>
            {user.approvalStatus !== 'approved' && (
              <button disabled={busy} onClick={() => onChange('approved')}>
                Approve
              </button>
            )}
            {user.approvalStatus !== 'rejected' && (
              <button disabled={busy} onClick={() => onChange('rejected')}>
                Reject
              </button>
            )}
          </>
        )}
      </td>
    </tr>
  )
}
