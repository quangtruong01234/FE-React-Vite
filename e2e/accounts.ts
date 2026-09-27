// Test accounts — mirror of ../.agent-local/test-accounts.md.
// Kept here (not imported from outside the repo) so the suite is self-contained.
//
// No `userId`: the numeric ids in test-accounts.md no longer work against the
// id-scoped endpoints (public ids are `usr_…`). Resolve the id at run time with
// `currentUserId()` from ./api.
export const ACCOUNTS = {
  buyer: { username: 'canceltest1779978329', password: 'Test@1234', role: 'user' },
  shop: { username: 'techstore_demo', password: 'Shop@1234', role: 'shop' },
} as const;

export interface Account {
  username: string;
  password: string;
}

// Admin credentials are NOT committed: this file is tracked, and an admin login
// is worth far more than a buyer one if the same account exists on prod. They
// come from `e2e/.env.local` (gitignored, loaded by playwright.config.ts) — copy
// `e2e/.env.example` and fill it from test-accounts.md. Unset ⇒ `null`, and the
// config drops the admin project instead of failing the run.
export const ADMIN_ACCOUNT: Account | null =
  process.env.E2E_ADMIN_USERNAME && process.env.E2E_ADMIN_PASSWORD
    ? { username: process.env.E2E_ADMIN_USERNAME, password: process.env.E2E_ADMIN_PASSWORD }
    : null;
