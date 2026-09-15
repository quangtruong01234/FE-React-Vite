import { describe, expect, it } from 'vitest';
import { roleLabel, roleStaleNotice } from './roleLabels';

describe('roleLabel', () => {
  it('renders a Vietnamese label for every role the backend knows', () => {
    expect(roleLabel('user')).toBe('Người mua');
    expect(roleLabel('shop')).toBe('Người bán');
    expect(roleLabel('admin')).toBe('Quản trị');
    expect(roleLabel('logistics_operator')).toBe('Vận hành GHN');
    expect(roleLabel('shipping_manager')).toBe('Quản lý vận chuyển');
  });

  it('falls back to the raw name so a role added backend-side still renders', () => {
    expect(roleLabel('warehouse_clerk')).toBe('warehouse_clerk');
  });
});

describe('roleStaleNotice', () => {
  it('names both roles on a promotion — the new powers are not active yet', () => {
    const notice = roleStaleNotice('shop', 'user');

    expect(notice).toContain('"Người bán"');
    expect(notice).toContain('"Người mua"');
    expect(notice).toContain('đăng nhập lại');
  });

  it('names both roles on a demotion — the session still holds the old powers', () => {
    const notice = roleStaleNotice('user', 'shop');

    expect(notice).toContain('vừa được đổi thành "Người mua"');
    expect(notice).toContain('quyền "Người bán"');
  });

  it('never claims the change is already in effect', () => {
    const notice = roleStaleNotice('shop', 'user');

    expect(notice).not.toContain('đã có hiệu lực');
    expect(notice).not.toContain('đã cấp quyền');
  });

  it('renders raw names for a role the frontend has no label for', () => {
    expect(roleStaleNotice('warehouse_clerk', 'user')).toContain('"warehouse_clerk"');
  });
});
