import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchField } from './SearchField';
import { LIST_SEARCH_MAX } from '@/api/client';

describe('SearchField', () => {
  it('derives its accessible name from the placeholder', () => {
    render(<SearchField value="" onChange={() => {}} placeholder="Tìm theo mã giảm giá…" />);
    expect(screen.getByRole('searchbox', { name: 'Tìm theo mã giảm giá' })).toBeInTheDocument();
  });

  it('prefers an explicit label', () => {
    render(<SearchField value="" onChange={() => {}} placeholder="Mã đơn…" label="Tìm đơn" />);
    expect(screen.getByRole('searchbox', { name: 'Tìm đơn' })).toBeInTheDocument();
  });

  it('caps input at the backend limit unless told otherwise', () => {
    const { rerender } = render(<SearchField value="" onChange={() => {}} placeholder="Tìm…" />);
    expect(screen.getByRole('searchbox')).toHaveAttribute('maxLength', String(LIST_SEARCH_MAX));
    rerender(<SearchField value="" onChange={() => {}} placeholder="Tìm…" maxLength={32} />);
    expect(screen.getByRole('searchbox')).toHaveAttribute('maxLength', '32');
  });

  it('reports the raw value on change', () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Tìm…" />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' ab ' } });
    expect(onChange).toHaveBeenCalledWith(' ab ');
  });
});
