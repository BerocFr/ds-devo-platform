import type { DesignToken } from './types';

const REF = /^\{([^}]+)\}$/;

export function isReference(value: string): boolean {
  return REF.test(value.trim());
}

/** Resolve a token value, following `{name}` references. Returns null on a broken or circular chain. */
export function resolveToken(name: string, tokens: DesignToken[], seen: Set<string> = new Set()): string | null {
  const token = tokens.find((t) => t.name === name);
  if (!token || seen.has(name)) return null;
  const m = token.value.trim().match(REF);
  if (!m) return token.value;
  seen.add(name);
  return resolveToken(m[1], tokens, seen);
}

/** Name of the token that a reference points at, or null. */
export function referenceTarget(token: DesignToken): string | null {
  const m = token.value.trim().match(REF);
  return m ? m[1] : null;
}

export function cssVarName(tokenName: string): string {
  return `--ds-${tokenName.replace(/\./g, '-')}`;
}

/** CSS custom properties for every token that resolves. Used to theme previews with the workspace DS. */
export function tokensToCssVars(tokens: DesignToken[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const t of tokens) {
    const v = resolveToken(t.name, tokens);
    if (v != null) vars[cssVarName(t.name)] = v;
  }
  return vars;
}

/** Tokens that reference this one (direct dependents). */
export function dependents(name: string, tokens: DesignToken[]): DesignToken[] {
  return tokens.filter((t) => referenceTarget(t) === name);
}

// WCAG 2.x relative luminance and contrast ratio, for hex colors.
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export function luminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la == null || lb == null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastGrade = 'AAA' | 'AA' | 'AA large' | 'Fail';

export function contrastGrade(ratio: number): ContrastGrade {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA large';
  return 'Fail';
}

export function isValidTokenValue(type: DesignToken['type'], value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (isReference(v)) return true;
  switch (type) {
    case 'color':
      return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) || /^rgba?\(/i.test(v);
    case 'duration':
      return /^\d+(\.\d+)?(ms|s)$/.test(v);
    case 'fontWeight':
      return /^[1-9]00$/.test(v);
    case 'dimension':
    case 'radius':
    case 'fontSize':
      return /^-?\d+(\.\d+)?(px|rem|em|%)$/.test(v) || v === '0';
    default:
      return true;
  }
}
