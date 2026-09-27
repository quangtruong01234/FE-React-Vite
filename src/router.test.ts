import { describe, expect, it } from 'vitest';
import type { RouteObject } from 'react-router-dom';
import { router } from '@/router';
import { ROUTES } from '../e2e/routes';

// Every leaf route must have a row in the e2e route manifest, so the smoke specs
// open it. Adding a route without one fails here, not silently in coverage.
function leafPaths(routes: RouteObject[], parent = ''): string[] {
  return routes.flatMap((route) => {
    if (route.path === undefined || route.path === '*') return [];
    const full = route.path.startsWith('/')
      ? route.path
      : `${parent.replace(/\/$/, '')}/${route.path}`;
    return route.children ? leafPaths(route.children, full) : [full];
  });
}

describe('router ↔ e2e route manifest', () => {
  const routerPaths = leafPaths(router.routes);
  const manifestPaths = ROUTES.map((r) => r.pattern);

  it('lists every router path in e2e/routes.ts', () => {
    expect(routerPaths.filter((p) => !manifestPaths.includes(p))).toEqual([]);
  });

  it('lists no path the router no longer has', () => {
    expect(manifestPaths.filter((p) => !routerPaths.includes(p))).toEqual([]);
  });

  it('gives every route at least one smoke role', () => {
    expect(ROUTES.filter((r) => r.roles.length === 0).map((r) => r.pattern)).toEqual([]);
  });
});
