import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { ToggleSwitch } from './ToggleSwitch';

// AUD-0816-03 (verify-ui follow-up): the track renders no text, so an unnamed
// switch reaches a screen reader as bare "switch, checked". Chrome's a11y tree
// on /shop showed 12 of them — one per product row. `label` is now required by
// the prop type, and these tests pin that it actually lands on the control
// (a `title` on a wrapping <div> does not name the button inside it).
describe('<ToggleSwitch>', () => {
  it('exposes its label as the accessible name of the switch', () => {
    render(<ToggleSwitch label="Hiển thị Sony WF-1000XM5" checked onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Hiển thị Sony WF-1000XM5' })).toBeInTheDocument();
  });

  it('reports its on/off state via aria-checked', () => {
    const { rerender } = render(<ToggleSwitch label="Nhiều phân loại" checked onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');

    rerender(<ToggleSwitch label="Nhiều phân loại" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles to the opposite value on click', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Hiển thị sản phẩm" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not fire onChange while disabled', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Hiển thị sản phẩm" checked onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
