# Auth Flow

## How it works

- **Cookie-based JWT** — `credentials: 'include'` on every request, set globally in `request()` (`src/api/client.ts`). Never add it per-call.
- **Current implementation:** auth state comes from `GET /user/me` via `useQuery` in `src/hooks/auth/useAuth.ts` (`api.auth.me`, key `queryKeys.auth.me`, `skipUnauthorizedRedirect` so a logged-out visit doesn't bounce). No user object in localStorage.
- Never store the raw JWT token (or the user object) in localStorage.

## Consuming auth state

```ts
// context/AuthContext.tsx exposes:
const { currentUser, loginSuccess, logout } = useAuthContext();
```

- Auth state consumed via `useAuthContext()` only — **never** call `localStorage.getItem('user')` in components.
- `AuthContext` wraps the `useAuth` hook; `useAuthContext()` is the public accessor.

## Login flow

1. `LoginPage` calls `useLogin` mutation → `api.auth.login(credentials)`
2. On success → `loginSuccess(user)`: `queryClient.clear()` + seeds `queryKeys.auth.me` cache + broadcasts a `login` event on `authChannel` (cross-tab sync)
3. Navigate to `/` via `useNavigate`

## Logout flow

`logout()` (mutation on `api.auth.logout()`), `onSettled`:
1. `queryClient.clear()` — wipes all cached data
2. Broadcasts `logout` on `authChannel` — other tabs `resetQueries()`, their `auth.me` refetch 401s and `ProtectedRoute` redirects

## 401 handling

- On 401 → redirect to `/login` (NOT `/auth/login`)
- Use `useNavigate` — never `window.location`
- `RequireAuth` guard already redirects when `currentUser` is null

## Rules recap

- ✅ `useAuthContext()` for auth state
- ✅ `credentials: 'include'` is global — don't repeat per-call
- ❌ No raw JWT in localStorage / sessionStorage / Authorization header
- ❌ No user object in localStorage — auth state lives in the `auth.me` query cache only
- ❌ 401 must not go to `/auth/login` — it's `/login`
