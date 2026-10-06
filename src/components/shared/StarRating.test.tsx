import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarRating } from './StarRating';

// A11Y-NAME-01: the five stars were identical "★" buttons — read-only they announced
// "★, dimmed" five times, editable a screen reader could not tell 1 star from 5.
describe('<StarRating>', () => {
  it('is a single named image when read-only, with no buttons', () => {
    render(<StarRating rating={4} />);
    expect(screen.getByRole('img', { name: '4/5 sao' })).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('names each editable star for the rating it sets and presses the current one', () => {
    render(<StarRating rating={3} readOnly={false} onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(screen.getByRole('button', { name: '3 sao' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '5 sao' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the clicked star', () => {
    const onChange = vi.fn();
    render(<StarRating rating={0} readOnly={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '5 sao' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});
