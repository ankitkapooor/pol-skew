import type { Norms } from './types';

/* Real norms are committed to data/norms/us-2024.json once built from the source microdata
   (scripts/norms). Until then the benchmark offer is hidden. In development only, ?norms=fixture
   loads clearly labelled synthetic norms so the module can be exercised. */
const REAL = import.meta.glob<Norms>('/data/norms/us-2024.json', { eager: true, import: 'default' });

export async function loadNorms(): Promise<Norms | null> {
  const real = Object.values(REAL)[0];
  if (real) return real;
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('norms') === 'fixture') {
    const mod = await import('../../data/norms/fixture-synthetic.json');
    return mod.default as unknown as Norms;
  }
  return null;
}
