import { useAuth } from './auth/AuthContext'
import { SignInPage } from './auth/SignInPage'
import { PendingPage, RejectedPage } from './auth/StatusPages'
import { signOut } from './data/auth'

export default function App() {
  const auth = useAuth()

  return (
    <main>
      <h1>Collaborative To-Do</h1>
      {auth.status === 'loading' && <p>Loading…</p>}
      {auth.status === 'signed-out' && <SignInPage />}
      {auth.status === 'ready' && auth.profile.approvalStatus === 'pending' && <PendingPage />}
      {auth.status === 'ready' && auth.profile.approvalStatus === 'rejected' && <RejectedPage />}
      {auth.status === 'ready' && auth.profile.approvalStatus === 'approved' && (
        <section>
          <h2>Welcome, {auth.profile.displayName}</h2>
          {auth.profile.isSiteAdmin && <p>You are a site admin.</p>}
          <button onClick={() => void signOut()}>Sign out</button>
        </section>
      )}
    </main>
  )
}
