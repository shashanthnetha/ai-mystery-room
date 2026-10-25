import { z } from 'zod';
import { DIFFICULTY_KEYS } from '../config/difficulty.js';
import { ApiError } from '../utils/errors.js';

/** POST /api/cases request body. */
export const generateCaseSchema = z.object({
  premise: z
    .string()
    .trim()
    .min(10, 'Give the oracle at least 10 characters to work with.')
    .max(400, 'Keep the premise under 400 characters — short premises make sharper mysteries.'),
  difficulty: z.enum(DIFFICULTY_KEYS),
});

/** POST /api/cases/:id/accuse request body. */
export const accuseCaseSchema = z.object({
  suspectId: z
    .string()
    .trim()
    .regex(/^s\d+$/, 'suspectId must be the id of a suspect (e.g. "s1").'),
});

/** Turn a ZodError into the API's error envelope. */
export function zodIssues(zodError) {
  return zodError.issues.map((issue) => ({
    field: issue.path.join('.') || '_',
    message: issue.message,
  }));
}

/** Parse request input; on failure throw 400 with per-field messages. */
export function parseOr400(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = zodIssues(result.error);
    throw ApiError.badRequest('Invalid request.', issues);
  }
  return result.data;
}
