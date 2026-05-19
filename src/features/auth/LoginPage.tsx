import { useState, type ReactElement, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User as UserIcon, Lock, Globe, Users } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useLogin } from './useLogin';
import { api } from '@/api';
import { useAuthContext } from '@/context/AuthContext';
import type { User } from '@/types';
import { GradientButton } from '@/components/shared/GradientButton';
import { TextField } from '@/components/shared/TextField';
import { OnlinePill } from '@/components/shared/OnlinePill';

// ─── Ghost button (social login) ──────────────────────────────────────────────
const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 ' +
  'py-3 px-4 bg-tb-elevated border border-tb-border rounded-tb-input ' +
  'text-tb-secondary font-body font-semibold text-sm cursor-pointer ' +
  'hover:text-white hover:border-tb-muted ' +
  'transition-[color,border-color] duration-[120ms]';

// ─── Naked link-style button (overrides global button CSS in index.css) ───────
const linkBtn =
  'bg-transparent !border-none p-0 rounded-none text-tb-amber font-semibold text-[13px] cursor-pointer';

// ─── Register form types ──────────────────────────────────────────────────────
interface RegisterFormState {
  username: string;
  email: string;
  password: string;
}

interface RegisterFormProps {
  onBack: () => void;
  onRegisterSuccess: (user: User) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TBLogo(): ReactElement {
  return (
    <span className="font-display font-black text-[32px] tracking-[-0.025em] leading-none text-white">
      Try
      <span className="bg-tb-gradient-90 bg-clip-text text-transparent">Buy</span>
    </span>
  );
}

function Spinner(): ReactElement {
  return (
    <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />
  );
}

function LeftPanel(): ReactElement {
  const statTiles = [
    { k: '12k+', v: 'Sellers' },
    { k: '1.4M', v: 'Sản phẩm' },
    { k: '24/7', v: 'Livestream' },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between px-[64px] py-[60px] overflow-hidden border-r border-tb-border bg-[#0B0B0E] bg-login-left">
      <TBLogo />

      <div className="flex flex-col gap-[22px] max-w-[480px]">
        <OnlinePill count={1284} />

        <h1 className="m-0 font-display font-black text-[64px] tracking-[-0.02em] text-white leading-none">
          Săn deal LIVE<br />mỗi giây.
        </h1>

        <p className="m-0 font-body text-base text-tb-secondary leading-[1.55]">
          Social commerce Việt Nam — Mua trực tiếp từ seller được xác minh.
          Livestream 24/7, giá tốt nhất.
        </p>

        <div className="grid grid-cols-3 gap-3 mt-[14px]">
          {statTiles.map((s) => (
            <div
              key={s.v}
              className="py-4 px-[18px] bg-[rgba(17,17,19,0.6)] border border-tb-border rounded-tb-cta backdrop-blur-[8px]"
            >
              <div className="font-display font-black text-[26px] tracking-[-0.01em] bg-tb-gradient-90 bg-clip-text text-transparent">
                {s.k}
              </div>
              <div className="font-body text-xs text-tb-secondary mt-0.5">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="font-body text-xs text-tb-muted">
        © 2026 TryBuy Việt Nam · Made in Vietnam
      </div>
    </aside>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────
function RegisterForm({ onBack, onRegisterSuccess }: RegisterFormProps): ReactElement {
  const [form, setForm] = useState<RegisterFormState>({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<RegisterFormState>>({});
  const [apiError, setApiError] = useState('');

  const { mutateAsync: registerMutate, isPending: registerPending } = useMutation({
    mutationFn: (data: RegisterFormState) => api.auth.register(data),
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Đăng ký thất bại. Vui lòng thử lại.';
      setApiError(msg);
    },
  });

  const { mutateAsync: loginAfterRegister, isPending: loginPending } = useMutation({
    mutationFn: (creds: Pick<RegisterFormState, 'username' | 'password'>) =>
      api.auth.login(creds),
  });

  const loading = registerPending || loginPending;

  function validate(): Partial<RegisterFormState> {
    const errs: Partial<RegisterFormState> = {};
    if (!form.username.trim()) errs.username = 'Vui lòng nhập tên đăng nhập';
    if (!form.email.trim()) errs.email = 'Vui lòng nhập email';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email không hợp lệ';
    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu';
    else if (form.password.length < 6) errs.password = 'Mật khẩu tối thiểu 6 ký tự';
    return errs;
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterFormState]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    try {
      await registerMutate({ username: form.username, email: form.email, password: form.password });
      const user = await loginAfterRegister({ username: form.username, password: form.password });
      onRegisterSuccess(user);
    } catch {
      // error handled in onError
    }
  }

  return (
    <div className="px-[64px] py-[60px] flex flex-col justify-center items-stretch">
      <div className="max-w-[420px] w-full mx-auto flex flex-col gap-[22px]">
        <div>
          <h2 className="m-0 font-display font-black text-[36px] tracking-[-0.02em] text-white">
            Tạo tài khoản
          </h2>
          <p className="mt-1.5 mb-0 font-body text-[14px] text-tb-secondary">
            Đăng ký để bắt đầu mua sắm với TryBuy.
          </p>
        </div>

        <div className="tb-enter tb-stagger flex flex-col gap-[14px]">
          {apiError && (
            <div className="bg-red-950/40 border border-tb-red/40 rounded-tb-input text-tb-red text-[13px] px-[14px] py-[10px] text-center">
              {apiError}
            </div>
          )}

          <form className="flex flex-col gap-[14px]" onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="flex flex-col gap-1">
              <TextField
                id="reg-username" name="username" label="Tên đăng nhập"
                placeholder="Nhập tên đăng nhập"
                value={form.username} onChange={handleChange}
                hasError={!!errors.username} autoFocus
              />
              {errors.username && <span className="text-xs text-tb-red">{errors.username}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <TextField
                id="reg-email" name="email" type="email" label="Email"
                placeholder="Nhập địa chỉ email"
                value={form.email} onChange={handleChange}
                hasError={!!errors.email}
              />
              {errors.email && <span className="text-xs text-tb-red">{errors.email}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <TextField
                id="reg-password" name="password" type="password" label="Mật khẩu"
                placeholder="Tối thiểu 6 ký tự"
                value={form.password} onChange={handleChange}
                hasError={!!errors.password}
              />
              {errors.password && <span className="text-xs text-tb-red">{errors.password}</span>}
            </div>

            <GradientButton type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <Spinner /> : 'Đăng ký ngay →'}
            </GradientButton>
          </form>

          <p className="text-center mt-2 mb-0 font-body text-[13px] text-tb-secondary">
            Đã có tài khoản?{' '}
            <button type="button" onClick={onBack} className={linkBtn}>
              Đăng nhập
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
export default function LoginPage(): ReactElement {
  const [showRegister, setShowRegister] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { loginSuccess } = useAuthContext();
  const navigate = useNavigate();

  function handleAuthSuccess(user: User): void {
    loginSuccess(user);
    void navigate('/');
  }

  const { form, errors, isPending: loading, apiError, showPassword, handleChange, handleSubmit, togglePassword } =
    useLogin(handleAuthSuccess);

  return (
    <main className="tb-enter min-h-screen grid grid-cols-[1.1fr_1fr]">
      <LeftPanel />

      {showRegister ? (
        <RegisterForm onBack={() => setShowRegister(false)} onRegisterSuccess={handleAuthSuccess} />
      ) : (
        <section className="px-[64px] py-[60px] flex flex-col justify-center items-stretch">
          <div className="max-w-[420px] w-full mx-auto flex flex-col gap-[22px]">
            <div>
              <h2 className="m-0 font-display font-black text-[36px] tracking-[-0.02em] text-white">
                Chào mừng trở lại
              </h2>
              <p className="mt-1.5 mb-0 font-body text-[14px] text-tb-secondary">
                Đăng nhập để tiếp tục mua sắm với TryBuy.
              </p>
            </div>

            <div className="tb-enter tb-stagger flex flex-col gap-[14px]">
              {apiError && (
                <div className="bg-red-950/40 border border-tb-red/40 rounded-tb-input text-tb-red text-[13px] px-[14px] py-[10px] text-center">
                  {apiError}
                </div>
              )}

              <form className="flex flex-col gap-[14px]" onSubmit={(e) => void handleSubmit(e)} noValidate>
                <div className="flex flex-col gap-1">
                  <TextField
                    id="username" name="username"
                    label="Số điện thoại / Email"
                    placeholder="098 *** ***"
                    value={form.username} onChange={handleChange}
                    leftIcon={<UserIcon size={18} />}
                    hasError={!!errors.username}
                    autoComplete="username" autoFocus
                  />
                  {errors.username && <span className="text-xs text-tb-red">{errors.username}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <TextField
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Mật khẩu"
                    placeholder="••••••••"
                    value={form.password} onChange={handleChange}
                    leftIcon={<Lock size={18} />}
                    suffix={
                      <button
                        type="button"
                        onClick={togglePassword}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        className="bg-transparent !border-none p-1 flex items-center cursor-pointer text-tb-secondary hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                    hasError={!!errors.password}
                    autoComplete="current-password"
                  />
                  {errors.password && <span className="text-xs text-tb-red">{errors.password}</span>}
                </div>

                <div className="flex justify-between items-center">
                  <label className="inline-flex items-center gap-2 font-body text-[13px] text-tb-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-[#F59E0B]"
                    />
                    Ghi nhớ đăng nhập
                  </label>
                  <button
                    type="button"
                    className="bg-transparent !border-none p-0 font-body font-medium text-[13px] text-tb-amber cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <GradientButton type="submit" disabled={loading} size="lg" className="w-full">
                  {loading ? <Spinner /> : 'Đăng nhập →'}
                </GradientButton>
              </form>

              <div className="flex items-center gap-3 my-2 font-body text-[11px] text-tb-muted uppercase tracking-[0.08em]">
                <span className="flex-1 h-px bg-tb-border" />
                hoặc tiếp tục với
                <span className="flex-1 h-px bg-tb-border" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" className={ghostBtn}>
                  <Globe size={16} /> Google
                </button>
                <button type="button" className={ghostBtn}>
                  <Users size={16} /> Facebook
                </button>
              </div>

              <p className="text-center mt-2 mb-0 font-body text-[13px] text-tb-secondary">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className={linkBtn}
                >
                  Đăng ký ngay
                </button>
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
