import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { api } from '@/api';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { postAuthEvent } from '@/lib/auth/authChannel';
import { replaceSessionCache } from '@/lib/auth/sessionCache';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { logoutAllErrorMessage } from './logoutAll';
import { userMessages } from './user.i18n';

// Security-tab footer: revoke every session of the account (SESSION-REVOKE-01).
// A sibling of ChangePasswordForm, not inside it — the two must not share a <form>.
export function LogoutAllDevices(): ReactElement {
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();
  const t = useT(userMessages);

  const logoutAll = useMutation({
    mutationFn: () => api.auth.logoutAll(),
    // The 201 already cleared the cookie; drop the local session the same way
    // `useAuth().logout` does, and tell the other tabs.
    onSuccess: () => {
      replaceSessionCache(queryClient, null);
      postAuthEvent({ type: 'logout' });
      void navigate('/login', { replace: true });
    },
  });

  function close(): void {
    setConfirming(false);
    logoutAll.reset();
  }

  return (
    <div className="flex flex-col gap-2 px-5 pb-5 pt-4 border-t border-bdr">
      <p className="m-0 font-body text-sm text-ink-sec">
        {t('logoutAllHint')}
      </p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="self-start inline-flex items-center gap-2 px-3.5 py-2 rounded-tb-cta border border-tb-red/40 bg-tb-red/10 font-body text-sm font-semibold text-accent-red cursor-pointer transition-colors hover:bg-tb-red/20"
      >
        <LogOut size={14} className="shrink-0" />
        {t('logoutAllButton')}
      </button>

      <ConfirmDialog
        open={confirming}
        title={t('logoutAllTitle')}
        description={t('logoutAllBody')}
        confirmLabel={t('logoutAllConfirm')}
        tone="danger"
        isPending={logoutAll.isPending}
        error={logoutAll.isError ? logoutAllErrorMessage(logoutAll.error, lang) : null}
        onConfirm={() => logoutAll.mutate()}
        onCancel={close}
      />
    </div>
  );
}
