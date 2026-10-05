import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, expect, test, vi } from 'vitest'
import { ApprovalPage } from './ApprovalPage'
import { listUsersForAdmin, setApprovalStatus, type AdminUser } from '../data/admin'

vi.mock('../data/admin', () => ({ listUsersForAdmin: vi.fn(), setApprovalStatus: vi.fn() }))

const user = (overrides: Partial<AdminUser>): AdminUser => ({
  id: 'u',
  email: 'u@example.com',
  displayName: 'U',
  approvalStatus: 'pending',
  isSiteAdmin: false,
  createdAt: '2026-10-05T00:00:00Z',
  ...overrides,
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ApprovalPage currentUserId="me" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(listUsersForAdmin).mockResolvedValue([
    user({ id: 'me', email: 'me@example.com', approvalStatus: 'approved', isSiteAdmin: true }),
    user({ id: 'a', email: 'pending@example.com' }),
    user({ id: 'b', email: 'rejected@example.com', approvalStatus: 'rejected' }),
  ])
  vi.mocked(setApprovalStatus).mockResolvedValue()
})

test('shows pending users first, with counts on the tabs', async () => {
  renderPage()
  expect(await screen.findByText('pending@example.com')).toBeInTheDocument()
  expect(screen.queryByText('rejected@example.com')).not.toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'pending (1)' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'rejected (1)' })).toBeInTheDocument()
})

test('approving a user calls the data layer', async () => {
  renderPage()
  await userEvent.click(await screen.findByRole('button', { name: 'Approve' }))
  await waitFor(() => expect(setApprovalStatus).toHaveBeenCalledWith('a', 'approved'))
})

test('an admin cannot act on their own row', async () => {
  renderPage()
  await userEvent.click(await screen.findByRole('tab', { name: 'approved (1)' }))
  expect(await screen.findByText('me@example.com')).toBeInTheDocument()
  expect(screen.getByText('you')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
})

test('rejected users can be approved again', async () => {
  renderPage()
  await userEvent.click(await screen.findByRole('tab', { name: 'rejected (1)' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Approve' }))
  await waitFor(() => expect(setApprovalStatus).toHaveBeenCalledWith('b', 'approved'))
})
