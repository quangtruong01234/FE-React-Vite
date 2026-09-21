import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateField } from './DateField';
import { todayIso } from '@/lib/date/calendar';

const VALUE = '2026-08-19';

describe('DateField', () => {
  it('names the trigger with its label and shows the day as dd/mm/yyyy', () => {
    render(<DateField id="pick" label="Từ ngày" value={VALUE} onChange={vi.fn()} />);

    // `<button>` is labelable, so the visible label is the accessible name.
    const trigger = screen.getByLabelText('Từ ngày');
    expect(trigger).toHaveTextContent('19/08/2026');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('falls back to the placeholder with no value set', () => {
    render(<DateField id="pick" label="Từ ngày" value="" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Từ ngày')).toHaveTextContent('Chọn ngày');
  });

  it('opens on the selected day’s month and marks that day pressed', async () => {
    render(<DateField id="pick" label="Từ ngày" value={VALUE} onChange={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Từ ngày'));

    const grid = screen.getByRole('dialog');
    expect(within(grid).getByText('Tháng 8 2026')).toBeInTheDocument();
    expect(within(grid).getByRole('button', { name: '19' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('answers a day click with the ISO day, then closes', async () => {
    const onChange = vi.fn();
    render(<DateField id="pick" label="Từ ngày" value={VALUE} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Từ ngày'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '3' }));

    expect(onChange).toHaveBeenCalledWith('2026-08-03');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows no neighbouring-month days — every number belongs to the header month', async () => {
    render(<DateField id="pick" label="Từ ngày" value="2026-09-17" onChange={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Từ ngày'));

    const grid = screen.getByRole('dialog');
    // September has 30 days; a grid leaking its neighbours would show 31 twice
    // over or a stray 1 that silently belongs to October.
    expect(within(grid).queryByRole('button', { name: '31' })).not.toBeInTheDocument();
    expect(within(grid).getAllByRole('button', { name: '1' })).toHaveLength(1);
  });

  it('disables days outside min/max and keeps the bounds themselves clickable', async () => {
    render(
      <DateField
        id="pick"
        label="Từ ngày"
        value={VALUE}
        min="2026-08-10"
        max="2026-08-20"
        onChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText('Từ ngày'));

    const grid = screen.getByRole('dialog');
    expect(within(grid).getByRole('button', { name: '9' })).toBeDisabled();
    expect(within(grid).getByRole('button', { name: '21' })).toBeDisabled();
    expect(within(grid).getByRole('button', { name: '10' })).toBeEnabled();
    expect(within(grid).getByRole('button', { name: '20' })).toBeEnabled();
  });

  it('ignores a click on a disabled day', async () => {
    const onChange = vi.fn();
    render(
      <DateField id="pick" label="Từ ngày" value={VALUE} max="2026-08-20" onChange={onChange} />,
    );

    await userEvent.click(screen.getByLabelText('Từ ngày'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '25' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('walks months in both directions, rolling the year over', async () => {
    render(<DateField id="pick" label="Từ ngày" value="2026-01-15" onChange={vi.fn()} />);

    await userEvent.click(screen.getByLabelText('Từ ngày'));
    const grid = screen.getByRole('dialog');

    await userEvent.click(within(grid).getByRole('button', { name: 'Tháng trước' }));
    expect(within(grid).getByText('Tháng 12 2025')).toBeInTheDocument();

    await userEvent.click(within(grid).getByRole('button', { name: 'Tháng sau' }));
    await userEvent.click(within(grid).getByRole('button', { name: 'Tháng sau' }));
    expect(within(grid).getByText('Tháng 2 2026')).toBeInTheDocument();
  });

  it('reopens on the selected day’s month, not where the seller browsed to', async () => {
    render(<DateField id="pick" label="Từ ngày" value={VALUE} onChange={vi.fn()} />);
    const trigger = screen.getByLabelText('Từ ngày');

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Tháng trước' }));
    expect(screen.getByText('Tháng 7 2026')).toBeInTheDocument();

    await userEvent.click(trigger);
    await userEvent.click(trigger);
    expect(screen.getByText('Tháng 8 2026')).toBeInTheDocument();
  });

  it('marks today with aria-current and selects it from the footer', async () => {
    const onChange = vi.fn();
    const today = todayIso();
    render(<DateField id="pick" label="Từ ngày" value="" onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Từ ngày'));
    const grid = screen.getByRole('dialog');
    const dayOfMonth = String(Number(today.slice(8, 10)));
    expect(within(grid).getByRole('button', { name: dayOfMonth })).toHaveAttribute(
      'aria-current',
      'date',
    );

    await userEvent.click(within(grid).getByRole('button', { name: 'Hôm nay' }));
    expect(onChange).toHaveBeenCalledWith(today);
  });

  it('disables the footer when today is out of bounds', async () => {
    render(
      <DateField id="pick" label="Từ ngày" value={VALUE} max="2026-08-20" onChange={vi.fn()} />,
    );

    await userEvent.click(screen.getByLabelText('Từ ngày'));

    expect(screen.getByRole('button', { name: 'Hôm nay' })).toBeDisabled();
  });

  it('holds its border colour under the pointer in every state', async () => {
    // `index.css` ships `button:hover { border-color: #F59E0B }` — (0,1,1), which
    // outranks a single utility class. A state that must survive the pointer has to
    // restate its colour as a `hover:` variant; jsdom never applies that stylesheet,
    // so the class list is the only place this is checkable.
    const { rerender } = render(
      <DateField id="pick" label="Từ ngày" value={VALUE} onChange={vi.fn()} hasError />,
    );
    const trigger = screen.getByLabelText('Từ ngày');
    expect(trigger.className).toContain('hover:border-accent-red');

    rerender(<DateField id="pick" label="Từ ngày" value={VALUE} onChange={vi.fn()} />);
    await userEvent.click(trigger);
    expect(trigger.className).toContain('hover:border-tb-amber/50');
  });

  it('closes on Escape and on a click outside', async () => {
    render(
      <div>
        <DateField id="pick" label="Từ ngày" value={VALUE} onChange={vi.fn()} />
        <button type="button">ngoài</button>
      </div>,
    );
    const trigger = screen.getByLabelText('Từ ngày');

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'ngoài' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
