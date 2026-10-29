import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSeed } from '../data/seed';
import { MemoryRepository } from '../store/repository';
import { setRepository, usePlatform } from '../store/store';
import { App } from './App';

beforeEach(() => {
  setRepository(new MemoryRepository());
  usePlatform.setState({ data: createSeed(), history: {}, toasts: [] });
});

describe('App shell', () => {
  it('renders the overview chain and main navigation', () => {
    window.location.hash = '#/overview';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'From brand to experience' })).toBeInTheDocument();
    for (const name of ['Overview', 'Design System', 'Components', 'Journeys', 'Use Cases & Insights', 'Settings']) {
      expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
  });

  it('renders the component library with benchmark entries', () => {
    window.location.hash = '#/components/cmp-case-card';
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Case study card' })).toBeInTheDocument();
    expect(screen.getAllByText('From benchmark').length).toBeGreaterThan(0);
  });
});
