import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  ShieldX,
  SearchX,
  GitMerge,
  ClipboardX,
  Hourglass,
  Unplug,
  Wrench,
  WifiOff,
  Lightbulb,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Home,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import { useResetOnChange } from '@/hooks/ui/useResetOnChange';
import type { ApiError } from '@/types';

interface ErrorConfig {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: 'amber' | 'red' | 'cyan';
  title: string;
  sub: string;
  tips: string[];
  rateLimit?: boolean;
  primary?: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; to: string };
}

const ERROR_MAP: Record<number, ErrorConfig> = {
  401: { icon: LogIn,       tone: 'amber', title: 'Phiên đăng nhập đã hết hạn',   sub: 'Bạn cần đăng nhập lại để tiếp tục.', tips: ['Đăng nhập lại để làm mới phiên.', 'Bật "Ghi nhớ đăng nhập" để đỡ bị đăng xuất.'], primary: { label: 'Đăng nhập lại', icon: LogIn, to: '/login' } },
  403: { icon: ShieldX,     tone: 'red',   title: 'Bạn không có quyền truy cập',  sub: 'Tài khoản hiện tại không đủ quyền cho thao tác này.',tips: [] },
  404: { icon: SearchX,     tone: 'cyan',  title: 'Không tìm thấy nội dung',      sub: 'Trang hoặc dữ liệu bạn tìm không tồn tại / đã bị xoá.',tips: ['Kiểm tra lại đường dẫn.', 'Quay lại và thử từ trang chủ.'] },
  409: { icon: GitMerge,    tone: 'amber', title: 'Xung đột dữ liệu',             sub: 'Dữ liệu đã thay đổi hoặc bị trùng.',tips: ['Tải lại để lấy dữ liệu mới nhất rồi thử lại.'] },
  422: { icon: ClipboardX,  tone: 'amber', title: 'Dữ liệu chưa hợp lệ',         sub: 'Một vài trường không qua được kiểm tra.',tips: ['Xem lại thông tin đã nhập và sửa theo gợi ý.'] },
  429: { icon: Hourglass,   tone: 'amber', title: 'Bạn thao tác quá nhanh',       sub: 'Hệ thống giới hạn số yêu cầu để chống spam. Hãy chờ một lát rồi thử lại.',tips: ['Đợi hết thời gian đếm ngược bên dưới.', 'Tránh bấm Thích / gửi liên tục nhiều lần.'], rateLimit: true },
  500: { icon: AlertTriangle,tone: 'red',  title: 'Máy chủ gặp sự cố',            sub: 'Yêu cầu không được xử lý do lỗi phía máy chủ.', tips: ['Thử lại sau ít phút.', 'Nếu vẫn lỗi, hãy quay lại sau.'] },
  502: { icon: Unplug,      tone: 'red',   title: 'Máy chủ phản hồi lỗi',        sub: 'Cổng kết nối tới dịch vụ đang gặp sự cố.', tips: ['Thử lại sau ít phút.'] },
  503: { icon: Wrench,      tone: 'cyan',  title: 'Hệ thống đang bảo trì',        sub: 'Dịch vụ tạm thời không khả dụng.', tips: ['Vui lòng quay lại sau ít phút.'] },
  0:   { icon: WifiOff,     tone: 'red',   title: 'Mất kết nối mạng',             sub: 'Không thể kết nối tới máy chủ TryBuy.', tips: ['Kiểm tra kết nối Internet của bạn.', 'Thử lại sau khi mạng ổn định.'] },
};

const UNEXPECTED: ErrorConfig = {
  icon: AlertTriangle, tone: 'red',
  title: 'Đã xảy ra lỗi',
  sub: 'Không tải được dữ liệu. Vui lòng thử lại.',
  tips: ['Thử lại sau ít phút.', 'Nếu vẫn lỗi, hãy tải lại trang.'],
};

/**
 * Always resolves to a config. Returning `undefined` for an unmapped status used
 * to render *nothing* — a blank screen at the exact moment the user needs an
 * explanation, and the reason a page delegating its error state here could go
 * empty on a plain 500. Unknown 5xx degrade to the server-error panel, anything
 * else (incl. a network `TypeError` with no `statusCode`) to a generic one.
 */
function resolveErrorConfig(status: number | undefined): ErrorConfig {
  if (status == null) return UNEXPECTED;
  return ERROR_MAP[status] ?? (status >= 500 ? ERROR_MAP[500] : UNEXPECTED);
}

const TONES = {
  amber: { ring: 'border-tb-amber/30 bg-tb-amber/[0.04]', chip: 'bg-tb-amber/10 text-accent-amber', dot: 'bg-accent-amber' },
  red:   { ring: 'border-tb-red/30 bg-tb-red/[0.04]',     chip: 'bg-tb-red/10 text-accent-red',     dot: 'bg-accent-red' },
  cyan:  { ring: 'border-tb-cyan/30 bg-tb-cyan/[0.04]',   chip: 'bg-tb-cyan/10 text-accent-cyan',   dot: 'bg-accent-cyan' },
};

function parseRetrySeconds(msg?: string): number {
  if (!msg) return 60;
  const m = String(msg).match(/(\d+)\s*(seconds?|s|giây)/i);
  return m ? Number(m[1]) : 60;
}

interface ApiErrorStateProps {
  error?: ApiError;
  onRetry?: () => void;
  embedded?: boolean;
}

export function ApiErrorState({ error = {} as ApiError, onRetry, embedded = false }: ApiErrorStateProps) {
  const navigate = useNavigate();
  const cfg = resolveErrorConfig(error.statusCode);

  const seconds = cfg.rateLimit ? parseRetrySeconds(error.message) : 0;
  const [left, setLeft] = useState(seconds);

  useResetOnChange(seconds, () => setLeft(seconds));

  useEffect(() => {
    if (!cfg.rateLimit || left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [cfg.rateLimit, left]);

  const tone = TONES[cfg.tone];
  const canRetry = !cfg.rateLimit || left <= 0;
  const pct = seconds ? ((seconds - left) / seconds) * 100 : 100;

  const IconComp = cfg.icon;
  const PrimaryIcon = cfg.primary?.icon;

  const body = (
    <div className={cn('relative w-full max-w-lg mx-auto bg-canvas-surface border rounded-tb-sheet overflow-hidden', tone.ring)}>
      <div className="relative p-7 flex flex-col items-center text-center gap-4">
        {/* icon */}
        <div className={cn('size-16 rounded-2xl grid place-items-center', tone.chip)}>
          <IconComp size={30} className="shrink-0" />
        </div>

        <div>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight text-white m-0">{cfg.title}</h1>
          <p className="font-body text-sm text-ink-sec mt-2 mb-0 leading-relaxed">{cfg.sub}</p>
        </div>

        {/* server message */}
        {error.message && (
          <div className="w-full bg-canvas-base border border-bdr rounded-tb-cta px-3.5 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-1">Thông báo từ máy chủ</div>
            <div className="font-mono text-[13px] text-ink-pri leading-snug">{error.message}</div>
          </div>
        )}

        {/* rate-limit countdown */}
        {cfg.rateLimit && (
          <div className="w-full">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-ink-sec">{left > 0 ? 'Có thể thử lại sau' : 'Đã có thể thử lại'}</span>
              <span className="font-mono font-bold text-accent-amber">{left > 0 ? `${left}s` : '0s'}</span>
            </div>
            <div className="h-2 rounded-full bg-canvas-elevated overflow-hidden">
              <div
                className="h-full bg-tb-gradient rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* tips — only when non-empty */}
        {cfg.tips.length > 0 && (
          <div className="w-full bg-canvas-elevated/50 border border-bdr rounded-tb-cta p-4 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white uppercase tracking-wide mb-2">
              <Lightbulb size={13} className="text-accent-amber shrink-0" /> Đề xuất
            </div>
            <ul className="m-0 pl-0 list-none flex flex-col gap-1.5">
              {cfg.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-sec">
                  <ChevronRight size={14} className="text-accent-amber shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* actions */}
        <div className="w-full flex flex-col gap-2.5">
          {cfg.primary && PrimaryIcon ? (
            <GradientButton className="w-full" onClick={() => { void navigate(cfg.primary!.to); }}>
              <PrimaryIcon size={16} className="shrink-0" /> {cfg.primary.label}
            </GradientButton>
          ) : (
            <GradientButton className="w-full" disabled={!canRetry} onClick={() => { if (canRetry && onRetry) onRetry(); }}>
              <RotateCcw size={16} className="shrink-0" />
              {cfg.rateLimit && left > 0 ? `Thử lại sau ${left}s` : 'Thử lại'}
            </GradientButton>
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => { void (window.history.length > 1 ? navigate(-1) : navigate('/')); }}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-tb-cta border border-bdr bg-canvas-elevated text-ink-sec text-sm font-display font-black uppercase tracking-widest hover:border-ink-muted transition-colors"
            >
              <ArrowLeft size={15} className="shrink-0" /> Quay lại
            </button>
            <button
              type="button"
              onClick={() => { void navigate('/'); }}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-tb-cta border border-bdr bg-canvas-elevated text-ink-sec text-sm font-display font-black uppercase tracking-widest hover:border-ink-muted transition-colors"
            >
              <Home size={15} className="shrink-0" /> Trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) return body;
  return <div className="min-h-[60vh] flex items-center justify-center py-10">{body}</div>;
}
