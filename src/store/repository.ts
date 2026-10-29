import type { PlatformData } from '../domain/types';

/**
 * Persistence boundary. The app only talks to this interface, so a server-backed
 * implementation (REST, GraphQL, or a design-token pipeline) can replace the local one
 * without touching the UI or the store.
 */
export interface PlatformRepository {
  load(): PlatformData | null;
  save(data: PlatformData): void;
  clear(): void;
}

const KEY = 'atelier.platform.v1';

export class LocalStorageRepository implements PlatformRepository {
  constructor(private readonly key: string = KEY) {}

  load(): PlatformData | null {
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PlatformData;
      return parsed && parsed.workspace && Array.isArray(parsed.journeys) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(data: PlatformData): void {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // Storage can be full or blocked (private mode). The session keeps working in memory.
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

export class MemoryRepository implements PlatformRepository {
  private data: PlatformData | null = null;
  load() {
    return this.data ? structuredClone(this.data) : null;
  }
  save(d: PlatformData) {
    this.data = structuredClone(d);
  }
  clear() {
    this.data = null;
  }
}
