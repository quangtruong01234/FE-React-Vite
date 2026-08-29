import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/api';
import { GradientButton } from '@/components/shared/GradientButton';
import { PasswordField } from '@/components/shared/PasswordField';
import {
  changePasswordSchema,
  changePasswordError,
  changePasswordPayload,
  isAuthFailure,
  isSessionAlive,
  type ChangePasswordFormData,
} from './changePassword';

interface ChangePasswordFormProps {
  onCancel: () => void;
}

// Signed-in password change: the current password is the proof of identity, so
// nothing is emailed and no code is involved (that is the separate logged-out
// reset flow in `features/auth/ForgotPasswordForm`).
export function ChangePasswordForm({ onCancel }: ChangePasswordFormProps): ReactElement {
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({ resolver: zodResolver(changePasswordSchema) });

  const changePassword = useMutation({
    mutationFn: (data: ChangePasswordFormData) =>
      api.auth.changePassword(changePasswordPayload(data)),
  });

  async function onSubmit(data: ChangePasswordFormData): Promise<void> {
    setDone(false);
    try {
      await changePassword.mutateAsync(data);
      // Clear the typed passwords out of form state as soon as they are no
      // longer needed — nothing here is worth keeping around after success.
      reset();
      setDone(true);
    } catch (err: unknown) {
      // A 401/403 here is ambiguous by contract, so ask the server which of the
      // two it was before choosing where to hang the message.
      const sessionAlive = isAuthFailure(err) ? await isSessionAlive() : true;
      const { field, message } = changePasswordError(err, sessionAlive);
      setError(field, { message });
    }
  }

  const pending = isSubmitting || changePassword.isPending;

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4 p-5" noValidate>
      {done && (
        <p className="bg-accent-green/15 border border-accent-green/30 rounded-tb-input text-accent-green text-[13px] px-3.5 py-2.5 text-center">
          Đã đổi mật khẩu thành công.
        </p>
      )}

      <PasswordField
        id="current-password"
        label="Mật khẩu hiện tại"
        placeholder="Nhập mật khẩu hiện tại"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        inputProps={register('currentPassword')}
      />

      <PasswordField
        id="new-password"
        label="Mật khẩu mới"
        placeholder="Tối thiểu 6 ký tự"
        error={errors.newPassword?.message}
        inputProps={register('newPassword')}
      />

      <PasswordField
        id="confirm-new-password"
        label="Nhập lại mật khẩu mới"
        placeholder="Nhập lại mật khẩu mới"
        error={errors.confirmPassword?.message}
        inputProps={register('confirmPassword')}
      />

      {/* Server error that belongs to no single field */}
      {errors.root && <p className="text-sm text-accent-red">{errors.root.message}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-canvas-elevated border border-bdr rounded-tb-cta py-2.5 text-sm font-semibold text-ink-sec cursor-pointer hover:border-accent-amber/50 transition-colors"
        >
          Hủy
        </button>
        <GradientButton type="submit" disabled={pending} size="sm" className="flex-1">
          {pending && <Loader2 size={14} className="animate-spin shrink-0" />}
          Đổi mật khẩu
        </GradientButton>
      </div>
    </form>
  );
}
