import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Run `pnpm env:local`.',
  )
}

// The only place a Supabase client is created. Everything else goes through src/data/*.
export const supabase = createClient(url, key, { auth: { flowType: 'pkce' } })
