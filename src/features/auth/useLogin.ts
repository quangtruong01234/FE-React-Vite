import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import type { User } from '@/types';

interface LoginForm {
  username: string;
  password: string;
}

interface UseLoginReturn {
  form: LoginForm;
  errors: Partial<LoginForm>;
  isPending: boolean;
  apiError: string;
  showPassword: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  togglePassword: () => void;
}

export function useLogin(onLoginSuccess: (user: User) => void): UseLoginReturn {
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' });
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { mutateAsync: loginMutate, isPending } = useMutation({
    mutationFn: (data: LoginForm) => api.auth.login(data),
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
      setApiError(msg);
    },
  });

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
    setApiError('');
    try {
      const data = await loginMutate({ username: form.username, password: form.password });
      const user = (data as { data?: User } & User).data ?? data;
      onLoginSuccess(user);
    } catch {
      // error handled in onError
    }
  }

  function togglePassword(): void {
    setShowPassword((v) => !v);
  }

  return { form, errors, isPending, apiError, showPassword, handleChange, handleSubmit, togglePassword };
}
