import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import App from './App'
import { AuthContext, type AuthState } from './auth/AuthContext'
import type { Profile } from './data/auth'

// The data layer talks to Supabase; stub it so App can render without a backend.
vi.mock('./data/auth', () => ({ sendMagicLink: vi.fn(), signOut: vi.fn() }))

function renderWith(state: AuthState) {
  return render(
    <AuthContext.Provider value={state}>
      <App />
    </AuthContext.Provider>,
  )
}

function ready(overrides: Partial<Profile>): AuthState {
  return {
    status: 'ready',
    session: { user: { id: 'u1' } } as never,
    profile: {
      id: 'u1',
      displayName: 'Ada',
      avatarUrl: null,
      approvalStatus: 'approved',
      isSiteAdmin: false,
      ...overrides,
    },
  }
}

describe('App gating', () => {
  test('always shows the app heading', () => {
    renderWith({ status: 'loading' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Collaborative To-Do')
  })

  test('signed-out users see the sign-in form', () => {
    renderWith({ status: 'signed-out' })
    expect(screen.getByRole('button', { name: 'Send magic link' })).toBeInTheDocument()
  })

  test('pending users see the waiting screen', () => {
    renderWith(ready({ approvalStatus: 'pending' }))
    expect(screen.getByRole('heading', { name: 'Waiting for approval' })).toBeInTheDocument()
  })

  test('rejected users see the denied screen', () => {
    renderWith(ready({ approvalStatus: 'rejected' }))
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
  })

  test('approved users get in, and admins are labelled', () => {
    renderWith(ready({ isSiteAdmin: true }))
    expect(screen.getByRole('heading', { name: 'Welcome, Ada' })).toBeInTheDocument()
    expect(screen.getByText('You are a site admin.')).toBeInTheDocument()
  })
})
