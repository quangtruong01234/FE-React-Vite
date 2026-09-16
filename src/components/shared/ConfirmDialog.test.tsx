import { describe, it, expect, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * The replacement for `window.confirm`. These pin the three things the native
 * box could not do: keep the consequence on screen next to the question, hold
 * the dialog open while the request runs, and report a failure in place.
 */
function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Xóa địa chỉ"
      description="Hành động này không thể hoàn tác."
      confirmLabel="Xóa"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
}

describe('<ConfirmDialog>', () => {
  it('shows the question and its consequence, and defaults the cancel label', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Xóa địa chỉ');
    expect(dialog).toHaveTextContent('Hành động này không thể hoàn tác.');
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument();
  });

  // Found on prod: "Đã đặt E2E Prod Tester làm Người bán?" wrapped under the
  // close button in the corner. The title is caller-supplied and can be any
  // length, so it has to reserve the corner rather than hope it stays short.
  it('keeps the title clear of the close button', () => {
    setup({ title: 'Đổi vai trò của E2E Prod Tester thành Người bán?' });
    expect(screen.getByText('Đổi vai trò của E2E Prod Tester thành Người bán?')).toHaveClass(
      'pr-6',
    );
  });

  it('renders nothing while closed', () => {
    setup({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reports the two answers separately', async () => {
    const { onConfirm, onCancel } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels on Esc — the same answer the native confirm gave', async () => {
    const { onCancel } = setup();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // A request in flight owns the dialog: Esc or an overlay click would drop the
  // pending state while the mutation keeps running, and the caller would never
  // learn how it ended.
  it('locks both buttons and ignores Esc while the request is in flight', async () => {
    const { onConfirm, onCancel } = setup({ isPending: true });

    expect(screen.getByRole('button', { name: 'Xóa' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeDisabled();

    await userEvent.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps a failed confirm on screen instead of closing silently', () => {
    setup({ error: 'Xóa địa chỉ thất bại. Vui lòng thử lại.' });
    expect(screen.getByRole('dialog')).toHaveTextContent('Xóa địa chỉ thất bại');
  });

  it('shows no error slot when there is nothing to report', () => {
    setup({ error: null });
    expect(screen.getByRole('dialog').textContent).not.toContain('thất bại');
  });
});
