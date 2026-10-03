# Collaborative To-Do — Project Plan

Status: **Planning** · Last updated: 2026-10-03

A whiteboard-style to-do app. A central task list sits in the middle of the board, with a "landing pad" for each person around it, so everyone can see the full backlog *and* what each person is working on at the same time. Works for teams and for individuals. Web first, mobile later.

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript (everywhere) | Shared types between web, DB and future mobile |
| Frontend | React + Vite | SPA; no SSR needed |
| Server state | TanStack Query | Caching, optimistic updates, invalidation on realtime events |
| Drag & drop | dnd-kit | Multi-container drag (center list ↔ pads), keyboard accessible |
| Backend | Supabase | Postgres, Auth, Realtime, Row Level Security |
| Ordering | Fractional indexing | String position keys; concurrent reorders don't collide |
| Unit tests | Vitest | Sort logic, ordering keys, utilities |
| DB tests | pgTAP (`supabase test db`) | Verify RLS policies (approval gate, guest read-only) |
| E2E tests | Playwright | Includes two-browser-context realtime tests |
| Package manager | pnpm | |
| CI | GitHub Actions | Lint, typecheck, unit, DB, E2E |
| Hosting (v1) | Vercel or Netlify (frontend) + Supabase free tier | |
| Mobile (later) | React Native + Expo | Reuse types and data layer |

**Dev environment:** WSL2 (Ubuntu). Repo lives on the Linux filesystem (`~/Projects/collaborative-to-do`). Local Supabase uses the Supabase CLI and needs Docker (Docker Desktop with WSL integration, or Docker Engine installed in WSL).

**Portability (for self-hosting later):**
- All data access goes through one module (`src/data/`), not scattered Supabase calls.
- Schema changes are plain SQL migrations in git (`supabase/migrations/`).
- Limit Supabase-only features to Auth, Realtime and RLS. The frontend is a static build that can be served from anywhere.

---

## 2. Core concepts

### Spaces
- **Workspace:** a shared space for a team (up to 8 people with pads). It contains collaborative lists and ranked lists.
- **Personal space:** every user has one. It holds their **solo lists** (see open question Q2 about ranked lists).

### List types
1. **Collaborative list:** the whiteboard board.
   - The center column has an **Unassigned** section and an **Assigned** section, separated by a divider.
   - Members' pads are arranged around the center. Max 8 pads.
   - Dragging a task onto a pad assigns it to that person. It leaves Unassigned, shows on their pad, and moves into the Assigned section.
   - A task can have **multiple assignees**. Anyone can assign to anyone, and **assigned by** is recorded and shown.
   - Dragging a task off a pad back to the center unassigns that person. A task with no assignees left goes back to Unassigned.
   - When a member leaves the workspace, their assignments are removed. Tasks left with no assignees go back to Unassigned.
   - All collaborative lists in a workspace share **one board**. A **list switcher** changes which list is in the center, and a **slide-out panel** shows all lists.
2. **Ranked list:** a simple ordered list with no pads. It covers movies, restaurants, purchases, and anything else like that. Nothing is hardcoded per category.
3. **Solo list:** lives in the personal space and has **Now / Next / Later** boxes around the center list.

### Shared by every list type
- **Urgency:** Low / Medium / High / Urgent. This also covers vague timing like "soon-ish".
- **Due date:** optional, a single date (no ranges).
- **Sort mode toggle** (per list, shared by everyone viewing it):
  - **Manual:** the saved display order, which users can drag to reorder.
  - **Smart sort:** due date (earliest first, no date last), then urgency (highest first), then created time (newest first).
  - Dragging to reorder is **disabled** in Smart sort, with a tooltip or inline hint explaining why and offering a switch to Manual. Dragging *onto pads* still works in Smart sort.
- **Done area:** completed items move here and record who completed them and when. They can be restored.

---

## 3. Auth, access & roles

### Sign-in
- Email (magic link and/or password) and Google OAuth through Supabase Auth.
- **Guest access without an account:** an invite link with a random token, plus an optional password, an expiry date, and the ability to revoke it. The guest gets a Supabase anonymous session.

### Keeping it private: the approval gate
- Every new user, including guests, starts as **`pending`**.
- The site owner approves or rejects them from an **admin approval screen**.
- An invite link can be marked **pre-approved**, which skips the queue.
- This is enforced in Postgres **RLS**, not just the UI: a pending or rejected user can read nothing.
- CAPTCHA (Cloudflare Turnstile) on sign-up, plus Supabase rate limits.
- The first owner/site admin is set up through a seed script or environment variable.

### Roles (per workspace)
| Role | Can |
|---|---|
| Owner | Everything, including deleting the workspace and transferring ownership |
| Admin | Manage members and invites; everything a member can do |
| Member | Create/edit/assign/complete items; has a pad |
| Guest | **View only**; no pad |

---

## 4. Data model (draft)

- `profiles`: id (= auth user), display_name, avatar_url, approval_status (`pending`|`approved`|`rejected`), is_site_admin, created_at
- `workspaces`: id, name, owner_id, created_at
- `workspace_members`: workspace_id, user_id, role, pad_slot (0–7, null for guests), joined_at
- `lists`: id, workspace_id (null for personal), owner_user_id (personal lists only), type (`collaborative`|`ranked`|`solo`), name, sort_mode (`manual`|`smart`), position, archived_at, created_at
- `items`: id, list_id, title, notes, urgency (`low`|`medium`|`high`|`urgent`), due_date (date, nullable), position (fractional index key), solo_bucket (`now`|`next`|`later`|null), status (`open`|`done`), completed_at, completed_by, created_by, created_at, updated_at
- `item_assignees`: item_id, user_id, assigned_by, assigned_at (primary key: item_id + user_id)
- `invite_links`: id, workspace_id, token_hash, password_hash (nullable), role, pre_approved, expires_at, revoked_at, created_by, created_at

Derived:
- **Assigned section** = open items with at least one assignee. **Unassigned** = open items with none.
- **Pad contents** = open items where the person is an assignee.

Constraints:
- At most 8 members with a pad per workspace, enforced in the DB.
- Guests cannot write to anything, enforced by RLS.

---

## 5. Realtime

- Subscribe to Supabase Realtime `postgres_changes` on `items` and `item_assignees` for the active list.
- On each event, update or invalidate the TanStack Query cache.
- Drag actions are optimistic: the UI updates immediately and rolls back on error.
- Live sync of moves only. No live cursors in v1.

---

## 6. V1 milestones

1. **M0, Project setup:** Vite + React + TS, pnpm, ESLint/Prettier, Vitest, Playwright, local Supabase, GitHub Actions CI.
2. **M1, Auth & approval:** email + Google sign-in, profiles, pending/approved gate (RLS), admin approval screen, CAPTCHA.
3. **M2, Workspaces & members:** create workspace, roles, invite links (incl. guest/password/expiry/revoke), 8-pad limit.
4. **M3, Ranked lists:** create/edit/delete items, urgency, due date, Manual vs. Smart sort toggle, drag reorder, Done area. This builds the shared list basics first.
5. **M4, Collaborative board:** center list with Unassigned/Assigned divider, pads around it, drag-to-assign, multiple assignees, assigned-by, unassign, list switcher and all-lists slide-out panel.
6. **M5, Realtime:** live sync across clients, optimistic drag.
7. **M6, Personal space:** solo lists with Now / Next / Later.
8. **M7, Deploy:** frontend on Vercel/Netlify, hosted Supabase project, production OAuth redirect URLs.

Testing throughout:
- Unit tests for the smart-sort comparator and ordering keys.
- pgTAP tests for every RLS rule.
- Playwright E2E for each milestone, including a two-user realtime drag test.

---

## 7. Backlog / roadmap (not v1)

- **Standup mode:** highlight one person's pad at a time, going around the circle so each person walks through their tasks. Optional timer.
- **Mobile apps:** React Native + Expo.
- **Done retention policy:** automatically purge Done items after a configurable period.
- **Boards with more than 8 people:** explore layouts and team-size issues.
- **Live cursors / presence.**
- **Offline view-only mode.**
- **Self-hosting:** self-hosted Supabase (Docker Compose) or plain Postgres; covers backups, TLS, SMTP and OAuth setup.
- **Guest edit permissions:** guests are view only for now.

---

## 8. Open questions

- **Q1:** Do pads show a person's assignments for the *currently selected* collaborative list only, or across all collaborative lists in the workspace?
- **Q2:** Can the personal space also hold ranked lists (e.g. a private "Movies to watch"), or only solo lists?
- **Q3:** Within a pad, what order are tasks shown in: the list's order, or a per-person order?
- **Q4:** Can a user belong to multiple workspaces? (Assumed yes.)
- **Q5:** Do the Now / Next / Later boxes in solo lists have their own done handling, or share the list's Done area?
