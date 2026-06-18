# Auth Flow

## How it works

- **Cookie-based JWT** — `credentials: 'include'` on every request, set globally in `request()` (`api/index.ts`). Never add it per-call.
- **Current implementation:** user object (`{ id, username, email }`) stored in `localStorage` under key `user`. This is **temporary** until the backend adds `GET /user/me`. See `useAuth.ts` TODO.
- Never store the raw JWT token in localStorage.

## Consuming auth state

```ts
// context/AuthContext.tsx exposes:
const { currentUser, loginSuccess, logout } = useAuthContext();
```

- Auth state consumed via `useAuthContext()` only — **never** call `localStorage.getItem('user')` in components.
- `AuthContext` wraps the `useAuth` hook; `useAuthContext()` is the public accessor.

## Login flow

1. `LoginPage` calls `useLogin` mutation → `api.auth.login(credentials)`
2. On success → `loginSuccess(user)` updates context + writes localStorage
3. Navigate to `/` via `useNavigate`

## Logout flow

`logout()`:
1. Calls `api.auth.logout()`
2. Clears localStorage `user`
3. Invalidates `['auth']` queries

## 401 handling

- On 401 → redirect to `/login` (NOT `/auth/login`)
- Use `useNavigate` — never `window.location`
- `RequireAuth` guard already redirects when `currentUser` is null

## Rules recap

- ✅ `useAuthContext()` for auth state
- ✅ `credentials: 'include'` is global — don't repeat per-call
- ❌ No raw JWT in localStorage / sessionStorage / Authorization header
- ❌ No `localStorage.getItem('user')` in components
- ❌ 401 must not go to `/auth/login` — it's `/login`

---

## FOLLOW-UP: Remove localStorage user cache

**Status:** Backend `GET /user/me` has shipped (see `.ai/context/backend-api.md` §Auth & User). The `localStorage` user cache in `src/hooks/useAuth.ts` is a stale workaround that should be replaced.

**What the migration requires:**

1. Add `api.auth.getMe` to `src/api/index.ts`:
   ```ts
   auth: {
     // ...existing methods...
     getMe: (): Promise<User> => request<User>('/user/me'),
   }
   ```
2. Replace `useAuth.ts` state + `loadUser()` with a `useQuery`:
   ```ts
   const { data: currentUser } = useQuery({
     queryKey: queryKeys.auth.me,
     queryFn: () => api.auth.getMe(),
     retry: false,
   });
   ```
   (`queryKeys.auth.me` already exists in `src/hooks/queryKeys.ts`.)
3. Remove `loadUser()`, all `localStorage.setItem/removeItem('user')` calls, and the `useState<User | null>` from `useAuth.ts`.
4. On logout `onSettled`: `queryClient.removeQueries({ queryKey: queryKeys.auth.me })` replaces `localStorage.removeItem('user')`.
5. On 401 `handleUnauthorized`: `queryClient.removeQueries({ queryKey: queryKeys.auth.me })`.

**Note:** Do not mix this migration with other changes — it affects auth state across the whole app.
