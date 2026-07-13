# Runtime module Admin frontend report

## Implemented

- Verified the dedicated frontend worktree, GitHub remote, branch tracking,
  worktree inventory, package scripts, lockfile, and clean baseline gates.
- Added Vitest, jsdom, React Testing Library, jest-dom, and user-event while
  retaining the pre-existing Node delivery test in the aggregate `npm test`.
- Moved the Admin route entry to `src/pages/admin/AdminPage.tsx` and added a
  Runtime Modules tab visible only to administrators at level 2 or above.
- Added direct same-origin list/events/PATCH/step-up calls with tri-state desired
  mode, separate resolved/actual state, optimistic revision, reason, dependency
  preview, default-off cascade with a second confirmation, 202 pending wording,
  409 authoritative refresh, MFA step-up without automatic PATCH replay,
  bounded visibility-aware polling, drain/failure details, and audit display.
- Runtime/auth/operational state remains React memory only; no browser storage
  API was added.
- Split users, clients, access requests, and grants into real panels. Each panel
  owns its loading, filters, pagination, mutations, feedback, and rendering and
  calls `apiFetch` directly. `AdminPage.tsx` is now a 52-line permission/tab
  shell instead of a 2,500-line state container.

## TDD evidence

- RED: the first component test failed because `RuntimeModulesPanel` did not
  exist; GREEN verifies the exact PATCH payload and pending-only 202 wording.
- RED: cascade and MFA tests failed for missing second confirmation and step-up
  UI; GREEN verifies both and proves PATCH is not replayed after MFA.
- RED: `AdminPage` import failed before the route move; GREEN verifies level-1
  hiding and level-2 visibility.

## Commits and verification

- `dc52bc5` — `feat: add runtime module admin controls`.
- `c0cbb1a` — `fix: bound runtime module polling`.
- `695e6d6` — `refactor: split users and grants admin panels`.
- `bfaa2d6` — `refactor: split client and access request panels`.
- `npm test`, focused unit tests, ESLint, TypeScript, and Vite build passed.

## Legacy behavior coverage

RTL interaction tests cover user activation PATCH, grant revocation plus page
refresh, normalized client creation, and access-request rejection. Existing API
paths and mutation payloads remain colocated with their owning panels.
