# Collaborative To-Do

Whiteboard-style collaborative to-do app. **Read `docs/PLAN.md` first.** It is the source of truth for scope, data model, roles and milestones.

## Current phase
Planning is done. Next step: M0 (project setup). No application code exists yet.

## Stack
TypeScript, React + Vite, TanStack Query, dnd-kit, Supabase (Postgres, Auth, Realtime, RLS), Vitest, pgTAP, Playwright, pnpm, GitHub Actions.

## Working agreements
- Development happens in WSL2 (Ubuntu).
- The owner knows Node/Express, Angular and some Postgres, and is learning React, Supabase and Playwright. Explain React/Supabase/Playwright concepts as they come up, comparing them to Angular where that helps.
- Keep all Supabase calls inside `src/data/` so the app stays portable for self-hosting later.
- Every schema change is a SQL migration in `supabase/migrations/`. Every RLS rule gets a pgTAP test.
- Enforce access rules (approval gate, guest view-only) in the database, not only in the UI.
- Update `docs/PLAN.md` when decisions change.
