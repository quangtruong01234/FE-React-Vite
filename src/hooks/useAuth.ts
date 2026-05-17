import { useState } from 'react';
import { api } from '@/api';
import type { User } from '@/types';

// TODO: migrate to useQuery('/user/me') once backend adds GET /user/me endpoint

interface AuthState {
  currentUser: User | null;
  loginSuccess: (user: User) => void;
  handleUnauthorized: () => void;
  logout: () => Promise<void>;
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

  function loginSuccess(user: User): void {
    const safe: User = { id: user.id, username: user.username, email: user.email };
    localStorage.setItem('user', JSON.stringify(safe));
    setCurrentUser(safe);
  }

  function handleUnauthorized(): void {
    localStorage.removeItem('user');
    setCurrentUser(null);
  }

  async function logout(): Promise<void> {
    try {
      await api.auth.logout();
    } catch {
      // always clear client state even if server request fails
    } finally {
      localStorage.removeItem('user');
      setCurrentUser(null);
    }
  }

  return { currentUser, loginSuccess, handleUnauthorized, logout };
}
