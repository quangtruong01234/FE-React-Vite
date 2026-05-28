# /scaffold-feature — Bootstrap a Feature Folder

Create a new feature folder following TryBuy conventions:
`features/<name>/` with page + hook + (optional) modal/form, all properly typed.

## How to invoke

```
/scaffold-feature <feature-name> [--with-create] [--with-detail]
```

Examples:
- `/scaffold-feature wishlist` → page + hook
- `/scaffold-feature review --with-create` → page + hook + create modal
- `/scaffold-feature inventory --with-detail` → list page + detail page + hooks

---

## Protocol

### Step 1 — Pre-checks

1. Verify `frontend/src/features/<name>/` does NOT already exist. If it does → stop, report.
2. Run `/audit-duplicates <name>` to check no existing hook/component has the same purpose.
3. Confirm the feature name is kebab-case singular (e.g. `wishlist`, not `Wishlists`).

### Step 2 — Generate files

For feature `<name>`:

**`features/<name>/<Name>ListPage.tsx`**
```tsx
import { use<Name>s } from './use<Name>';
import { Skeleton } from '@/components/ui/skeleton';

export function <Name>ListPage() {
  const { data, isLoading, error } = use<Name>s();

  if (isLoading) return <Skeleton className="h-32 w-full rounded-tb-card" />;
  if (error) return <div className="text-tb-red">Failed to load.</div>;
  if (!data?.length) return <div className="text-tb-muted">Nothing here yet.</div>;

  return (
    <div className="flex flex-col gap-4 bg-tb-base p-6">
      <h1 className="font-display text-2xl text-tb-secondary">{/* TODO: title */}</h1>
      {/* TODO: render data */}
    </div>
  );
}
```

**`features/<name>/use<Name>.ts`**
```ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';

export function use<Name>s() {
  return useQuery({
    queryKey: queryKeys.<name>s.all,
    queryFn: () => api.<name>s.getList(),
  });
}
```

### Step 3 — Wire it up

1. Add the route to `router.tsx` (inside `RequireAuth` children):
   ```tsx
   { path: '<name>', element: <<Name>ListPage /> },
   ```
2. Add query keys to `hooks/queryKeys.ts`:
   ```ts
   <name>s: {
     all: ['<name>s'] as const,
     detail: (id: number) => ['<name>s', id] as const,
   },
   ```
3. Add API namespace stub to `api/index.ts`:
   ```ts
   <name>s: {
     getList: () => request<<Name>[]>('/<name>s'),
     getById: (id: number) => request<<Name>>(`/<name>s/${id}`),
   },
   ```
4. Add type stub to `types/index.ts`:
   ```ts
   export interface <Name> {
     id: number;
     // TODO: fields
   }
   ```

### Step 4 — Optional flags

If `--with-create` was passed:
- Generate `Create<Name>Modal.tsx` using `<Dialog>` from `@/components/ui/dialog`
- Generate `useCreate<Name>` mutation in the same hook file
- Mutation invalidates `queryKeys.<name>s.all` on success

If `--with-detail` was passed:
- Generate `<Name>Detail.tsx` page consuming `useParams` + `Number(id)` + `enabled` guard
- Add `{ path: '<name>/:id', element: <<Name>Detail /> }` to router
- Generate `use<Name>` (singular) hook in the same hook file

### Step 5 — Verification

Run `npm run build` to confirm everything compiles. If errors → run `/fix-typescript`.

---

## TODO Markers

All generated files contain `// TODO:` comments where the developer must fill in:
- Page title and content rendering
- Type fields beyond `id`
- API path if it differs from the convention

Do NOT mark this command as done if any `// TODO:` is unresolved — these are placeholders, not real code.

---

**Model:** Sonnet | **Effort:** Medium
