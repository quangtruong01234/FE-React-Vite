import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import type { LoginDto, User } from '@/types';
import type { MessageKey } from '@/lib/i18n/messages';
import type { authMessages } from './auth.i18n';

type AuthKey = MessageKey<typeof authMessages>;

interface LoginForm {
  username: string;
  password: string;
}

interface UseLoginReturn {
  form: LoginForm;
  /** `authMessages` keys — the page translates them. */
  errors: Partial<Record<keyof LoginForm, AuthKey>>;
  isPending: boolean;
  /** The server's own message (shown as-is), or the `connectionError` key when there is none. */
  apiError: string;
  showPassword: boolean;
  rememberMe: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  togglePassword: () => void;
  toggleRememberMe: () => void;
}

export function useLogin(onLoginSuccess: (user: User) => void): UseLoginReturn {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginForm, AuthKey>>>({});
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { mutateAsync: loginMutate, isPending } = useMutation({
    mutationFn: (data: LoginDto) => api.auth.login(data),
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'connectionError';
      setApiError(msg);
    },
  });

  function validate(): Partial<Record<keyof LoginForm, AuthKey>> {
    const errs: Partial<Record<keyof LoginForm, AuthKey>> = {};
    if (!form.username.trim()) errs.username = 'loginUsernameRequired';
    if (!form.password) errs.password = 'loginPasswordRequired';
    return errs;
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginForm]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (apiError) setApiError('');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setApiError('');
    try {
      // Unchecked → omit rememberMe entirely (backend default = 5h session)
      const user = await loginMutate({
        username: form.username,
        password: form.password,
        ...(rememberMe ? { rememberMe: true } : {}),
      });
      onLoginSuccess(user);
    } catch {
      // error handled in onError
    }
  }

  function togglePassword(): void {
    setShowPassword((v) => !v);
  }

  function toggleRememberMe(): void {
    setRememberMe((v) => !v);
  }

  return { form, errors, isPending, apiError, showPassword, rememberMe, handleChange, handleSubmit, togglePassword, toggleRememberMe };
}
