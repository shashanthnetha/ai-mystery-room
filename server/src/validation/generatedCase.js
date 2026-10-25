import { z } from 'zod';

/**
 * Schema for the RAW Gemini JSON output. Counts are exact per difficulty —
 * malformed or off-spec AI output never reaches the database.
 */
export function buildGeneratedCaseSchema(cfg) {
  return z
    .object({
      title: z.string().trim().min(4, 'title too short').max(90, 'title too long'),
      setting: z.string().trim().min(8, 'setting too short').max(240, 'setting too long'),
      victim: z.string().trim().min(3, 'victim too short').max(90, 'victim too long'),
      story: z.string().trim().min(650, 'story too short').max(6000, 'story too long'),
      suspects: z
        .array(
          z.object({
            name: z.string().trim().min(2).max(60),
            role: z.string().trim().min(3).max(60),
            description: z.string().trim().min(40).max(700),
            alibi: z.string().trim().min(15).max(400),
          }),
        )
        .length(cfg.suspects, `exactly ${cfg.suspects} suspects required`),
      clues: z
        .array(
          z.object({
            title: z.string().trim().min(6).max(80),
            content: z.string().trim().min(60).max(500),
          }),
        )
        .length(cfg.clues, `exactly ${cfg.clues} clues required`),
      hints: z.array(z.string().trim().min(20).max(300)).length(cfg.hints, `exactly ${cfg.hints} hints required`),
      culpritName: z.string().trim().min(2).max(60),
      solution: z.string().trim().min(450, 'solution too short').max(5000, 'solution too long'),
    })
    .strip(); // drop any stray keys Gemini may add
}

/**
 * Extra logical rules that zod cannot express (SPEC.md §8):
 *  - suspect names must be unique
 *  - culpritName must match exactly one suspect
 * Returns the validated, camel-neutral RAW data or throws ApiError-ish.
 */
export function validateGeneratedLogic(data) {
  const names = data.suspects.map((s) => s.name.toLowerCase());
  const duplicate = names.find((n, i) => names.indexOf(n) !== i);
  if (duplicate) {
    return { ok: false, reason: `Suspect names must be unique (duplicate: "${duplicate}").` };
  }

  const culpritIndex = data.suspects.findIndex(
    (s) => s.name.toLowerCase() === data.culpritName.toLowerCase(),
  );
  if (culpritIndex === -1) {
    return { ok: false, reason: 'culpritName does not match any suspect.' };
  }
  return { ok: true, culpritIndex };
}
