import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariationBuilder } from './VariationBuilder';
import { makeVarGroup, type VarGroup } from './useProductForm';

// Minimal stateful harness mirroring the useProductForm group callbacks, so the
// key-stability regression can be exercised without the whole product form.
function Harness({ initial }: { initial: VarGroup[] }) {
  const [groups, setGroups] = useState<VarGroup[]>(initial);
  return (
    <VariationBuilder
      groups={groups}
      errors={{}}
      onSetGroupName={(i, name) =>
        setGroups(prev => prev.map((g, gi) => (gi === i ? { ...g, name } : g)))
      }
      onAddOption={(i, opt) =>
        setGroups(prev => prev.map((g, gi) => (gi === i ? { ...g, options: [...g.options, opt] } : g)))
      }
      onRemoveOption={(i, oi) =>
        setGroups(prev => prev.map((g, gi) => (gi === i ? { ...g, options: g.options.filter((_, x) => x !== oi) } : g)))
      }
      onAddGroup={() => setGroups(prev => [...prev, makeVarGroup()])}
      onRemoveGroup={i => setGroups(prev => prev.filter((_, gi) => gi !== i))}
    />
  );
}

describe('makeVarGroup', () => {
  it('assigns a unique stable id to each group', () => {
    const a = makeVarGroup();
    const b = makeVarGroup({ name: 'Màu sắc' });
    expect(a.id).not.toBe(b.id);
    expect(b).toMatchObject({ name: 'Màu sắc', options: [] });
  });
});

describe('VariationBuilder — stable id keys (perf-scan correctness gap)', () => {
  it("removing an earlier group does not leak its row's draft onto the sibling", () => {
    render(
      <Harness
        initial={[
          makeVarGroup({ name: 'Màu sắc' }),
          makeVarGroup({ name: 'Kích cỡ' }),
        ]}
      />,
    );

    const drafts = screen.getAllByPlaceholderText(/Thêm option/);
    expect(drafts).toHaveLength(2);

    // Put an uncommitted draft in the FIRST group's option input. fireEvent.change
    // (not userEvent) so no blur fires — otherwise onBlur would flush the draft and
    // mask the instance reuse this test targets.
    fireEvent.change(drafts[0], { target: { value: 'sticky-draft' } });
    expect(drafts[0]).toHaveValue('sticky-draft');

    // Remove the first group via its own remove button (sibling of the name input),
    // again with fireEvent so the click doesn't blur/commit the draft first.
    const firstName = screen.getByPlaceholderText('Nhóm 1 (VD: Màu sắc)');
    const removeBtn = within(firstName.parentElement as HTMLElement).getByRole('button');
    fireEvent.click(removeBtn);

    // Only the second group ("Kích cỡ") remains. With stable id keys its GroupRow
    // instance is untouched, so its draft is still empty. With index keys the key=0
    // instance (the removed first group, holding "sticky-draft") would be reused for
    // it, leaking the stale draft.
    const remaining = screen.getAllByPlaceholderText(/Thêm option/);
    expect(remaining).toHaveLength(1);
    expect(screen.getByPlaceholderText('Nhóm 1 (VD: Màu sắc)')).toHaveValue('Kích cỡ');
    expect(remaining[0]).toHaveValue('');
  });
});

// Keep userEvent import meaningful — a lightweight sanity check on the happy path.
describe('VariationBuilder — add option (sanity)', () => {
  it('commits a typed option to its own group', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[makeVarGroup({ name: 'Màu sắc' })]} />);
    const draft = screen.getByPlaceholderText(/Thêm option/);
    await user.type(draft, 'Đỏ{Enter}');
    expect(screen.getByText('Đỏ')).toBeInTheDocument();
    expect(draft).toHaveValue('');
  });
});
