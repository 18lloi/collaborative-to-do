import { useState, type FormEvent } from 'react'
import { sendMagicLink } from '../data/auth'

export function SignInPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setState('sending')
    setError(null)
    try {
      await sendMagicLink(email.trim())
      setState('sent')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setState('idle')
    }
  }

  if (state === 'sent') {
    return (
      <section>
        <h2>Check your email</h2>
        <p>
          We sent a sign-in link to <strong>{email}</strong>. Open it in this browser.
        </p>
      </section>
    )
  }

  return (
    <section>
      <h2>Sign in</h2>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" disabled={state === 'sending'}>
          Send magic link
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  )
}
