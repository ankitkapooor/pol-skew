import { DIMS, LIKERT, MF_NAMES, isMF, isSpecial, type AnyItem } from '../instrument/items';

export const answerLabel = (a: number | undefined): string =>
  a === undefined ? '—' : a === 0 ? 'No opinion' : LIKERT[a - 1];

/** What agreeing with an item points to: a pole word, a foundation, or "Check". */
export const poleName = (it: AnyItem): string =>
  isSpecial(it) ? 'Check' : isMF(it) ? MF_NAMES[it.f] : it.dir > 0 ? DIMS[it.dim].posW : DIMS[it.dim].negW;
