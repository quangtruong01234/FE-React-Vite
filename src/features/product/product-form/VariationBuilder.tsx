import { useState, type ReactElement, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { IconButton } from '@/components/shared/IconButton';
import type { VarGroup, FormErrors } from './useProductForm';

const inputCls = cn(
  'bg-canvas-elevated border border-bdr rounded-tb-input',
  'px-3 py-2 text-ink-pri font-body text-sm placeholder:text-ink-muted',
  'outline-none transition-colors',
  'focus:border-accent-amber/50 focus:ring-2 focus:ring-accent-amber/20',
);

interface Props {
  groups: VarGroup[];
  errors: FormErrors;
  onSetGroupName: (index: number, name: string) => void;
  onAddOption: (index: number, option: string) => void;
  onRemoveOption: (index: number, optionIndex: number) => void;
  onAddGroup: () => void;
  onRemoveGroup: (index: number) => void;
}

function OptionChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}): ReactElement {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent-amber/10 text-accent-amber rounded-tb-pill text-xs font-body font-medium shrink-0">
      {label}
      <IconButton
        onClick={onRemove}
        className="size-3.5 rounded-full hover:bg-accent-amber/20 transition-colors"
      >
        <X size={9} className="shrink-0" />
      </IconButton>
    </span>
  );
}

function GroupRow({
  group,
  index,
  canRemove,
  onSetName,
  onAddOption,
  onRemoveOption,
  onRemoveGroup,
}: {
  group: VarGroup;
  index: number;
  canRemove: boolean;
  onSetName: (v: string) => void;
  onAddOption: (v: string) => void;
  onRemoveOption: (optIdx: number) => void;
  onRemoveGroup: () => void;
}): ReactElement {
  const [draft, setDraft] = useState('');

  function commit(): void {
    if (!draft.trim()) return;
    onAddOption(draft.trim());
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  }

  return (
    <div className="flex flex-col gap-2.5 p-4 bg-canvas-elevated rounded-tb-card border border-bdr">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={group.name}
          onChange={e => onSetName(e.target.value)}
          placeholder={`Nhóm ${index + 1} (VD: Màu sắc)`}
          className={cn(inputCls, 'flex-1 min-w-0')}
        />
        {canRemove && (
          <IconButton
            onClick={onRemoveGroup}
            className="size-8 rounded-full hover:bg-canvas-surface text-ink-muted hover:text-accent-red transition-colors shrink-0"
          >
            <X size={15} className="shrink-0" />
          </IconButton>
        )}
      </div>

      {/* Option chips */}
      {group.options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {group.options.map((opt, oi) => (
            <OptionChip
              key={`${opt}-${oi}`}
              label={opt}
              onRemove={() => onRemoveOption(oi)}
            />
          ))}
        </div>
      )}

      {/* Option input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder="Thêm option, nhấn Enter hoặc rời khỏi"
          className={cn(inputCls, 'flex-1 text-xs')}
        />
        <IconButton
          onClick={commit}
          disabled={!draft.trim()}
          className={cn(
            'size-8 rounded-tb-input shrink-0',
            'bg-accent-amber/10 text-accent-amber border border-accent-amber/20',
            'hover:bg-accent-amber/20 transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <Plus size={14} className="shrink-0" />
        </IconButton>
      </div>
    </div>
  );
}

export function VariationBuilder({
  groups,
  errors,
  onSetGroupName,
  onAddOption,
  onRemoveOption,
  onAddGroup,
  onRemoveGroup,
}: Props): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, i) => (
        <GroupRow
          key={group.id}
          group={group}
          index={i}
          canRemove={groups.length > 1}
          onSetName={v => onSetGroupName(i, v)}
          onAddOption={v => onAddOption(i, v)}
          onRemoveOption={oi => onRemoveOption(i, oi)}
          onRemoveGroup={() => onRemoveGroup(i)}
        />
      ))}

      {groups.length < 2 && (
        <button
          type="button"
          onClick={onAddGroup}
          className="flex items-center gap-2 self-start text-sm font-body font-medium text-accent-amber hover:opacity-80 transition-opacity"
        >
          <Plus size={14} className="shrink-0" />
          Thêm nhóm phân loại
        </button>
      )}

      {errors.variations && (
        <p className="text-xs text-accent-red font-body">{errors.variations}</p>
      )}
    </div>
  );
}
