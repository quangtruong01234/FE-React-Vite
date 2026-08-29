import { useEffect, useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { cn } from '@/lib/format/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import {
  forgotEmailSchema,
  resetPasswordSchema,
  type ForgotEmailFormData,
  type ResetPasswordFormData,
} from './auth.schema';
import {
  RESEND_COOLDOWN_SECONDS,
  forgotPasswordErrorMessage,
  resetPasswordErrorMessage,
  resendCooldownRemaining,
} from './forgotPassword';
import { PasswordField } from '@/components/shared/PasswordField';

interface ForgotPasswordFormProps {
  onBack: () => void;
  onResetSuccess: () => void;
}

const fieldInput = (hasError: boolean): string =>
  cn(
    'h-11 bg-tb-elevated border rounded-tb-input px-3.5 text-white font-body text-[14px] outline-none placeholder:text-tb-muted transition-[border-color,box-shadow] duration-[120ms]',
    'focus:border-[rgba(245,158,11,0.5)] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.10)]',
    hasError ? 'border-tb-red focus:border-tb-red focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]' : 'border-tb-border',
  );

const linkBtn =
  'bg-transparent !border-none p-0 rounded-none text-tb-amber font-semibold text-[13px] cursor-pointer';

// Two-step forgot-password flow: (1) email → send 6-digit code, (2) code +
// new password → reset, then back to the login form. The backend answers the
// send step with the same neutral 201 whether or not the email exists
// (anti-enumeration), so step 2 always advances and its copy stays neutral.
export function ForgotPasswordForm({ onBack, onResetSuccess }: ForgotPasswordFormProps): ReactElement {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [apiError, setApiError] = useState('');
  const [resendNotice, setResendNotice] = useState(false);
  // Server enforces a 60s resend cooldown per account (repeat requests inside
  // the window silently send nothing) — mirror it on the resend button.
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const remaining = resendCooldownRemaining(cooldownUntil, now);

  useEffect(() => {
    if (cooldownUntil === null) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= cooldownUntil) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const emailForm = useForm<ForgotEmailFormData>({ resolver: zodResolver(forgotEmailSchema) });
  const resetForm = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  const { mutateAsync: sendCode, isPending: sendPending } = useMutation({
    mutationFn: (data: ForgotEmailFormData) => api.auth.forgotPassword(data),
  });

  const { mutateAsync: resetPassword, isPending: resetPending } = useMutation({
    mutationFn: (data: ResetPasswordFormData) =>
      api.auth.resetPassword({ email, code: data.code, newPassword: data.newPassword }),
  });

  function startCooldown(): void {
    const startedAt = Date.now();
    setCooldownUntil(startedAt + RESEND_COOLDOWN_SECONDS * 1000);
    setNow(startedAt);
  }

  async function onSubmitEmail(data: ForgotEmailFormData): Promise<void> {
    setApiError('');
    try {
      await sendCode(data);
      setEmail(data.email);
      startCooldown();
      setStep('reset');
    } catch (error: unknown) {
      setApiError(forgotPasswordErrorMessage(error));
    }
  }

  async function onResend(): Promise<void> {
    setApiError('');
    setResendNotice(false);
    try {
      await sendCode({ email });
      startCooldown();
      setResendNotice(true);
    } catch (error: unknown) {
      setApiError(forgotPasswordErrorMessage(error));
    }
  }

  async function onSubmitReset(data: ResetPasswordFormData): Promise<void> {
    setApiError('');
    try {
      await resetPassword(data);
      onResetSuccess();
    } catch (error: unknown) {
      setApiError(resetPasswordErrorMessage(error));
    }
  }

  return (
    <div className="px-6 py-12 md:px-[64px] md:py-[60px] flex flex-col justify-center items-stretch">
      <div className="max-w-[420px] w-full mx-auto flex flex-col gap-[22px]">
        <div>
          <h2 className="m-0 font-display font-black text-[36px] tracking-[-0.02em] text-white">
            Quên mật khẩu
          </h2>
          <p className="mt-1.5 mb-0 font-body text-[14px] text-tb-secondary">
            {step === 'email'
              ? 'Nhập email đã đăng ký để nhận mã xác nhận 6 chữ số.'
              : `Nếu email tồn tại, mã xác nhận đã được gửi tới ${email}. Mã có hiệu lực trong 10 phút.`}
          </p>
        </div>

        <div className="tb-enter tb-stagger flex flex-col gap-3.5">
          {apiError && (
            <div className="bg-tb-red/10 border border-tb-red/40 rounded-tb-input text-tb-red text-[13px] px-3.5 py-2.5 text-center">
              {apiError}
            </div>
          )}
          {resendNotice && !apiError && (
            <div className="bg-accent-green/15 border border-accent-green/30 rounded-tb-input text-accent-green text-[13px] px-3.5 py-2.5 text-center">
              Đã gửi lại mã (nếu email tồn tại).
            </div>
          )}

          {step === 'email' ? (
            // key: the two step-forms sit in the same tree position — without a
            // remount React reuses the input DOM node and the typed email would
            // leak into the code field.
            <form
              key="email"
              className="flex flex-col gap-3.5"
              onSubmit={(e) => void emailForm.handleSubmit(onSubmitEmail)(e)}
              noValidate
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="forgot-email" className="font-body font-[500] text-[11px] leading-[1.4] text-tb-secondary tracking-[0.04em] uppercase">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="Nhập địa chỉ email"
                  autoFocus
                  autoComplete="email"
                  className={fieldInput(!!emailForm.formState.errors.email)}
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <span className="text-xs text-tb-red">{emailForm.formState.errors.email.message}</span>
                )}
              </div>

              <GradientButton type="submit" disabled={sendPending} size="lg" className="w-full">
                Gửi mã xác nhận →
              </GradientButton>
            </form>
          ) : (
            <form
              key="reset"
              className="flex flex-col gap-3.5"
              onSubmit={(e) => void resetForm.handleSubmit(onSubmitReset)(e)}
              noValidate
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="reset-code" className="font-body font-[500] text-[11px] leading-[1.4] text-tb-secondary tracking-[0.04em] uppercase">
                  Mã xác nhận
                </label>
                <input
                  id="reset-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6 chữ số"
                  autoFocus
                  autoComplete="one-time-code"
                  className={cn(fieldInput(!!resetForm.formState.errors.code), 'font-mono tracking-[0.3em]')}
                  {...resetForm.register('code')}
                />
                {resetForm.formState.errors.code && (
                  <span className="text-xs text-tb-red">{resetForm.formState.errors.code.message}</span>
                )}
              </div>

              <PasswordField
                id="reset-password"
                label="Mật khẩu mới"
                placeholder="Tối thiểu 6 ký tự"
                error={resetForm.formState.errors.newPassword?.message}
                inputProps={resetForm.register('newPassword')}
              />

              <PasswordField
                id="reset-confirm-password"
                label="Nhập lại mật khẩu mới"
                placeholder="Nhập lại mật khẩu mới"
                error={resetForm.formState.errors.confirmPassword?.message}
                inputProps={resetForm.register('confirmPassword')}
              />

              <GradientButton type="submit" disabled={resetPending} size="lg" className="w-full">
                Đặt lại mật khẩu →
              </GradientButton>

              <p className="text-center m-0 font-body text-[13px] text-tb-secondary">
                Chưa nhận được mã?{' '}
                <button
                  type="button"
                  onClick={() => void onResend()}
                  disabled={remaining > 0 || sendPending}
                  className={cn(linkBtn, (remaining > 0 || sendPending) && 'text-tb-muted cursor-not-allowed')}
                >
                  {remaining > 0 ? `Gửi lại mã (${remaining}s)` : 'Gửi lại mã'}
                </button>
              </p>
            </form>
          )}

          <p className="text-center mt-2 mb-0 font-body text-[13px] text-tb-secondary">
            Nhớ mật khẩu rồi?{' '}
            <button type="button" onClick={onBack} className={linkBtn}>
              Đăng nhập
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
