export const mean = (a: readonly number[]): number => a.reduce((x, y) => x + y, 0) / a.length;

/** Sample standard deviation (n − 1); 0 for fewer than two values. */
export const sd = (a: readonly number[]): number => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1));
};

/** A substantive Likert answer (1–5). 0 = No opinion, undefined = unanswered. */
export const valid = (v: number | undefined): v is number => v !== undefined && v >= 1 && v <= 5;
