// Writes .env.local from the running local Supabase stack (`pnpm exec supabase start` first).
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const status = JSON.parse(
  execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
)

writeFileSync(
  '.env.local',
  `VITE_SUPABASE_URL=${status.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}\n`,
)
console.log('Wrote .env.local')
