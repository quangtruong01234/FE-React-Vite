import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/api';
import { GradientButton } from '@/components/shared/GradientButton';
import { PasswordField } from '@/components/shared/PasswordField';
import { sharedMessages } from '@/components/shared/shared.i18n';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { translateIfKey } from '@/lib/i18n/messages';
import {
  changePasswordSchema,
  changePasswordError,
  changePasswordPayload,
  type ChangePasswordFormData,
} from './changePassword';
import { userMessages } from './user.i18n';

interface ChangePasswordFormProps {
  onCancel: () => void;
}

// Signed-in password change: the current password is the proof of identity, so
// nothing is emailed and no code is involved (that is the separate logged-out
// reset flow in `features/auth/ForgotPasswordForm`).
export function ChangePasswordForm({ onCancel }: ChangePasswordFormProps): ReactElement {
  const [done, setDone] = useState(false);
  const { lang } = useLanguage();
  const t = useT(userMessages);
  const tShared = useT(sharedMessages);
  const fieldError = (text: string | undefined): string | undefined =>
    translateIfKey(userMessages, lang, text);

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
      // The response now names its own cause (`errorCode`, CHG-PW-02), so a
      // 401 no longer costs a `GET /user/me` probe to disambiguate.
      const { field, message } = changePasswordError(err, lang);
      setError(field, { message });
    }
  }

  const pending = isSubmitting || changePassword.isPending;

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4 p-5" noValidate>
      {done && (
        <p className="bg-tb-green/15 border border-tb-green/30 rounded-tb-input text-accent-green text-[13px] px-3.5 py-2.5 text-center">
          {t('passwordChanged')}
        </p>
      )}

      <PasswordField
        id="current-password"
        label={t('currentPasswordLabel')}
        placeholder={t('currentPasswordPlaceholder')}
        autoComplete="current-password"
        error={fieldError(errors.currentPassword?.message)}
        inputProps={register('currentPassword')}
      />

      <PasswordField
        id="new-password"
        label={t('newPasswordLabel')}
        placeholder={t('min6')}
        error={fieldError(errors.newPassword?.message)}
        inputProps={register('newPassword')}
      />

      <PasswordField
        id="confirm-new-password"
        label={t('confirmNewLabel')}
        placeholder={t('confirmNewLabel')}
        error={fieldError(errors.confirmPassword?.message)}
        inputProps={register('confirmPassword')}
      />

      {/* Server error that belongs to no single field */}
      {errors.root && <p className="text-sm text-accent-red">{fieldError(errors.root.message)}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-canvas-elevated border border-bdr rounded-tb-cta py-2.5 text-sm font-semibold text-ink-sec cursor-pointer hover:border-tb-amber/50 transition-colors"
        >
          {tShared('cancel')}
        </button>
        <GradientButton type="submit" disabled={pending} size="sm" className="flex-1">
          {pending && <Loader2 size={14} className="animate-spin shrink-0" />}
          {t('changePassword')}
        </GradientButton>
      </div>
    </form>
  );
}
