import { useMemo } from 'react';
import { validateJourney, type ValidationReport } from '../domain/validation';
import type { Journey } from '../domain/types';
import { usePlatform } from '../store/store';

export function useValidation(journey: Journey | undefined): ValidationReport | null {
  const components = usePlatform((s) => s.data.components);
  const tokens = usePlatform((s) => s.data.tokens);
  return useMemo(() => (journey ? validateJourney(journey, components, tokens) : null), [journey, components, tokens]);
}
