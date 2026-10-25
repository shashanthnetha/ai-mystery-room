import { ApiError } from '../utils/errors.js';

/**
 * The single source of truth for game rules (matches SPEC.md §4).
 */
export const DIFFICULTIES = {
  easy:   { key: 'easy',   label: 'Easy',   suspects: 3, clues: 5, hints: 2, base: 100 },
  medium: { key: 'medium', label: 'Medium', suspects: 4, clues: 7, hints: 3, base: 150 },
  hard:   { key: 'hard',   label: 'Hard',   suspects: 5, clues: 9, hints: 3, base: 200 },
};

export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

export const CLUE_BONUS = 5;   // points per discovered clue
export const HINT_PENALTY = 10; // points lost per hint used

export function getDifficulty(key) {
  const cfg = DIFFICULTIES[key];
  if (!cfg) {
    throw ApiError.badRequest(`Difficulty must be one of: ${DIFFICULTY_KEYS.join(', ')}.`);
  }
  return cfg;
}

/**
 * SPEC.md §4.3 — scoring is computed ONLY here (backend).
 */
export function computeScore({ correct, difficulty, cluesDiscovered, hintsUsed }) {
  const cfg = getDifficulty(difficulty);
  const base = correct ? cfg.base : 0;
  const clueBonus = cluesDiscovered * CLUE_BONUS;
  const hintPenalty = hintsUsed * HINT_PENALTY;
  const total = Math.max(0, base + clueBonus - hintPenalty);
  return { base, clueBonus, hintPenalty: -hintPenalty, total };
}
