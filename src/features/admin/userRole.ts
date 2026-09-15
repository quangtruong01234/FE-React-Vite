import type { RoleName } from '@/types';
import type { SelectFieldOption } from '@/components/shared/SelectField';
import { roleLabel } from '@/lib/auth/roleLabels';

/**
 * The roles this panel may assign. Deliberately a subset: the endpoint accepts
 * `logistics_operator` / `shipping_manager` too, but those belong to the GHN
 * console's world and handing them out from the storefront would extend this
 * screen's reach past what the backend handoff asked for.
 */
export const ASSIGNABLE_ROLES: readonly RoleName[] = ['user', 'shop', 'admin'];

export const ASSIGNABLE_ROLE_OPTIONS: SelectFieldOption[] = ASSIGNABLE_ROLES.map((name) => ({
  value: name,
  label: roleLabel(name),
}));

/** Narrows an arbitrary `<select>` value back to something the endpoint accepts. */
export function isAssignableRole(value: string): value is RoleName {
  return ASSIGNABLE_ROLES.includes(value as RoleName);
}

export type RoleEditability = { canEdit: true } | { canEdit: false; reason: string };

/**
 * Whether a row's role may be changed from here, and why not when it may not.
 *
 * Two rows are read-only, both for reasons the UI cannot talk its way out of:
 * the signed-in admin's own row (the backend 400s a self role change — changing
 * a *different* admin is fine), and any account already holding a GHN-world
 * role, which is not in `ASSIGNABLE_ROLES` and so has no option to select.
 */
export function roleEditability(
  row: { id: string; roleName: string },
  currentUserId: string | undefined,
): RoleEditability {
  if (currentUserId !== undefined && row.id === currentUserId) {
    return { canEdit: false, reason: 'Không thể tự đổi vai trò của mình' };
  }
  if (!isAssignableRole(row.roleName)) {
    return { canEdit: false, reason: 'Vai trò thuộc hệ thống GHN — đổi trong GHN console' };
  }
  return { canEdit: true };
}

/**
 * The confirm question, for the modal's title. The consequence lives in
 * `ROLE_CHANGE_CONFIRM_BODY` below rather than in this string: a title that ran
 * two sentences long is what the old `window.confirm` forced.
 */
export function roleChangeConfirmTitle(displayName: string, nextRole: string): string {
  return `Đổi vai trò của ${displayName} thành "${roleLabel(nextRole)}"?`;
}

/**
 * States the re-login requirement *before* the change, so an admin who expected
 * an instant effect can still back out. Same condition as the success notice —
 * the JWT bakes the role at login.
 */
export const ROLE_CHANGE_CONFIRM_BODY =
  'Người dùng cần đăng xuất và đăng nhập lại để vai trò mới có hiệu lực.';

/**
 * The success notice. Phrased as "đã đặt" + the re-login condition, never as
 * "đã cấp quyền" — the JWT bakes the role at login and nothing revokes it, so
 * the new role does nothing at all until the target signs in again.
 */
export function roleChangeSuccessText(displayName: string, newRole: string): string {
  return `Đã đặt vai trò của ${displayName} thành "${roleLabel(newRole)}". Vai trò mới chỉ có hiệu lực sau khi người dùng đăng xuất và đăng nhập lại.`;
}
