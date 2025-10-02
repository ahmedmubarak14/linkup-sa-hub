## LinkUp – Comprehensive Feature & Status Inventory (MVP Tracker)

Last updated: 2025-10-02

This document summarizes the current app architecture, features, pages, key functions, database schema, and development status. Use it to prioritize work toward a fully functional MVP.

---

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix primitives)
- i18n: react-i18next with EN/AR and RTL support
- State/Data: TanStack Query (react-query)
- Backend: Supabase (PostgreSQL, Auth, RLS)

Environment variables (Vite):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Scripts (package.json): `dev`, `build`, `build:dev`, `preview`, `lint`

---

## Routing & Pages

Router: `react-router-dom` with a dual-layout approach in `src/App.tsx`.

Routes and status:
- `/` → `src/pages/Index.tsx` — Status: ✅ Fully Implemented (marketing/landing)
- `/auth` → `src/pages/Auth.tsx` — Status: ✅ Fully Implemented (email/password)
- `/dashboard` → `src/pages/Dashboard.tsx` — Status: ✅ Fully Implemented
- `/habits` → `src/pages/Habits.tsx` — Status: ⚠️ Partially Implemented
- `/expenses` → `src/pages/Expenses.tsx` — Status: ❌ Placeholder
- `/challenges` → `src/pages/Challenges.tsx` — Status: ❌ Placeholder
- `/profile` → `src/pages/Profile.tsx` — Status: ⚠️ Partially Implemented
- `*` → `src/pages/NotFound.tsx` — Status: ✅ Implemented

Auth Guard pattern used across pages via `supabase.auth.getSession()` and redirects to `/auth` if unauthenticated.

---

## Major Features

### Authentication
- Stage: ✅ Implemented
- Email/password login and signup with `full_name` metadata
- Session persistence and auth state listener
- Redirects for authenticated users
- Missing: password reset, social auth, zod validation, email confirmation toggle

Key files:
- `src/pages/Auth.tsx`
- `src/integrations/supabase/client.ts`

Key functions:
- `handleAuth(e)` in `Auth.tsx`

### Habit Streaks
- Stage: ⚠️ Partially Implemented (~40%)
- Implemented: habit list, creation dialog, emoji selector, UI, loading states
- Missing: check-ins table, check-in logic, streak calculations, edit/delete, schema alignment

Key files:
- `src/pages/Habits.tsx`

Key functions:
- `checkAuth()`
- `fetchHabits()`
- `createHabit()`
- `checkInHabit(habitId)`

Issues:
- Code uses `title`, `icon`, `current_streak`, `best_streak` but DB has `name`, `description`, `streak_count`
- References missing table `habit_check_ins`

### Friend Challenges
- Stage: ❌ Placeholder (~20%)
- DB tables exist; UI not built beyond placeholder

Key files:
- `src/pages/Challenges.tsx`

Key functions:
- `checkAuth()`

### Expense Splitter
- Stage: ❌ Placeholder (~30%)
- DB tables exist; UI not built beyond placeholder

Key files:
- `src/pages/Expenses.tsx`

Key functions:
- `checkAuth()`

### Dashboard
- Stage: ✅ Implemented (~90%)
- Displays stats from Supabase (habits, challenges, expenses)
- Missing realtime subscriptions

Key files:
- `src/pages/Dashboard.tsx`

Key functions:
- `checkAuth()`
- `fetchDashboardData()`

### Profile
- Stage: ⚠️ Partially Implemented (~50%)
- Shows basic user info; logout; language; account type
- Missing `profiles` table and editing UI (avatar, name, preferences)

Key files:
- `src/pages/Profile.tsx`

Key functions:
- `fetchUser()`
- `handleLogout()`
- `formatDate(dateString)`

### Reminders & Notifications (Push + WhatsApp)
- Stage: ❌ Not Implemented (0%)
- To integrate: FCM (or similar), WhatsApp Business API or `wa.me` links, scheduling, preferences, background jobs

---

## Components & Layout

Navigation & Layout:
- `src/components/AppSidebar.tsx` — desktop sidebar with collapse
- `src/components/Navigation.tsx` — mobile bottom nav
- `src/components/LanguageToggle.tsx` — toggles EN/AR and sets `dir`/`lang`

shadcn/ui primitives (implemented):
- `src/components/ui/*` includes: `button`, `card`, `dialog`, `sidebar`, `toast`, `sonner`, `tabs`, `table`, etc.

Utilities & Hooks:
- `src/lib/utils.ts` → `cn(...)`
- `src/hooks/use-mobile.tsx` → `useIsMobile()`
- `src/hooks/use-toast.ts` → toast system helpers

Design System:
- `src/index.css` — HSL color tokens, gradients, shadows, utilities, light/dark
- `tailwind.config.ts`, `postcss.config.js` — Tailwind setup

Status: ✅ Implemented

---

## Internationalization (i18n)

Config: `src/i18n/config.ts`
- Libraries: `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- Languages: English (en), Arabic (ar)
- RTL support via `LanguageToggle` setting `document.documentElement.dir`
- Coverage: navigation, landing, features, pages (habits/expenses/challenges/dashboard), common strings
- Missing: consistent error/validation/toast translations

Status: ✅ Implemented (~95%)

---

## Integrations

Supabase (Lovable Cloud):
- Client: `src/integrations/supabase/client.ts`
- Types (generated): `src/integrations/supabase/types.ts`
- Enabled: Auth, Database with RLS
- Not used yet: Storage, Edge Functions, Realtime subscriptions

Status: ✅ Connected

---

## Database Schema (Supabase)

Source of truth: `supabase/migrations/20251002124302_*.sql` and `src/integrations/supabase/types.ts`

Tables:
- `public.habits` (id, user_id, name, description, streak_count, last_completed_at, created_at, updated_at) — RLS ✅
- `public.expenses` (id, user_id, name, total_amount, created_at, updated_at) — RLS ✅
- `public.expense_members` (id, expense_id, user_id, amount_owed, is_settled, created_at) — RLS ✅
- `public.challenges` (id, creator_id, name, description, start_date, end_date, created_at, updated_at) — RLS ✅
- `public.challenge_participants` (id, challenge_id, user_id, progress, joined_at) — RLS ✅

Triggers/Functions:
- `update_updated_at_column()`; triggers on `habits`, `expenses`, `challenges`

Missing (referenced in code):
- `public.profiles` — used by `Profile.tsx`
- `public.habit_check_ins` — used by `Habits.tsx`

Status: ⚠️ Partially Implemented (schema mismatches with UI expectations)

---

## SEO & Public Assets

- `index.html` meta: title/description/og/twitter cards, Arabic fonts
- `public/` includes `favicon.ico`, `placeholder.svg`, `robots.txt`

Status: ✅ Implemented (basic)

---

## Key Gaps & Blockers

1) Schema mismatches & missing tables (HIGH)
- `Habits.tsx` expects `title`, `icon`, `current_streak`, `best_streak` and `habit_check_ins` table
- `Profile.tsx` expects `profiles` table

2) Core feature UIs missing (MEDIUM)
- Expenses and Challenges are placeholders

3) No realtime subscriptions (MEDIUM)
- Dashboard does not auto-refresh

4) Reminders not integrated (HIGH)
- Push + WhatsApp not started

5) Validation & security (LOW)
- zod validation, error boundaries, CSRF/XSS headers, rate-limiting

---

## Definition of Done (MVP)

Core functionality
- [ ] Habits: create, check-in, streak calculations, edit/delete
- [ ] Challenges: create/join, progress, leaderboard
- [ ] Expenses: groups, add expenses, members, split calculation, settlement
- [ ] Reminders: push + WhatsApp, scheduling, preferences

Data integrity
- [ ] All tables exist and match code expectations (incl. `profiles`, `habit_check_ins`)
- [ ] RLS policies correct; cascade deletes verified; indexes added

User experience
- [ ] Loading states, friendly errors, form validation (zod)
- [ ] Realtime updates for dashboard and relevant lists
- [ ] Full EN/AR coverage; RTL correctness

Auth
- [ ] Signup/login, session persistence, logout
- [ ] Password reset; optional email confirmation toggle
- [ ] Profile editing and persistence

Performance/Security
- [ ] Page load < 3s; no console errors; mobile responsive
- [ ] Secure headers, CSRF/XSS mitigations, CORS

---

## Work Plan (Phased)

Phase 1: Fix data model (High Priority)
1. Create `habit_check_ins` with RLS; adjust `Habits.tsx` to DB schema or migrate columns
2. Create `profiles` with signup trigger; wire `Profile.tsx`
3. Implement check-in logic + streak computation on read or via SQL

Phase 2: Complete core UIs
4. Expenses CRUD flows (groups -> expenses -> members -> settlement)
5. Challenges CRUD flows (create/join -> progress -> leaderboard)

Phase 3: Notifications
6. Push notifications (FCM), permissions, basic scheduling
7. WhatsApp notifications (Business API or `wa.me`), templates

Phase 4: Polish
8. zod validations, realtime subscriptions, error boundaries
9. Profile editing, avatar storage bucket, analytics (optional)

---

## File Map (Selected)

Client
- `src/main.tsx` — app entry
- `src/App.tsx` — routes and layout (sidebar + mobile nav)

Pages
- `src/pages/Index.tsx` — landing (auto-redirect if authenticated)
- `src/pages/Auth.tsx` — login/signup (email/password)
- `src/pages/Dashboard.tsx` — stats and quick actions
- `src/pages/Habits.tsx` — list/create/check-in (partial)
- `src/pages/Expenses.tsx` — placeholder
- `src/pages/Challenges.tsx` — placeholder
- `src/pages/Profile.tsx` — profile (partial)
- `src/pages/NotFound.tsx` — 404

Components
- `src/components/AppSidebar.tsx`
- `src/components/Navigation.tsx`
- `src/components/LanguageToggle.tsx`
- `src/components/ui/*` — shadcn/ui primitives

Integrations
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

i18n
- `src/i18n/config.ts`

Styles
- `src/index.css`, `tailwind.config.ts`

Database
- `supabase/migrations/20251002124302_*.sql`

---

## Current Completion Snapshot

| Feature | Database | Backend Logic | UI/UX | Integration | Overall |
|---|---|---|---|---|---|
| Authentication | ✅ 100% | ✅ 90% | ✅ 100% | ✅ 100% | ✅ 95% |
| Habit Streaks | ⚠️ 70% | ❌ 20% | ✅ 80% | ❌ 0% | ⚠️ 40% |
| Challenges | ✅ 100% | ❌ 0% | ❌ 10% | ❌ 0% | ❌ 20% |
| Expense Splitter | ✅ 100% | ❌ 0% | ❌ 10% | ❌ 0% | ❌ 30% |
| Reminders | ❌ 0% | ❌ 0% | ❌ 0% | ❌ 0% | ❌ 0% |
| Dashboard | ✅ 100% | ✅ 80% | ✅ 100% | ✅ 80% | ✅ 90% |
| Profile | ❌ 0% | ⚠️ 50% | ✅ 90% | ⚠️ 50% | ⚠️ 50% |
| i18n | N/A | N/A | ✅ 95% | ✅ 100% | ✅ 95% |
| Design System | N/A | N/A | ✅ 100% | ✅ 100% | ✅ 100% |

Estimated overall progress: ~45%

---

## Notes

- See `PROJECT_STATUS.md` for additional narrative details; this document is structured for ongoing tracking and prioritization.

