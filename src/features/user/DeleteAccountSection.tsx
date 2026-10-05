import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2 } from 'lucide-react';
import { api } from '@/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PasswordField } from '@/components/shared/PasswordField';
import { postAuthEvent } from '@/lib/auth/authChannel';
import { replaceSessionCache } from '@/lib/auth/sessionCache';
import { translateIfKey } from '@/lib/i18n/messages';
import { cn } from '@/lib/format/utils';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { deleteAccountError, deleteAccountSchema, type DeleteAccountFormData } from './deleteAccount';
import { userMessages } from './user.i18n';

const WARNINGS = [
  'deleteAccountWarnOrders',
  'deleteAccountWarnShipped',
  'deleteAccountWarnRefund',
  'deleteAccountWarnProducts',
  'deleteAccountWarnData',
  'deleteAccountWarnContent',
] as const;

const dialogButton =
  'flex-1 rounded-tb-cta py-2.5 text-sm font-semibold cursor-pointer transition-colors ' +
  'inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

// Security-tab danger zone (ACCOUNT-DELETE-01). Not a ConfirmDialog: the
// confirmation needs the current password, and that dialog has no field slot.
export function DeleteAccountSection(): ReactElement {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const t = useT(userMessages);
  const fieldError = (text: string | undefined): string | undefined =>
    translateIfKey(userMessages, lang, text);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DeleteAccountFormData>({ resolver: zodResolver(deleteAccountSchema) });

  const deleteMe = useMutation({
    mutationFn: (data: DeleteAccountFormData) => api.users.deleteMe({ currentPassword: data.currentPassword }),
    // The 200 already cleared the cookie and revoked every other session; drop
    // the local one the way `LogoutAllDevices` does, and tell the other tabs.
    onSuccess: () => {
      replaceSessionCache(queryClient, null);
      postAuthEvent({ type: 'logout' });
      void navigate('/', { replace: true });
    },
    onError: (err: unknown) => {
      const { field, message } = deleteAccountError(err, lang);
      setError(field, { message });
    },
  });

  function close(): void {
    if (deleteMe.isPending) return;
    setOpen(false);
    reset();
    deleteMe.reset();
  }

  return (
    <div className="flex flex-col gap-2 px-5 pb-5 pt-4 border-t border-bdr">
      <p className="m-0 font-body text-sm text-ink-sec">{t('deleteAccountHint')}</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start inline-flex items-center gap-2 px-3.5 py-2 rounded-tb-cta border border-tb-red/40 bg-tb-red/10 font-body text-sm font-semibold text-accent-red cursor-pointer transition-colors hover:bg-tb-red/20"
      >
        <Trash2 size={14} className="shrink-0" />
        {t('deleteAccountButton')}
      </button>

      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent className="max-w-md bg-canvas-surface border-bdr text-ink-pri">
          <DialogHeader>
            <DialogTitle className="pr-6 font-display text-lg text-ink-pri">{t('deleteAccountTitle')}</DialogTitle>
            <DialogDescription className="text-sm text-ink-sec">{t('deleteAccountIntro')}</DialogDescription>
          </DialogHeader>

          <ul className="m-0 pl-5 flex flex-col gap-1.5 list-disc font-body text-sm text-ink-sec">
            {WARNINGS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>

          <form
            onSubmit={(e) => void handleSubmit((data) => deleteMe.mutate(data))(e)}
            className="flex flex-col gap-3"
            noValidate
          >
            <p className="m-0 font-body text-sm text-ink-sec">{t('deleteAccountPasswordHint')}</p>
            <PasswordField
              id="delete-account-password"
              label={t('currentPasswordLabel')}
              placeholder={t('currentPasswordPlaceholder')}
              autoComplete="current-password"
              error={fieldError(errors.currentPassword?.message)}
              inputProps={register('currentPassword')}
            />
            {errors.root && (
              <p className="m-0 text-sm font-body text-accent-red">{fieldError(errors.root.message)}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={close}
                disabled={deleteMe.isPending}
                className={cn(dialogButton, 'bg-canvas-elevated border border-bdr text-ink-sec hover:border-tb-amber/50')}
              >
                {t('deleteAccountCancel')}
              </button>
              <button
                type="submit"
                disabled={deleteMe.isPending}
                className={cn(dialogButton, 'bg-tb-red/15 border border-tb-red/40 text-accent-red hover:bg-tb-red/25')}
              >
                {deleteMe.isPending && <Loader2 size={14} className="shrink-0 animate-spin" />}
                {t('deleteAccountConfirm')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
