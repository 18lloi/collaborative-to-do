import { signOut } from '../data/auth'

export function PendingPage() {
  return (
    <section>
      <h2>Waiting for approval</h2>
      <p>
        Your account is waiting for the site owner to approve it. This page updates on its own once
        you are in.
      </p>
      <button onClick={() => void signOut()}>Sign out</button>
    </section>
  )
}

export function RejectedPage() {
  return (
    <section>
      <h2>Access denied</h2>
      <p>The site owner did not approve this account.</p>
      <button onClick={() => void signOut()}>Sign out</button>
    </section>
  )
}
