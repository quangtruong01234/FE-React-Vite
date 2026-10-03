import { describe, it, expect } from 'vitest';
import { screen, render } from '@testing-library/react';
import { SelectField } from './SelectField';

const OPTIONS = [
  { value: '1', label: 'Hà Nội' },
  { value: '2', label: 'TP. Hồ Chí Minh' },
];

// The visible label used to sit next to the <select> unconnected, so a screen
// reader announced a bare "combobox" and tests could not find it by its label.
describe('<SelectField>', () => {
  it('names the select with its visible label', () => {
    render(<SelectField label="Tỉnh/thành phố" value="" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByLabelText('Tỉnh/thành phố')).toBe(screen.getByRole('combobox'));
  });

  it('keeps two labelled fields apart', () => {
    render(
      <>
        <SelectField label="Tỉnh/thành phố" value="1" options={OPTIONS} onChange={() => {}} />
        <SelectField label="Quận/huyện" placeholder="Chọn quận/huyện" value="" options={OPTIONS} onChange={() => {}} />
      </>,
    );
    expect(screen.getByLabelText('Tỉnh/thành phố')).toHaveValue('1');
    expect(screen.getByLabelText('Quận/huyện')).toHaveValue('');
  });

  it('falls back to ariaLabel when there is no visible label', () => {
    render(<SelectField ariaLabel="Vai trò" value="1" options={OPTIONS} onChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Vai trò' })).toBeInTheDocument();
  });
});
