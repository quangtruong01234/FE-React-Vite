import { useState } from 'react';
import { api } from '../services/api.js';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  });

  function loginSuccess(user) {
    setCurrentUser({ id: user.id, username: user.username, email: user.email });
  }

  function handleUnauthorized() {
    localStorage.removeItem('user');
    setCurrentUser(null);
  }

  async function logout() {
    try {
      await api.auth.logout();
    } catch {
      // Always clear client state even if the server request fails
    } finally {
      localStorage.removeItem('user');
      setCurrentUser(null);
    }
  }

  return { currentUser, loginSuccess, handleUnauthorized, logout };
}
