import { describe, it, expect } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { replaceSessionCache } from './sessionCache';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { User } from '@/types';

const oldUser: User = {
  id: 'usr_0000000000000001',
  username: 'old',
  email: 'old@test.com',
  role: { id: 3, name: 'user' },
  isActive: true,
};

const newUser: User = { ...oldUser, id: 'usr_0000000000000002', username: 'new', email: 'new@test.com' };

function seededClient(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.auth.me, oldUser);
  queryClient.setQueryData(queryKeys.cart.all, { items: ['from the old session'] });
  return queryClient;
}

describe('replaceSessionCache', () => {
  it('notifies an observer that was attached before the swap (AUTH-STALE-01)', () => {
    const queryClient = seededClient();
    const observer = new QueryObserver<User | null>(queryClient, {
      queryKey: queryKeys.auth.me,
      enabled: false,
    });
    const seen: Array<User | null | undefined> = [];
    const unsubscribe = observer.subscribe((result) => seen.push(result.data));

    replaceSessionCache(queryClient, newUser);

    // clear() + setQueryData left this observer on the removed entry: it never
    // heard about newUser, which is how AuthProvider kept `currentUser === null`.
    expect(seen[seen.length - 1]).toEqual(newUser);
    expect(observer.getCurrentResult().data).toEqual(newUser);
    unsubscribe();
  });

  it('signs out in place: the same observer reads null', () => {
    const queryClient = seededClient();
    const observer = new QueryObserver<User | null>(queryClient, {
      queryKey: queryKeys.auth.me,
      enabled: false,
    });
    const unsubscribe = observer.subscribe(() => {});

    replaceSessionCache(queryClient, null);

    expect(observer.getCurrentResult().data).toBeNull();
    unsubscribe();
  });

  it('drops every other cached read of the previous session', () => {
    const queryClient = seededClient();

    replaceSessionCache(queryClient, newUser);

    expect(queryClient.getQueryData(queryKeys.cart.all)).toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
  });

  it('drops cached mutations, as clear() did', () => {
    const queryClient = seededClient();
    queryClient.getMutationCache().build(queryClient, { mutationFn: () => Promise.resolve() });

    replaceSessionCache(queryClient, newUser);

    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });
});
