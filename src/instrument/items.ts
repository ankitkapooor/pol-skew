/* ---------- Item bank ----------
   Ideology and short scales are built from matched pairs: two statements on the same topic,
   worded with equal strength, pointing to opposite poles. dir = +1 means agreeing moves toward the
   scale's "+" pole (right / traditional / order-and-authority / growth-first / national / populist).

   Any change to wording, keying or scoring constants changes the instrument hash: run
   `npm run version:gen` and bump INSTRUMENT_SEMVER in ./version.ts. */

export type ScaleDim = 'econ' | 'social' | 'auth' | 'climate' | 'global' | 'populism';
export type Foundation = 'care' | 'equality' | 'proportionality' | 'loyalty' | 'authority' | 'purity';

export interface PairedItem {
  id: string;
  pair: string;
  dim: ScaleDim;
  dir: 1 | -1;
  text: string;
}
export interface MFItem {
  id: string;
  dim: 'mf';
  f: Foundation;
  text: string;
}
export type BankItem = PairedItem | MFItem;
export interface SpecialItem {
  id: 'AC' | 'IF' | 'SP';
  type: 'attn' | 'infreq' | 'self';
  text: string;
}
export type AnyItem = BankItem | SpecialItem;

const P = (pair: string, dim: ScaleDim, R: string, L: string): PairedItem[] => [
  { id: pair + 'a', pair, dim, dir: 1, text: R },
  { id: pair + 'b', pair, dim, dir: -1, text: L },
];

export const ITEMS: readonly BankItem[] = [
  // Economic
  ...P(
    'E1',
    'econ',
    'Taxes on high earners and businesses should be kept low, even if that means fewer public services.',
    'Taxes on high earners and businesses should be raised to pay for more public services.',
  ),
  ...P(
    'E2',
    'econ',
    'Businesses should be free to operate with few government rules.',
    'Businesses should operate under strict government rules that protect the public.',
  ),
  ...P(
    'E3',
    'econ',
    'People should mainly pay for their own healthcare, through work or private insurance.',
    'Healthcare should be provided to everyone and paid for through taxes.',
  ),
  ...P(
    'E4',
    'econ',
    'Wages and working hours should be left to employers and workers to agree, with little government involvement.',
    'The government should set a minimum wage high enough for a full-time worker to live on.',
  ),
  ...P(
    'E5',
    'econ',
    'Utilities such as electricity and water are best run by private companies.',
    'Utilities such as electricity and water are best run by the government.',
  ),
  ...P(
    'E6',
    'econ',
    'Government support for people who are out of work should be kept modest.',
    'Government support for people who are out of work should be generous.',
  ),
  // Social / cultural
  ...P(
    'S1',
    'social',
    'Society is better off when people stick to long-standing traditions.',
    'Society is better off when people feel free to break with tradition.',
  ),
  ...P(
    'S2',
    'social',
    'Religious teachings should guide a country’s laws.',
    'A country’s laws should be kept separate from religious teachings.',
  ),
  ...P(
    'S3',
    'social',
    'Marriage should be only between a man and a woman.',
    'Same-sex couples should have the same right to marry as opposite-sex couples.',
  ),
  ...P(
    'S4',
    'social',
    'Abortion should be illegal in all or most cases.',
    'Abortion should be legal in all or most cases.',
  ),
  ...P(
    'S5',
    'social',
    'People who move to a country should adopt its customs and way of life.',
    'People who move to a country should be free to keep their own customs and way of life.',
  ),
  ...P(
    'S6',
    'social',
    'A person’s legal sex should always be the sex recorded at birth.',
    'People should be able to change their legal sex to match their gender identity.',
  ),
  // State authority vs civil liberty
  ...P(
    'A1',
    'auth',
    'In a national emergency, the head of government should be able to act without approval from courts or the legislature.',
    'Even in a national emergency, courts and the legislature should be able to overrule the head of government.',
  ),
  ...P(
    'A2',
    'auth',
    'The government should be able to ban speech that most people find deeply offensive.',
    'Speech that most people find deeply offensive should still be legal.',
  ),
  ...P(
    'A3',
    'auth',
    'Government monitoring of private communications is acceptable when it helps prevent terrorism.',
    'The government should not monitor anyone’s private communications without a court warrant.',
  ),
  ...P(
    'A4',
    'auth',
    'Police should have broad powers to break up protests that disrupt public life.',
    'Peaceful protests should be allowed even when they disrupt public life.',
  ),
  ...P(
    'A5',
    'auth',
    'People who commit crimes should receive harsher punishments than they do now.',
    'The justice system should focus more on rehabilitation than on punishment.',
  ),
  ...P(
    'A6',
    'auth',
    'The government should restrict activities that are mainly dangerous to the people who choose them.',
    'Adults should be free to take risks that mainly affect themselves.',
  ),
  // Short scales
  ...P(
    'C1',
    'climate',
    'Keeping energy cheap matters more than moving quickly away from fossil fuels.',
    'Moving quickly away from fossil fuels matters more than keeping energy cheap.',
  ),
  ...P(
    'C2',
    'climate',
    'Climate policy should rely mainly on voluntary action by businesses and individuals.',
    'Climate policy should rely mainly on binding government limits on emissions.',
  ),
  ...P(
    'G1',
    'global',
    'Imports should be limited to protect jobs in domestic industries.',
    'Trade between countries should be as free as possible.',
  ),
  ...P(
    'G2',
    'global',
    'A country should act on its own interests, even when allies and international bodies disagree.',
    'A country should work through international agreements, even when that limits its choices.',
  ),
  ...P(
    'Q1',
    'populism',
    'Ordinary citizens, not politicians or experts, should make the most important political decisions.',
    'The most important political decisions are best left to elected representatives and experts.',
  ),
  ...P(
    'Q2',
    'populism',
    'Politicians mostly serve the interests of a powerful elite.',
    'Most politicians genuinely try to serve the public.',
  ),
  // Moral foundations (six MFQ-2 constructs, original wording, 3 items each)
  {
    id: 'M1',
    dim: 'mf',
    f: 'care',
    text: 'It is important to comfort people who are going through a hard time.',
  },
  {
    id: 'M2',
    dim: 'mf',
    f: 'care',
    text: 'Causing someone to suffer is one of the worst things a person can do.',
  },
  { id: 'M3', dim: 'mf', f: 'care', text: 'We should look out for those who cannot protect themselves.' },
  {
    id: 'M4',
    dim: 'mf',
    f: 'equality',
    text: 'The world would be better if wealth were shared more equally.',
  },
  {
    id: 'M5',
    dim: 'mf',
    f: 'equality',
    text: 'A society is fairer when the gap between rich and poor is small.',
  },
  {
    id: 'M6',
    dim: 'mf',
    f: 'equality',
    text: 'Everyone should have a similar standard of living, whatever their background.',
  },
  {
    id: 'M7',
    dim: 'mf',
    f: 'proportionality',
    text: 'People should be rewarded in proportion to what they contribute.',
  },
  {
    id: 'M8',
    dim: 'mf',
    f: 'proportionality',
    text: 'It is fair that people who work harder end up with more.',
  },
  {
    id: 'M9',
    dim: 'mf',
    f: 'proportionality',
    text: 'People who make no effort should not receive the same as those who do.',
  },
  {
    id: 'M10',
    dim: 'mf',
    f: 'loyalty',
    text: 'People should stand by their community or country even when it makes mistakes.',
  },
  {
    id: 'M11',
    dim: 'mf',
    f: 'loyalty',
    text: 'Betraying your group is one of the worst things a person can do.',
  },
  {
    id: 'M12',
    dim: 'mf',
    f: 'loyalty',
    text: 'It is important to be a loyal member of the groups you belong to.',
  },
  {
    id: 'M13',
    dim: 'mf',
    f: 'authority',
    text: 'Respecting legitimate authority is necessary for society to function.',
  },
  {
    id: 'M14',
    dim: 'mf',
    f: 'authority',
    text: 'Traditions passed down by elders deserve respect, even when their purpose isn’t clear.',
  },
  {
    id: 'M15',
    dim: 'mf',
    f: 'authority',
    text: 'Children should be taught to respect their elders and the people in charge.',
  },
  {
    id: 'M16',
    dim: 'mf',
    f: 'purity',
    text: 'Some acts are wrong because they are degrading, even if no one is harmed.',
  },
  {
    id: 'M17',
    dim: 'mf',
    f: 'purity',
    text: 'People should keep their bodies and minds free of corrupting influences.',
  },
  {
    id: 'M18',
    dim: 'mf',
    f: 'purity',
    text: 'Some things are sacred and should not be mocked or treated lightly.',
  },
];

export const ATTN: SpecialItem = {
  id: 'AC',
  type: 'attn',
  text: 'To show you’re reading each statement, choose “Somewhat disagree” for this one.',
};
export const INFREQ: SpecialItem = {
  id: 'IF',
  type: 'infreq',
  text: 'I have never used a phone or a computer.',
};
export const SELF: SpecialItem = {
  id: 'SP',
  type: 'self',
  text: 'Overall, how would you describe your political views?',
};
export const SPECIAL: Readonly<Record<SpecialItem['id'], SpecialItem>> = { AC: ATTN, IF: INFREQ, SP: SELF };

export const LIKERT = [
  'Strongly disagree',
  'Somewhat disagree',
  'Neither agree nor disagree',
  'Somewhat agree',
  'Strongly agree',
] as const;
export const SELF_OPTS = [
  'Very left / liberal',
  'Left / liberal',
  'Slightly left',
  'Centre / moderate',
  'Slightly right',
  'Right / conservative',
  'Very right / conservative',
] as const;
export const MF_NAMES: Readonly<Record<Foundation, string>> = {
  care: 'Care',
  equality: 'Equality',
  proportionality: 'Proportionality',
  loyalty: 'Loyalty',
  authority: 'Authority',
  purity: 'Purity',
};
export const FOUNDATIONS = Object.keys(MF_NAMES) as Foundation[];

export interface DimInfo {
  name: string;
  neg: string;
  pos: string;
  negW: string;
  posW: string;
}
export const DIMS: Readonly<Record<ScaleDim, DimInfo>> = {
  econ: {
    name: 'Economic',
    neg: 'Left: redistribution, public provision',
    pos: 'Right: markets, lower taxes',
    negW: 'left',
    posW: 'right',
  },
  social: {
    name: 'Social & cultural',
    neg: 'Progressive: change, pluralism',
    pos: 'Traditional: custom, religion',
    negW: 'progressive',
    posW: 'traditional',
  },
  auth: {
    name: 'State authority',
    neg: 'Civil-libertarian: limits on state power',
    pos: 'Order & authority: strong state',
    negW: 'civil-libertarian',
    posW: 'order-and-authority',
  },
  climate: {
    name: 'Climate & energy',
    neg: 'Climate action first',
    pos: 'Cost and growth first',
    negW: 'climate-first',
    posW: 'cost-first',
  },
  global: {
    name: 'Trade & sovereignty',
    neg: 'Open, internationalist',
    pos: 'National, protectionist',
    negW: 'internationalist',
    posW: 'national-first',
  },
  populism: {
    name: 'Populism',
    neg: 'Trusts representatives & experts',
    pos: 'People versus the elite',
    negW: 'pluralist',
    posW: 'populist',
  },
};
export const CORE: readonly ScaleDim[] = ['econ', 'social', 'auth'];
export const SHORT: readonly ScaleDim[] = ['climate', 'global', 'populism'];
export const ALL_SCALES: readonly ScaleDim[] = [...CORE, ...SHORT];

export const isPaired = (i: AnyItem): i is PairedItem => 'pair' in i;
export const isMF = (i: AnyItem): i is MFItem => 'f' in i;
export const isSpecial = (i: AnyItem): i is SpecialItem => 'type' in i;

const BY_ID: ReadonlyMap<string, AnyItem> = new Map<string, AnyItem>([
  ...ITEMS.map((i) => [i.id, i] as const),
  ...Object.values(SPECIAL).map((i) => [i.id, i] as const),
]);
export const byId = (id: string): AnyItem => {
  const it = BY_ID.get(id);
  if (!it) throw new Error(`Unknown item id: ${id}`);
  return it;
};
export const ALL_IDS: readonly string[] = [...BY_ID.keys()];
export const wordCount = (t: string): number => t.trim().split(/\s+/).length;

/** Highest valid answer code for an item (7 for self-placement, 5 otherwise). */
export const maxAnswer = (it: AnyItem): number => (isSpecial(it) && it.type === 'self' ? 7 : 5);
/** Whether "No opinion" (0) is allowed for an item. */
export const allowsNoOpinion = (it: AnyItem): boolean => !isSpecial(it);
