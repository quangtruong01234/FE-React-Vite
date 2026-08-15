import type { ReactElement } from 'react';
import { ApiErrorState } from '@/components/shared/ApiErrorState';
import type { ApiError } from '@/types';

interface TableErrorRowProps {
  error: ApiError;
  /** Must match the table's column count, or the panel breaks the grid. */
  colSpan: number;
  onRetry?: () => void;
}

/**
 * The failed-load state for a `<table>`-based list, in place of the row that
 * would otherwise read "Không có … nào." — an empty table is a claim about the
 * data, and a request that never answered has not earned it.
 */
export function TableErrorRow({ error, colSpan, onRetry }: TableErrorRowProps): ReactElement {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8">
        <ApiErrorState error={error} onRetry={onRetry} embedded />
      </td>
    </tr>
  );
}
