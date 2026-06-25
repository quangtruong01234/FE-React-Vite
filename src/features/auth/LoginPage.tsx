import { useState, type ReactElement } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, User as UserIcon, Lock, Globe, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLogin } from './useLogin';
import { registerSchema, type RegisterFormData } from './auth.schema';
import { api } from '@/api';
import { useAuthContext } from '@/context/AuthContext';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import { TextField } from '@/components/shared/TextField';
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

// Social login, remember-me, and forgot-password have no backend endpoints
// (auth = login/register/logout/me only) — disabled with a "sắp ra mắt" label
// per P2-03 rather than shipping dead controls.
const COMING_SOON_TITLE = 'Tính năng sắp ra mắt';

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
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const { mutateAsync: registerMutate, isPending: registerPending } = useMutation({
    mutationFn: (data: RegisterFormData) => api.auth.register(data),
  });

  const { mutateAsync: loginAfterRegister, isPending: loginPending } = useMutation({
    mutationFn: (creds: Pick<RegisterFormData, 'username' | 'password'>) =>
      api.auth.login(creds),
  });

  const loading = registerPending || loginPending || isSubmitting;

  async function onSubmit(data: RegisterFormData): Promise<void> {
    try {
      await registerMutate(data);
      const user = await loginAfterRegister({ username: data.username, password: data.password });
      onRegisterSuccess(user);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Đăng ký thất bại. Vui lòng thử lại.';
      setError('root', { message: msg });
    }
  }

  return (
    <div className="px-6 py-12 md:px-[64px] md:py-[60px] flex flex-col justify-center items-stretch">
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
          {errors.root?.message && (
            <div className="bg-red-950/40 border border-tb-red/40 rounded-tb-input text-tb-red text-[13px] px-[14px] py-[10px] text-center">
              {errors.root.message}
            </div>
          )}

          <form className="flex flex-col gap-[14px]" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-username" className="font-body font-[500] text-[11px] leading-[1.4] text-tb-secondary tracking-[0.04em] uppercase">
                Tên đăng nhập
              </label>
              <input
                id="reg-username"
                placeholder="Nhập tên đăng nhập"
                autoFocus
                className={cn(
                  'h-[44px] bg-tb-elevated border rounded-[10px] px-[14px] text-white font-body text-[14px] outline-none placeholder:text-tb-muted transition-[border-color,box-shadow] duration-[120ms]',
                  'focus:border-[rgba(245,158,11,0.5)] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.10)]',
                  errors.username ? 'border-tb-red focus:border-tb-red focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]' : 'border-tb-border',
                )}
                {...register('username')}
              />
              {errors.username && <span className="text-xs text-tb-red">{errors.username.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="reg-email" className="font-body font-[500] text-[11px] leading-[1.4] text-tb-secondary tracking-[0.04em] uppercase">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                placeholder="Nhập địa chỉ email"
                className={cn(
                  'h-[44px] bg-tb-elevated border rounded-[10px] px-[14px] text-white font-body text-[14px] outline-none placeholder:text-tb-muted transition-[border-color,box-shadow] duration-[120ms]',
                  'focus:border-[rgba(245,158,11,0.5)] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.10)]',
                  errors.email ? 'border-tb-red focus:border-tb-red focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]' : 'border-tb-border',
                )}
                {...register('email')}
              />
              {errors.email && <span className="text-xs text-tb-red">{errors.email.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="reg-password" className="font-body font-[500] text-[11px] leading-[1.4] text-tb-secondary tracking-[0.04em] uppercase">
                Mật khẩu
              </label>
              <input
                id="reg-password"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                className={cn(
                  'h-[44px] bg-tb-elevated border rounded-[10px] px-[14px] text-white font-body text-[14px] outline-none placeholder:text-tb-muted transition-[border-color,box-shadow] duration-[120ms]',
                  'focus:border-[rgba(245,158,11,0.5)] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.10)]',
                  errors.password ? 'border-tb-red focus:border-tb-red focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]' : 'border-tb-border',
                )}
                {...register('password')}
              />
              {errors.password && <span className="text-xs text-tb-red">{errors.password.message}</span>}
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
  const { loginSuccess } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  function handleAuthSuccess(user: User): void {
    loginSuccess(user);
    void navigate(searchParams.get('next') ?? '/');
  }

  const { form, errors, isPending: loading, apiError, showPassword, handleChange, handleSubmit, togglePassword } =
    useLogin(handleAuthSuccess);

  return (
    <main className="tb-enter min-h-screen grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
      <LeftPanel />

      {showRegister ? (
        <RegisterForm onBack={() => setShowRegister(false)} onRegisterSuccess={handleAuthSuccess} />
      ) : (
        <section className="px-6 py-12 md:px-[64px] md:py-[60px] flex flex-col justify-center items-stretch">
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
                    label="Tài khoản"
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
                  <label
                    title={COMING_SOON_TITLE}
                    className="inline-flex items-center gap-2 font-body text-[13px] text-tb-muted cursor-not-allowed"
                  >
                    <input
                      type="checkbox"
                      disabled
                      className="accent-[#F59E0B] cursor-not-allowed"
                    />
                    Ghi nhớ đăng nhập
                    <span className="text-[11px] text-tb-muted">(sắp ra mắt)</span>
                  </label>
                  <button
                    type="button"
                    disabled
                    aria-disabled
                    title={COMING_SOON_TITLE}
                    className="bg-transparent !border-none p-0 font-body font-medium text-[13px] text-tb-muted cursor-not-allowed"
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
                <button type="button" disabled aria-disabled title={COMING_SOON_TITLE} className={cn(ghostBtn, 'cursor-not-allowed opacity-50 hover:text-tb-secondary hover:border-tb-border')}>
                  <Globe size={16} /> Google
                </button>
                <button type="button" disabled aria-disabled title={COMING_SOON_TITLE} className={cn(ghostBtn, 'cursor-not-allowed opacity-50 hover:text-tb-secondary hover:border-tb-border')}>
                  <Users size={16} /> Facebook
                </button>
              </div>
              <p className="text-center -mt-0.5 mb-0 font-body text-[11px] text-tb-muted">
                Đăng nhập mạng xã hội sắp ra mắt
              </p>

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
