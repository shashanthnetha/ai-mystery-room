/**
 * Client-side mirror of the difficulty matrix (SPEC.md §4.1).
 * The BACKEND remains the scoring/authority — these numbers are for display only.
 */
export const DIFFICULTY_INFO = {
  easy: {
    key: 'easy',
    label: 'Easy',
    blurb: 'A gentle first case — clear evidence, few shadows.',
    suspects: 3,
    clues: 5,
    hints: 2,
    base: 100,
    icon: 'search',
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    blurb: 'Red herrings and layered motives. Stay sharp.',
    suspects: 4,
    clues: 7,
    hints: 3,
    base: 150,
    icon: 'fingerprint',
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    blurb: 'A maze of lies. Only master detectives escape.',
    suspects: 5,
    clues: 9,
    hints: 3,
    base: 200,
    icon: 'skull',
  },
};

export const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

export const CLUE_BONUS = 5;
export const HINT_PENALTY = 10;
