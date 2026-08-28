import { Component, type ErrorInfo, type ReactElement, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { ApiErrorState } from '@/components/shared/ApiErrorState';
import { GradientButton } from '@/components/shared/GradientButton';

/**
 * Without a boundary anywhere in the tree, a single render throw unmounts the
 * whole React root — header, nav and every escape hatch go with it, and the user
 * is left on a blank page with nothing to click. Backend shapes have caused that
 * for real here (`riskFlags: null` read as `.length`, `/user/:id` dropping
 * `role` so `user.role.rol_name` threw), so the containment lives on this side:
 * a bad field breaks one region, never the app.
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered in place of `children` once a descendant throws while rendering. */
  fallback: (state: { error: Error; reset: () => void }) => ReactNode;
  /**
   * Changing this clears a caught error. Route-level callers pass the location
   * key: without it the boundary stays stuck on the fallback and every later
   * navigation renders the error page for a route that is perfectly fine.
   */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The user-facing panel deliberately hides the raw message (a stray
    // "Cannot read properties of null" means nothing to a buyer); keep the
    // component stack here so the crash is still diagnosable from the console.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error !== null && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error !== null) return this.props.fallback({ error, reset: this.reset });
    return this.props.children;
  }
}

/**
 * Boundary for everything rendered inside the app shell. The fallback lands in
 * the content slot, so `Header` / `LeftRail` / `MobileNav` survive the crash and
 * the user can navigate away instead of reloading.
 *
 * Reuses `ApiErrorState` (no second error component — the `500 → blank` fix
 * already made its unmapped-status path render a real panel). With no
 * `statusCode` it resolves to the generic "Đã xảy ra lỗi" config, and with no
 * `message` it drops the "Thông báo từ máy chủ" box — correct, since a render
 * throw is not something the server said.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }): ReactElement {
  const location = useLocation();

  return (
    <ErrorBoundary
      resetKey={location.key}
      fallback={({ reset }) => <ApiErrorState onRetry={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Last resort, mounted above `RouterProvider` — it catches what the route
 * boundary cannot: a throw in `AuthProvider`, in `Header`, or in the router
 * itself. There is no router context up here, so the panel cannot reuse
 * `ApiErrorState` (it calls `useNavigate`) and recovery has to be a hard reload
 * rather than a `<Link>`.
 */
export function RootErrorBoundary({ children }: { children: ReactNode }): ReactElement {
  return (
    <ErrorBoundary
      fallback={() => (
        <div className="min-h-screen bg-canvas-base flex items-center justify-center px-5">
          <div className="w-full max-w-md bg-canvas-surface border border-tb-red/30 rounded-tb-sheet p-7 flex flex-col items-center text-center gap-4">
            <div className="size-16 rounded-2xl grid place-items-center bg-tb-red/10 text-accent-red">
              <AlertTriangle size={30} className="shrink-0" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl uppercase tracking-tight text-white m-0">
                Đã xảy ra lỗi
              </h1>
              <p className="font-body text-sm text-ink-sec mt-2 mb-0 leading-relaxed">
                Ứng dụng gặp sự cố ngoài dự kiến. Tải lại trang để tiếp tục.
              </p>
            </div>
            <GradientButton className="w-full" onClick={() => { window.location.reload(); }}>
              <RotateCcw size={16} className="shrink-0" /> Tải lại trang
            </GradientButton>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
