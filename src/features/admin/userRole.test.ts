import { describe, expect, it } from 'vitest';
import {
  ASSIGNABLE_ROLES,
  assignableRoleOptions,
  roleChangeConfirmBody,
  isAssignableRole,
  roleChangeConfirmTitle,
  roleChangeSuccessText,
  roleEditability,
} from './userRole';

describe('assignable roles', () => {
  it('offers only the three storefront roles — never the GHN-world ones', () => {
    expect(ASSIGNABLE_ROLES).toEqual(['user', 'shop', 'admin']);
    expect(ASSIGNABLE_ROLES).not.toContain('logistics_operator');
    expect(ASSIGNABLE_ROLES).not.toContain('shipping_manager');
  });

  it('sends raw role names on the wire and keeps labels for display only', () => {
    expect(assignableRoleOptions()).toEqual([
      { value: 'user', label: 'Người mua' },
      { value: 'shop', label: 'Người bán' },
      { value: 'admin', label: 'Quản trị' },
    ]);
  });

  it('narrows a select value, rejecting anything the panel must not assign', () => {
    expect(isAssignableRole('shop')).toBe(true);
    expect(isAssignableRole('logistics_operator')).toBe(false);
    expect(isAssignableRole('')).toBe(false);
  });
});

describe('roleEditability', () => {
  it('allows changing another account holding an assignable role', () => {
    expect(roleEditability({ id: 'usr_bob', roleName: 'user' }, 'usr_admin')).toEqual({
      canEdit: true,
    });
  });

  it("locks the signed-in admin's own row — the backend 400s a self change", () => {
    const result = roleEditability({ id: 'usr_admin', roleName: 'admin' }, 'usr_admin');
    expect(result.canEdit).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining('tự đổi vai trò') });
  });

  it('allows changing a different admin', () => {
    expect(roleEditability({ id: 'usr_other', roleName: 'admin' }, 'usr_admin')).toEqual({
      canEdit: true,
    });
  });

  it('locks a GHN-world role, which has no option to select', () => {
    const result = roleEditability({ id: 'usr_ghn', roleName: 'logistics_operator' }, 'usr_admin');
    expect(result.canEdit).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining('GHN') });
  });

  it('still locks the own row while the viewer is unknown only for GHN roles', () => {
    // `currentUserId` is undefined until `auth.me` resolves. No row may be
    // mistaken for "mine" then — an assignable role stays editable.
    expect(roleEditability({ id: 'usr_bob', roleName: 'user' }, undefined)).toEqual({
      canEdit: true,
    });
  });
});

describe('role-change copy', () => {
  it('asks with the label, not the raw role name the wire carries', () => {
    expect(roleChangeConfirmTitle('Bob', 'shop')).toBe('Đổi vai trò của Bob thành "Người bán"?');
  });

  it('warns about the re-login requirement before the change is made', () => {
    expect(roleChangeConfirmBody()).toContain('đăng xuất và đăng nhập lại');
  });

  it('never claims the new role is already in effect', () => {
    const text = roleChangeSuccessText('Bob', 'shop');
    expect(text).toContain('Đã đặt vai trò của Bob thành "Người bán"');
    expect(text).toContain('chỉ có hiệu lực sau khi người dùng đăng xuất và đăng nhập lại');
    expect(text).not.toContain('đã cấp quyền');
  });
});

describe('role-change copy in English (I18N-06)', () => {
  it('labels the options in the viewer language but still sends raw names', () => {
    expect(assignableRoleOptions('en')).toEqual([
      { value: 'user', label: 'Buyer' },
      { value: 'shop', label: 'Seller' },
      { value: 'admin', label: 'Admin' },
    ]);
  });

  it('explains a locked row in English', () => {
    expect(roleEditability({ id: 'usr_admin', roleName: 'admin' }, 'usr_admin', 'en')).toEqual({
      canEdit: false,
      reason: 'You cannot change your own role',
    });
    expect(roleEditability({ id: 'usr_ghn', roleName: 'shipping_manager' }, 'usr_admin', 'en')).toEqual({
      canEdit: false,
      reason: 'This is a GHN role — change it in the GHN console',
    });
  });

  it('keeps the re-login condition in every English string', () => {
    expect(roleChangeConfirmTitle('Bob', 'shop', 'en')).toBe('Change the role of Bob to "Seller"?');
    expect(roleChangeConfirmBody('en')).toContain('log out and sign in again');
    const text = roleChangeSuccessText('Bob', 'shop', 'en');
    expect(text).toContain('Set the role of Bob to "Seller"');
    expect(text).toContain('only takes effect after the user logs out and signs in again');
  });
});
