import { useState } from 'react';
import { api } from '../../shared/services/api.js';

export function useLogin(onLoginSuccess) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function validate() {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Vui lòng nhập tên đăng nhập';
    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu';
    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const data = await api.auth.login(form.username, form.password);
      const user = data.data ?? data;
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
      }));
      onLoginSuccess(user);
    } catch (err) {
      setApiError(err.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  function togglePassword() {
    setShowPassword(v => !v);
  }

  return { form, errors, loading, apiError, showPassword, handleChange, handleSubmit, togglePassword };
}
