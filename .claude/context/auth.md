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
