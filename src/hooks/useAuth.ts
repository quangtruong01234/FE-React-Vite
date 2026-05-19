import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import type { User } from '@/types';

// TODO: migrate to useQuery('/user/me') once backend adds GET /user/me endpoint

interface AuthState {
  currentUser: User | null;
  loginSuccess: (user: User) => void;
  handleUnauthorized: () => void;
  logout: () => void;
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [currentUser, setCurrentUser] = useState<User | null>(loadUser);
  const queryClient = useQueryClient();

  const { mutate: logoutMutate } = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      localStorage.removeItem('user');
      setCurrentUser(null);
      void queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  function loginSuccess(user: User): void {
    const safe: User = { id: user.id, username: user.username, email: user.email };
    localStorage.setItem('user', JSON.stringify(safe));
    setCurrentUser(safe);
  }

  function handleUnauthorized(): void {
    localStorage.removeItem('user');
    setCurrentUser(null);
  }

  function logout(): void {
    logoutMutate();
  }

  return { currentUser, loginSuccess, handleUnauthorized, logout };
}
