import { Blocks, Component, Globe, LayoutDashboard, Lightbulb, Palette, Route as RouteIcon, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { usePlatform } from '../store/store';
import { Toasts, relativeTime } from '../ui/kit';
import { href, useRoute, type Route } from './router';
import { Overview } from '../features/overview/Overview';
import { DesignSystem } from '../features/design-system/DesignSystem';
import { ComponentsPage } from '../features/components/ComponentsPage';
import { JourneysPage } from '../features/journeys/JourneysPage';
import { JourneyBuilder } from '../features/builder/JourneyBuilder';
import { InsightsPage } from '../features/insights/InsightsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SiteApp } from '../features/site/SiteApp';

const NAV: { route: Route; label: string; icon: ReactNode; match: Route['name'][]; count?: (s: ReturnType<typeof usePlatform.getState>) => number }[] = [
  { route: { name: 'overview' }, label: 'Overview', icon: <LayoutDashboard size={16} />, match: ['overview'] },
  { route: { name: 'design-system', tab: 'foundations' }, label: 'Design System', icon: <Palette size={16} />, match: ['design-system'], count: (s) => s.data.tokens.length },
  { route: { name: 'components' }, label: 'Components', icon: <Component size={16} />, match: ['components'], count: (s) => s.data.components.length },
  { route: { name: 'journeys' }, label: 'Journeys', icon: <RouteIcon size={16} />, match: ['journeys', 'journey'], count: (s) => s.data.journeys.length },
  { route: { name: 'insights' }, label: 'Use Cases & Insights', icon: <Lightbulb size={16} />, match: ['insights'], count: (s) => s.data.insights.length },
  { route: { name: 'site' }, label: 'Site rebuild', icon: <Globe size={16} />, match: ['site'] },
  { route: { name: 'settings' }, label: 'Settings', icon: <SettingsIcon size={16} />, match: ['settings'] },
];

export function App() {
  const route = useRoute();
  const state = usePlatform();
  const ws = state.data.workspace;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        usePlatform.getState().saveNow();
        usePlatform.getState().toast('Saved');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (route.name === 'site') return;
    const title: Record<Route['name'], string> = {
      site: 'Site rebuild',
      overview: 'Overview', 'design-system': 'Design System', components: 'Components', journeys: 'Journeys', journey: 'Journey builder', insights: 'Use cases and insights', settings: 'Settings',
    };
    document.title = `${title[route.name]}: Atelier`;
  }, [route.name]);

  if (route.name === 'site') return <SiteApp pageId={route.page} />;

  return (
    <>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <div className="shell">
        <aside className="rail" aria-label="Workspace">
          <div className="rail-ws">
            <span className="ws-mark" aria-hidden>{ws.name.slice(0, 1)}</span>
            <div>
              <strong>{ws.name}</strong>
              <span>Atelier workspace</span>
            </div>
          </div>
          <nav aria-label="Main">
            {NAV.map((n) => (
              <a key={n.label} className="rail-link" href={href(n.route)} aria-current={n.match.includes(route.name) ? 'page' : undefined}>
                {n.icon}
                <span>{n.label}</span>
                {n.count ? <span className="count">{n.count(state)}</span> : null}
              </a>
            ))}
          </nav>
          <div className="rail-foot" aria-live="polite">
            <Blocks size={14} aria-hidden />
            <span className="grow">
              {state.saveStatus === 'saved' ? (state.lastSavedAt ? `Saved ${relativeTime(state.lastSavedAt)}` : 'All changes saved') : state.saveStatus === 'saving' ? 'Saving' : 'Unsaved changes'}
            </span>
          </div>
        </aside>
        <main className="main" id="main" tabIndex={-1}>
          {route.name === 'overview' && <Overview />}
          {route.name === 'design-system' && <DesignSystem tab={route.tab} />}
          {route.name === 'components' && <ComponentsPage selectedId={route.id} />}
          {route.name === 'journeys' && <JourneysPage />}
          {route.name === 'journey' && <JourneyBuilder key={route.id} journeyId={route.id} focusNodeId={route.node} />}
          {route.name === 'insights' && <InsightsPage selectedId={route.id} />}
          {route.name === 'settings' && <SettingsPage />}
        </main>
      </div>
      <Toasts />
    </>
  );
}
