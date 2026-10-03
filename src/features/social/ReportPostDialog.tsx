import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GradientButton } from '@/components/shared/GradientButton';
import { api } from '@/api';
import { cn } from '@/lib/format/utils';
import { reportPostErrorMessage } from './reportPostError';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { socialMessages } from './social.i18n';

const MAX_REASON = 500;

interface ReportPostDialogProps {
  postId: string;
  open: boolean;
  onClose: () => void;
}

export function ReportPostDialog({ postId, open, onClose }: ReportPostDialogProps) {
  const t = useT(socialMessages);
  const { lang } = useLanguage();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending, isSuccess, reset } = useMutation({
    mutationFn: (value: string) => api.social.reportPost(postId, { reason: value }),
    onError: (err: unknown) => setError(reportPostErrorMessage(err, lang)),
  });

  function handleClose(): void {
    setReason('');
    setError(null);
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const value = reason.trim();
    if (!value || isPending) return;
    setError(null);
    mutate(value);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md bg-canvas-surface border-bdr text-ink-pri">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-ink-pri">
            <Flag size={18} className="shrink-0 text-accent-red" /> {t('reportPost')}
          </DialogTitle>
          <DialogDescription className="text-ink-sec">
            {t('reportDescription')}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-sm font-body text-accent-green">
              {t('reportSent')}
            </p>
            <GradientButton type="button" size="sm" onClick={handleClose} className="self-end">
              {t('close')}
            </GradientButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              rows={4}
              autoFocus
              placeholder={t('reportPlaceholder')}
              className="w-full bg-canvas-elevated border border-bdr rounded-tb-input px-3 py-2 text-sm font-body text-ink-pri placeholder:text-ink-muted outline-none resize-none focus:border-tb-red/50"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-muted font-body">{reason.length}/{MAX_REASON}</span>
              {error && <span className="text-xs text-accent-red font-body">{error}</span>}
            </div>
            <GradientButton
              type="submit"
              size="sm"
              disabled={isPending || reason.trim().length === 0}
              className={cn('self-end', 'gap-1.5')}
            >
              {isPending && <Loader2 size={14} className="shrink-0 animate-spin" />}
              {t('sendReport')}
            </GradientButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
