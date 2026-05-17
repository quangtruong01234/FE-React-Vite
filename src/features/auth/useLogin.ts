import { useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '@/api';
import type { User } from '@/types';

interface LoginForm {
  username: string;
  password: string;
}

interface UseLoginReturn {
  form: LoginForm;
  errors: Partial<LoginForm>;
  loading: boolean;
  apiError: string;
  showPassword: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  togglePassword: () => void;
}

export function useLogin(onLoginSuccess: (user: User) => void): UseLoginReturn {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' });
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function validate(): Partial<LoginForm> {
    const errs: Partial<LoginForm> = {};
    if (!form.username.trim()) errs.username = 'Vui lòng nhập tên đăng nhập';
    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu';
    return errs;
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginForm]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setApiError('');
    try {
      const data = await api.auth.login({ username: form.username, password: form.password });
      const user = (data as { data?: User } & User).data ?? data;
      onLoginSuccess(user);
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  function togglePassword(): void {
    setShowPassword((v) => !v);
  }

  return { form, errors, loading, apiError, showPassword, handleChange, handleSubmit, togglePassword };
}
