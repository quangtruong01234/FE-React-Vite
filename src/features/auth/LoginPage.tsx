import { useState, type ReactElement } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, User as UserIcon, Lock, Globe, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLogin } from './useLogin';
import { registerSchema, type RegisterFormData } from './auth.schema';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ThemeToggleButton } from './ThemeToggleButton';
import { LanguageSwitch } from '@/components/shared/LanguageSwitch';
import { PasswordField } from '@/components/shared/PasswordField';
import { api } from '@/api';
import { useAuthContext } from '@/context/useAuthContext';
import type { User } from '@/types';
import { cn } from '@/lib/format/utils';
import { credentialConflictError } from '@/lib/domain/credentialConflict';
import { GradientButton } from '@/components/shared/GradientButton';
import { TextField } from '@/components/shared/TextField';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { translateIfKey } from '@/lib/i18n/messages';
import { sharedMessages } from '@/components/shared/shared.i18n';
import { authMessages } from './auth.i18n';
// ─── Ghost button (social login) ──────────────────────────────────────────────
const ghostBtn =
  'inline-flex items-center justify-center gap-1.5 ' +
  'py-3 px-4 bg-tb-elevated border border-tb-border rounded-tb-input ' +
  'text-tb-secondary font-body font-semibold text-sm cursor-pointer ' +
  'hover:text-ink-pri hover:border-tb-muted ' +
  'transition-[color,border-color] duration-[120ms]';

// ─── Naked link-style button (overrides global button CSS in index.css) ───────
const linkBtn =
  'bg-transparent !border-none p-0 rounded-none text-tb-amber font-semibold text-[13px] cursor-pointer';

interface RegisterFormProps {
  onBack: () => void;
  onRegisterSuccess: (user: User) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TBLogo(): ReactElement {
  return (
    <span className="font-display font-black text-[32px] tracking-[-0.025em] leading-none text-ink-pri">
      Try
      <span className="bg-tb-gradient-90 bg-clip-text text-transparent">Buy</span>
    </span>
  );
}

function Spinner(): ReactElement {
  return (
    <span className="w-5 h-5 rounded-full border-2 border-ink-on-accent/40 border-t-ink-on-accent animate-spin inline-block" />
  );
}

function LeftPanel(): ReactElement {
  const t = useT(authMessages);
  const statTiles = [
    { k: '12k+', v: t('statSellers') },
    { k: '1.4M', v: t('statProducts') },
    { k: '24/7', v: t('statLive') },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between px-16 py-[60px] overflow-hidden border-r border-tb-border bg-tb-base bg-login-left">
      <TBLogo />

      <div className="flex flex-col gap-[22px] max-w-[480px]">
        <h1 className="m-0 font-display font-black text-[64px] tracking-[-0.02em] text-ink-pri leading-none">
          {t('heroLine1')}<br />{t('heroLine2')}
        </h1>

        <p className="m-0 font-body text-base text-tb-secondary leading-[1.55]">
          {t('heroTagline')}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-3.5">
          {statTiles.map((s) => (
            <div
              key={s.v}
              className="py-4 px-[18px] bg-canvas-surface/60 border border-tb-border rounded-tb-cta backdrop-blur-[8px]"
            >
              <div className="font-display font-black text-[26px] tracking-[-0.01em] bg-tb-gradient-text bg-clip-text text-transparent">
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
        {t('footer')}
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
  const { lang } = useLanguage();
  const t = useT(authMessages);
  const fieldError = (text: string | undefined): string | undefined =>
    translateIfKey(authMessages, lang, text);

  const { mutateAsync: registerMutate, isPending: registerPending } = useMutation({
    // confirmPassword is client-side only — never sent to the backend
    mutationFn: ({ username, email, password }: RegisterFormData) =>
      api.auth.register({ username, email, password }),
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
      // A duplicate username/email is a 409 that names the field (backend
      // 2026-08-06) — put it on that input instead of the generic banner.
      const { field, message } = credentialConflictError(err, t('registerFailed'), lang);
      setError(field ?? 'root', { message });
    }
  }

  return (
    <div className="px-6 py-12 md:px-[64px] md:py-[60px] flex flex-col justify-center items-stretch">
      <div className="max-w-[420px] w-full mx-auto flex flex-col gap-[22px]">
        <div>
          <h2 className="m-0 font-display font-black text-[36px] tracking-[-0.02em] text-ink-pri">
            {t('registerTitle')}
          </h2>
          <p className="mt-1.5 mb-0 font-body text-[14px] text-tb-secondary">
            {t('registerSub')}
          </p>
        </div>

        <div className="tb-enter tb-stagger flex flex-col gap-3.5">
          {errors.root?.message && (
            <div className="bg-tb-red/10 border border-tb-red/40 rounded-tb-input text-tb-red text-[13px] px-3.5 py-2.5 text-center">
              {errors.root.message}
            </div>
          )}

          <form className="flex flex-col gap-3.5" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-username" className="font-body font-[500] text-[11px] leading-[1.4] text-tb-secondary tracking-[0.04em] uppercase">
                {t('usernameLabel')}
              </label>
              <input
                id="reg-username"
                placeholder={t('usernamePlaceholder')}
                autoFocus
                className={cn(
                  'h-11 bg-tb-elevated border rounded-tb-input px-3.5 text-ink-pri font-body text-[14px] outline-none placeholder:text-tb-muted transition-[border-color,box-shadow] duration-[120ms]',
                  'focus:border-accent-amber/50 focus:ring-4 focus:ring-accent-amber/10',
                  errors.username ? 'border-tb-red focus:border-tb-red focus:ring-accent-red/10' : 'border-tb-border',
                )}
                {...register('username')}
              />
              {errors.username && <span className="text-xs text-tb-red">{fieldError(errors.username.message)}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="reg-email" className="font-body font-[500] text-[11px] leading-[1.4] text-tb-secondary tracking-[0.04em] uppercase">
                {t('emailLabel')}
              </label>
              <input
                id="reg-email"
                type="email"
                placeholder={t('emailPlaceholder')}
                className={cn(
                  'h-11 bg-tb-elevated border rounded-tb-input px-3.5 text-ink-pri font-body text-[14px] outline-none placeholder:text-tb-muted transition-[border-color,box-shadow] duration-[120ms]',
                  'focus:border-accent-amber/50 focus:ring-4 focus:ring-accent-amber/10',
                  errors.email ? 'border-tb-red focus:border-tb-red focus:ring-accent-red/10' : 'border-tb-border',
                )}
                {...register('email')}
              />
              {errors.email && <span className="text-xs text-tb-red">{fieldError(errors.email.message)}</span>}
            </div>

            <PasswordField
              id="reg-password"
              label={t('passwordLabel')}
              placeholder={t('min8')}
              error={fieldError(errors.password?.message)}
              inputProps={register('password')}
            />

            <PasswordField
              id="reg-confirm-password"
              label={t('confirmLabel')}
              placeholder={t('confirmLabel')}
              error={fieldError(errors.confirmPassword?.message)}
              inputProps={register('confirmPassword')}
            />

            <GradientButton type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <Spinner /> : t('registerSubmit')}
            </GradientButton>
          </form>

          <p className="text-center mt-2 mb-0 font-body text-[13px] text-tb-secondary">
            {t('haveAccount')}{' '}
            <button type="button" onClick={onBack} className={linkBtn}>
              {t('signIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
export default function LoginPage(): ReactElement {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [resetNotice, setResetNotice] = useState(false);
  const { loginSuccess } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang } = useLanguage();
  const t = useT(authMessages);
  const tShared = useT(sharedMessages);

  function handleAuthSuccess(user: User): void {
    loginSuccess(user);
    void navigate(searchParams.get('next') ?? '/');
  }

  // Reset succeeded — the backend does NOT log the user in; return to the
  // login form with a success notice so they sign in with the new password.
  function handleResetSuccess(): void {
    setView('login');
    setResetNotice(true);
  }

  const { form, errors, isPending: loading, apiError, showPassword, rememberMe, handleChange, handleSubmit, togglePassword, toggleRememberMe } =
    useLogin(handleAuthSuccess);

  return (
    <main className="tb-enter relative min-h-screen grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
      <LanguageSwitch className="absolute top-4 right-16 z-10" />
      <ThemeToggleButton />
      <LeftPanel />

      {view === 'register' ? (
        <RegisterForm onBack={() => setView('login')} onRegisterSuccess={handleAuthSuccess} />
      ) : view === 'forgot' ? (
        <ForgotPasswordForm onBack={() => setView('login')} onResetSuccess={handleResetSuccess} />
      ) : (
        <section className="px-6 py-12 md:px-[64px] md:py-[60px] flex flex-col justify-center items-stretch">
          <div className="max-w-[420px] w-full mx-auto flex flex-col gap-[22px]">
            <div>
              <h2 className="m-0 font-display font-black text-[36px] tracking-[-0.02em] text-ink-pri">
                {t('loginTitle')}
              </h2>
              <p className="mt-1.5 mb-0 font-body text-[14px] text-tb-secondary">
                {t('loginSub')}
              </p>
            </div>

            <div className="tb-enter tb-stagger flex flex-col gap-3.5">
              {resetNotice && !apiError && (
                <div className="bg-tb-green/15 border border-tb-green/30 rounded-tb-input text-accent-green text-[13px] px-3.5 py-2.5 text-center">
                  {t('resetDone')}
                </div>
              )}
              {apiError && (
                <div className="bg-tb-red/10 border border-tb-red/40 rounded-tb-input text-tb-red text-[13px] px-3.5 py-2.5 text-center">
                  {translateIfKey(authMessages, lang, apiError)}
                </div>
              )}

              <form className="flex flex-col gap-3.5" onSubmit={(e) => void handleSubmit(e)} noValidate>
                <div className="flex flex-col gap-1">
                  <TextField
                    id="username" name="username"
                    label={t('accountLabel')}
                    placeholder="098 *** ***"
                    value={form.username} onChange={handleChange}
                    leftIcon={<UserIcon size={18} />}
                    hasError={!!errors.username}
                    autoComplete="username" autoFocus
                  />
                  {errors.username && <span className="text-xs text-tb-red">{t(errors.username)}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <TextField
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    label={t('passwordLabel')}
                    placeholder="••••••••"
                    value={form.password} onChange={handleChange}
                    leftIcon={<Lock size={18} />}
                    suffix={
                      <button
                        type="button"
                        onClick={togglePassword}
                        aria-label={tShared(showPassword ? 'hidePassword' : 'showPassword')}
                        className="bg-transparent !border-none p-1 flex items-center cursor-pointer text-tb-secondary hover:text-ink-pri transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                    hasError={!!errors.password}
                    autoComplete="current-password"
                  />
                  {errors.password && <span className="text-xs text-tb-red">{t(errors.password)}</span>}
                </div>

                <div className="flex justify-between items-center">
                  <label className="inline-flex items-center gap-2 font-body text-[13px] text-tb-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={toggleRememberMe}
                      className="accent-tb-amber cursor-pointer"
                    />
                    {t('rememberMe')}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setResetNotice(false); setView('forgot'); }}
                    className={linkBtn}
                  >
                    {t('forgotLink')}
                  </button>
                </div>

                <GradientButton type="submit" disabled={loading} size="lg" className="w-full">
                  {loading ? <Spinner /> : t('loginSubmit')}
                </GradientButton>
              </form>

              <div className="flex items-center gap-3 my-2 font-body text-[11px] text-tb-muted uppercase tracking-[0.08em]">
                <span className="flex-1 h-px bg-tb-border" />
                {t('orContinue')}
                <span className="flex-1 h-px bg-tb-border" />
              </div>

              {/* Social login has no backend endpoint — disabled with a "coming soon" label
                  per P2-03 rather than shipping dead controls. */}
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" disabled aria-disabled title={t('comingSoon')} className={cn(ghostBtn, 'cursor-not-allowed opacity-50 hover:text-tb-secondary hover:border-tb-border')}>
                  <Globe size={16} /> Google
                </button>
                <button type="button" disabled aria-disabled title={t('comingSoon')} className={cn(ghostBtn, 'cursor-not-allowed opacity-50 hover:text-tb-secondary hover:border-tb-border')}>
                  <Users size={16} /> Facebook
                </button>
              </div>
              <p className="text-center -mt-0.5 mb-0 font-body text-[11px] text-tb-muted">
                {t('socialSoon')}
              </p>

              <p className="text-center mt-2 mb-0 font-body text-[13px] text-tb-secondary">
                {t('noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setView('register')}
                  className={linkBtn}
                >
                  {t('registerLink')}
                </button>
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
