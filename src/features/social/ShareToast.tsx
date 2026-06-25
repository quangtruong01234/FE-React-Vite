import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

interface ShareToastProps {
  message: string | null;
}

/** Centered bottom toast for share/copy feedback. */
export function ShareToast({ message }: ShareToastProps) {
  if (!message) return null;
  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-tb-cta bg-canvas-elevated border border-bdr shadow-tb-card text-sm font-body text-ink-pri">
      <Check size={15} className="shrink-0 text-accent-green" />
      {message}
    </div>,
    document.body,
  );
}
