/**
 * IDLEAK-02: the moderation queues' `submittedBy` is the submitter's opaque
 * public id (`usr_…`), not a row number. Three cases have to collapse to one
 * cell:
 *   - a `usr_…` string — render it bare. The old `#{submittedBy}` prefix read as
 *     "row 5"; `#usr_60ccb7b981c411f1` is nonsense.
 *   - `null` — the submitting account no longer resolves (deleted).
 *   - ABSENT — the user service is down and the queue deliberately drops the
 *     field instead of 500ing, so a moderator can still approve/reject.
 * Absent and `null` are the same thing to a moderator, so both render the dash.
 *
 * `number` is accepted on purpose: the backend change is held at release class C
 * (`release-gate.md` → IDLEAK-02), so until it ships prod still sends the raw
 * numeric PK here and this cell must keep rendering it.
 */
export function submitterLabel(submittedBy: string | number | null | undefined): string {
  if (submittedBy === null || submittedBy === undefined) return '—';
  const label = String(submittedBy).trim();
  return label === '' ? '—' : label;
}
