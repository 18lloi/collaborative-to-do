import { useState } from 'react'
import { ApprovalPage } from './admin/ApprovalPage'
import { useAuth } from './auth/AuthContext'
import { SignInPage } from './auth/SignInPage'
import { PendingPage, RejectedPage } from './auth/StatusPages'
import { signOut } from './data/auth'

export default function App() {
  const auth = useAuth()
  const [view, setView] = useState<'home' | 'approvals'>('home')

  return (
    <main>
      <h1>Collaborative To-Do</h1>
      {auth.status === 'loading' && <p>Loading…</p>}
      {auth.status === 'signed-out' && <SignInPage />}
      {auth.status === 'ready' && auth.profile.approvalStatus === 'pending' && <PendingPage />}
      {auth.status === 'ready' && auth.profile.approvalStatus === 'rejected' && <RejectedPage />}
      {auth.status === 'ready' && auth.profile.approvalStatus === 'approved' && (
        <>
          <nav>
            <button onClick={() => setView('home')}>Home</button>
            {auth.profile.isSiteAdmin && (
              <button onClick={() => setView('approvals')}>Approvals</button>
            )}
            <button onClick={() => void signOut()}>Sign out</button>
          </nav>
          {view === 'approvals' && auth.profile.isSiteAdmin ? (
            <ApprovalPage currentUserId={auth.profile.id} />
          ) : (
            <section>
              <h2>Welcome, {auth.profile.displayName}</h2>
              {auth.profile.isSiteAdmin && <p>You are a site admin.</p>}
            </section>
          )}
        </>
      )}
    </main>
  )
}
