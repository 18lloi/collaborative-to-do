import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

interface LocalStatus {
  API_URL: string
  PUBLISHABLE_KEY: string
  SECRET_KEY: string
  MAILPIT_URL: string
}

let cached: LocalStatus | undefined

/** Connection details of the running local stack (`supabase start`). */
export function localSupabase(): LocalStatus {
  cached ??= JSON.parse(
    execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  ) as LocalStatus
  return cached
}

/** Polls Mailpit for the sign-in email sent to `email` and returns the magic link. */
export async function latestMagicLink(email: string): Promise<string> {
  const { MAILPIT_URL } = localSupabase()
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )
    const { messages } = (await search.json()) as { messages: { ID: string }[] }
    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`)
      const { Text } = (await message.json()) as { Text: string }
      const link = Text.match(/https?:\/\/\S+\/auth\/v1\/verify\S*/)?.[0]
      if (link) return link.replace(/[)>\]]+$/, '')
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`No magic-link email arrived for ${email}`)
}

/** Approves a user the way a site admin would, using the service-role key (test only). */
export async function approveUser(email: string): Promise<void> {
  const { API_URL, SECRET_KEY } = localSupabase()
  const admin = createClient(API_URL, SECRET_KEY)
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const user = data.users.find((u) => u.email === email)
  if (!user) throw new Error(`No user ${email}`)
  const { error: updateError } = await admin
    .from('profiles')
    .update({ approval_status: 'approved' })
    .eq('id', user.id)
  if (updateError) throw updateError
}
