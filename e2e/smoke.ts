import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { currentUserId, firstPostId, firstProductId, listOrders, ownProductId } from './api';
import { FORBIDDEN, ROUTES, SIGNED_OUT_GUARDED, type RouteEntry, type RouteParam, type SmokeRole } from './routes';

// Shared route smoke: for each route in the manifest a role owns, open it and
// require (1) the page renders, (2) no uncaught error / console.error, (3) no
// 5xx from /api (nor 401/403 when signed in), (4) no redirect off the requested path — a
// wrong-role bounce or a dead session both show up as (4).

// ApiErrorState titles (components/shared/ApiErrorState.tsx). Any of these on a
// route that should work means the page rendered its error branch.
const ERROR_TITLES = [
  'Máy chủ gặp sự cố',
  'Máy chủ phản hồi lỗi',
  'Hệ thống đang bảo trì',
  'Mất kết nối mạng',
  'Bạn không có quyền truy cập',
  'Không tìm thấy nội dung',
  'Phiên đăng nhập đã hết hạn',
  'Đã xảy ra lỗi',
];

const RESOLVERS: Record<RouteParam, (request: APIRequestContext) => Promise<string | null>> = {
  me: currentUserId,
  post: firstPostId,
  product: firstProductId,
  ownProduct: ownProductId,
  order: async (request) => (await listOrders(request))[0]?.id ?? null,
};

async function resolvePath(route: RouteEntry, request: APIRequestContext): Promise<string | null> {
  if (route.param === undefined) return route.pattern;
  const id = await RESOLVERS[route.param](request);
  return id === null ? null : route.pattern.replace(':id', encodeURIComponent(id));
}

/** Starts recording everything that counts as "the page is broken". */
function watchProblems(page: Page, role: SmokeRole): string[] {
  const problems: string[] = [];
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    // 4xx resource noise is judged by the response listener below, not here.
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
      problems.push(`console.error: ${msg.text().slice(0, 300)}`);
    }
  });
  page.on('response', (res) => {
    const url = new URL(res.url());
    if (!url.pathname.startsWith('/api/')) return;
    const status = res.status();
    // Signed out, the session probe (`/user/me`) answering 401 is the design.
    const authError = role !== 'public' && (status === 401 || status === 403);
    if (status >= 500 || authError) {
      problems.push(`${status} ${res.request().method()} ${url.pathname}${url.search}`);
    }
  });
  return problems;
}

async function settle(page: Page): Promise<void> {
  // socket.io can keep the network busy forever — networkidle is best-effort.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}

export function defineRouteSmoke(role: SmokeRole): void {
  test.describe(`smoke · ${role}`, () => {
    for (const route of ROUTES.filter((r) => r.roles.includes(role))) {
      test(`${route.pattern} renders clean`, async ({ page, request }) => {
        const path = await resolvePath(route, request);
        test.skip(path === null, `no "${route.param}" fixture for ${role} — seed one`);
        if (path === null) return;

        const problems = watchProblems(page, role);
        await page.goto(path);
        await settle(page);

        expect(new URL(page.url()).pathname, 'redirected off the route').toBe(path);
        await expect(page.locator('#root')).not.toBeEmpty();
        for (const title of ERROR_TITLES) {
          await expect(page.getByText(title, { exact: true }), `error state "${title}"`).toHaveCount(0);
        }
        expect(problems).toEqual([]);
      });
    }

    const forbidden = role === 'public' ? [] : FORBIDDEN[role];
    for (const path of forbidden) {
      test(`${path} is gated for ${role}`, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
      });
    }

    // Positive control: proves ERROR_TITLES still matches what ApiErrorState
    // renders. If this fails, every "no error state" check above is vacuous.
    if (role === 'buyer') {
      test('an unknown path renders the 404 state', async ({ page }) => {
        await page.goto('/khong-ton-tai-e2e');
        await expect(page.getByText('Không tìm thấy nội dung', { exact: true })).toBeVisible();
      });
    }

    if (role === 'public') {
      for (const path of SIGNED_OUT_GUARDED) {
        test(`${path} sends a signed-out visitor to /login`, async ({ page }) => {
          await page.goto(path);
          await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
        });
      }
    }
  });
}
