import { useEffect, useState } from 'react';

// Hash router: works when the app is served as a single static file (artifact, file://, CDN).

export type Route =
  | { name: 'overview' }
  | { name: 'design-system'; tab: string }
  | { name: 'components'; id?: string }
  | { name: 'journeys' }
  | { name: 'journey'; id: string; node?: string }
  | { name: 'insights'; id?: string }
  | { name: 'settings' };

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const q = new URLSearchParams(query);
  switch (parts[0]) {
    case 'design-system':
      return { name: 'design-system', tab: parts[1] ?? 'foundations' };
    case 'components':
      return { name: 'components', id: parts[1] };
    case 'journeys':
      return parts[1] ? { name: 'journey', id: parts[1], node: q.get('node') ?? undefined } : { name: 'journeys' };
    case 'insights':
      return { name: 'insights', id: parts[1] };
    case 'settings':
      return { name: 'settings' };
    default:
      return { name: 'overview' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'overview':
      return '#/overview';
    case 'design-system':
      return `#/design-system/${r.tab}`;
    case 'components':
      return r.id ? `#/components/${r.id}` : '#/components';
    case 'journeys':
      return '#/journeys';
    case 'journey':
      return `#/journeys/${r.id}${r.node ? `?node=${r.node}` : ''}`;
    case 'insights':
      return r.id ? `#/insights/${r.id}` : '#/insights';
    case 'settings':
      return '#/settings';
  }
}

export function navigate(r: Route) {
  window.location.hash = href(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
