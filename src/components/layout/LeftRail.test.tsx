import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeftRail } from './LeftRail';

vi.mock('@/hooks/auth/useRole', () => ({
  useRole: () => ({
    me: { id: 'usr_test', username: 'shop', email: 'shop@example.com', avatar: null },
    isSeller: true,
    isAdmin: false,
  }),
}));

function renderRail(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LeftRail />
    </MemoryRouter>,
  );
}

// `canvas-elevated` is #F4F4F5 on a #FAFAFA light canvas — a row highlighted with it is
// invisible, which is the bug this guards. Hover and active use an amber tint instead.
describe('LeftRail row highlight', () => {
  it('marks the active seller row with an amber tint and label', () => {
    renderRail('/sell/orders');
    const active = screen.getByRole('link', { name: 'Đơn bán' });

    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveClass('bg-tb-amber/15');
    expect(active).not.toHaveClass('bg-canvas-elevated');
    expect(screen.getByText('Đơn bán')).toHaveClass('text-accent-amber');
  });

  it('gives inactive rows an amber hover tint, never the elevated canvas', () => {
    renderRail('/sell/orders');
    for (const link of screen.getAllByRole('link')) {
      if (link.getAttribute('aria-current') === 'page') continue;
      expect(link).toHaveClass('hover:bg-tb-amber/10');
      expect(link.className).not.toMatch(/bg-canvas-elevated/);
    }
  });

  it('highlights the primary block the same way', () => {
    renderRail('/marketplace');
    const active = screen.getByRole('link', { name: 'Chợ sản phẩm' });

    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active).toHaveClass('bg-tb-amber/15');
    expect(screen.getByText('Chợ sản phẩm')).toHaveClass('text-accent-amber');
    expect(screen.getByRole('link', { name: 'Bảng tin' })).not.toHaveAttribute('aria-current');
  });
});
