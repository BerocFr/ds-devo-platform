// Access to the host's "ask Claude" capability when the platform runs inside a Claude artifact
// viewer. Everywhere else (local dev, tests, a static copy) it resolves null and the built-in
// rules planner is used.

type SampleJson = <T = unknown>(input: string, opts?: { modelTier?: 'quick' | 'default' | 'complex'; signal?: AbortSignal; onText?: (u: { text: string }) => void; cache?: boolean }) => Promise<T>;
export interface SampleFn {
  json: SampleJson;
}

let pending: Promise<SampleFn | null> | null = null;

export function getSample(): Promise<SampleFn | null> {
  if (pending) return pending;
  const w = window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } };
  if (!w.claude?.use) {
    pending = Promise.resolve(null);
    return pending;
  }
  pending = w.claude
    .use('sample')
    .then((s) => (s && typeof (s as SampleFn).json === 'function' ? (s as SampleFn) : null))
    .catch(() => null);
  return pending;
}

export function sampleErrorText(e: unknown): string {
  const code = (e as { code?: string })?.code;
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'capability_disabled':
      return 'Claude is not available here, so the built-in rules drafted the journey instead.';
    case 'rate_limited':
      return 'Too many requests to Claude right now. The built-in rules drafted the journey; try Claude again in a minute.';
    case 'invalid_json':
      return 'Claude’s answer could not be read as a journey. The built-in rules drafted it instead; you can try Claude again.';
    case 'cancelled':
      return 'Stopped.';
    default:
      return 'Claude could not draft this journey. The built-in rules drafted it instead.';
  }
}
