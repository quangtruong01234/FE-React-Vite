// Test accounts — mirror of ../.agent-local/test-accounts.md.
// Kept here (not imported from outside the repo) so the suite is self-contained.
export const ACCOUNTS = {
  buyer: { username: 'canceltest1779978329', password: 'Test@1234', userId: 17, role: 'user' },
  shop: { username: 'techstore_demo', password: 'Shop@1234', userId: 23, role: 'shop' },
} as const;

export type Account = (typeof ACCOUNTS)[keyof typeof ACCOUNTS];
