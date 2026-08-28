import { type ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { RootErrorBoundary, RouteErrorBoundary } from './ErrorBoundary';

/** Mimics the shapes that actually crashed here: a field typed non-null arriving null. */
function ReadsNullArray({ flags }: { flags: string[] | null }): ReactElement {
  return <div>flags: {(flags as string[]).length}</div>;
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // React logs every boundary-caught error, and componentDidCatch logs one more.
  // Silence both so a passing suite stays readable.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('RouteErrorBoundary', () => {
  it('renders children untouched when nothing throws', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ReadsNullArray flags={['risky']} />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByText(/flags: 1/)).toBeInTheDocument();
  });

  it('shows the error panel instead of a blank page, and keeps the shell around it', () => {
    render(
      <MemoryRouter>
        <div>shell header</div>
        <RouteErrorBoundary>
          <ReadsNullArray flags={null} />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /đã xảy ra lỗi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    // The whole point: siblings of the crashed subtree still render.
    expect(screen.getByText('shell header')).toBeInTheDocument();
  });

  it('does not surface the raw JS error message to the user', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ReadsNullArray flags={null} />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.queryByText(/thông báo từ máy chủ/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cannot read propert/i)).not.toBeInTheDocument();
  });

  it('re-renders the subtree when the user clicks "Thử lại"', async () => {
    const user = userEvent.setup();
    // Mutated by the test between renders, never by the component itself — a
    // component that flips its own flag mid-render is impure and React's
    // concurrent-then-sync error recovery renders it twice.
    const source = { broken: true };

    function Flaky(): ReactElement {
      if (source.broken) throw new Error('transient shape');
      return <div>recovered content</div>;
    }

    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <Flaky />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /đã xảy ra lỗi/i })).toBeInTheDocument();

    source.broken = false; // the transient condition clears
    await user.click(screen.getByRole('button', { name: /thử lại/i }));

    expect(screen.getByText('recovered content')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /đã xảy ra lỗi/i })).not.toBeInTheDocument();
  });

  it('clears the caught error on navigation, so a healthy route is not stuck on the panel', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/broken']}>
        <Link to="/ok">đi trang khác</Link>
        <RouteErrorBoundary>
          <Routes>
            <Route path="/broken" element={<ReadsNullArray flags={null} />} />
            <Route path="/ok" element={<div>healthy page</div>} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /đã xảy ra lỗi/i })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /đi trang khác/i }));

    expect(screen.getByText('healthy page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /đã xảy ra lỗi/i })).not.toBeInTheDocument();
  });

  it('logs the error for diagnosis even though the panel hides it', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary>
          <ReadsNullArray flags={null} />
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    expect(consoleError).toHaveBeenCalledWith(
      '[ErrorBoundary]',
      expect.any(Error),
      expect.any(String),
    );
  });
});

describe('RootErrorBoundary', () => {
  it('renders a router-free fallback with a reload action when the tree above the router throws', () => {
    render(
      <RootErrorBoundary>
        <ReadsNullArray flags={null} />
      </RootErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /đã xảy ra lỗi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tải lại trang/i })).toBeInTheDocument();
  });

  it('renders children untouched when nothing throws', () => {
    render(
      <RootErrorBoundary>
        <div>app tree</div>
      </RootErrorBoundary>,
    );

    expect(screen.getByText('app tree')).toBeInTheDocument();
  });
});
