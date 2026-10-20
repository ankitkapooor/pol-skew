/** Item id → answer. 1–5 Likert (1–7 for SP), 0 = No opinion. Unanswered items are absent. */
export type Answers = Readonly<Record<string, number>>;
/** Item id → milliseconds from render to first answer. */
export type Times = Readonly<Record<string, number>>;
/** Item id → word count of the statement as shown. */
export type Words = Readonly<Record<string, number>>;
