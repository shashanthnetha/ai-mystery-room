import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Types } from 'mongoose';

import { Case } from '../models/Case.js';
import { computeScore } from '../config/difficulty.js';
import { generateMystery, buildCaseDocument } from '../services/gemini.js';
import { generateCaseSchema, accuseCaseSchema, parseOr400 } from '../validation/requests.js';
import { ApiError } from '../utils/errors.js';
import { toPublicCase, toPublicResult } from '../utils/publicCase.js';

const router = Router();

const PRIVATE_PROJECTION = '+culpritId +solution +correct +score +breakdown';

/** SPEC.md §7.2 — generation is the only costed endpoint; guard Gemini quota. */
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many mysteries in a short time, detective — the oracle needs a rest. Try again in about 15 minutes.',
  },
});

function getObjectIdOr404(id) {
  if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('This case does not exist.');
  return new Types.ObjectId(id);
}

async function getCaseOr404(id, { withPrivate = false } = {}) {
  const query = Case.findById(getObjectIdOr404(id));
  const doc = withPrivate ? await query.select(PRIVATE_PROJECTION) : await query;
  if (!doc) throw ApiError.notFound('This case does not exist.');
  return doc;
}

function progressOf(c) {
  const cluesDiscovered = (c.clues || []).filter((cl) => cl.discovered).length;
  const hintsUsed = (c.hints || []).filter((h) => h.used).length;
  return { cluesDiscovered, cluesTotal: (c.clues || []).length, hintsUsed, hintsTotal: (c.hints || []).length };
}

/* ───────────────────────────── POST /api/cases ───────────────────────────── */

router.post('/', generateLimiter, async (req, res) => {
  const { premise, difficulty } = parseOr400(
    generateCaseSchema,
    req.body ?? {},
  );

  const { data, culpritIndex } = await generateMystery(premise, difficulty);
  const doc = await Case.create(buildCaseDocument(data, culpritIndex, { premise, difficulty }));

  res.status(201).json({ success: true, case: toPublicCase(doc) });
});

/* ───────────────────────────── GET /api/cases/:id ────────────────────────── */

router.get('/:id', async (req, res) => {
  const doc = await getCaseOr404(req.params.id);
  res.json({ success: true, case: toPublicCase(doc) });
});

/* ── POST /api/cases/:id/clues/:clueId/discover ───────────────────────────── */

router.post('/:id/clues/:clueId/discover', async (req, res) => {
  const doc = await getCaseOr404(req.params.id);
  if (doc.completed) throw ApiError.conflict('This case is already closed, detective.');

  const clue = doc.clues.find((cl) => cl.id === req.params.clueId);
  if (!clue) throw ApiError.notFound('No such clue in this case.');

  let alreadyDiscovered = false;
  if (clue.discovered) {
    alreadyDiscovered = true;
  } else {
    clue.discovered = true;
    clue.discoveredAt = new Date();
    await doc.save();
  }

  res.json({
    success: true,
    alreadyDiscovered,
    clue: {
      id: clue.id,
      title: clue.title,
      content: clue.content,
      discovered: true,
      discoveredAt: clue.discoveredAt,
    },
    progress: progressOf(doc),
  });
});

/* ── POST /api/cases/:id/hints ────────────────────────────────────────────── */

router.post('/:id/hints', async (req, res) => {
  const doc = await getCaseOr404(req.params.id);
  if (doc.completed) throw ApiError.conflict('This case is already closed, detective.');

  const next = doc.hints.find((h) => !h.used); // stored order = difficulty order
  if (!next) {
    throw ApiError.conflict('You have used every hint this mystery offers. Follow your instincts now.');
  }

  next.used = true;
  next.usedAt = new Date();
  await doc.save();

  res.json({
    success: true,
    hint: { id: next.id, text: next.text, used: true },
    progress: progressOf(doc),
  });
});

/* ── POST /api/cases/:id/accuse ───────────────────────────────────────────── */

router.post('/:id/accuse', async (req, res) => {
  const { suspectId } = parseOr400(accuseCaseSchema, req.body ?? {});

  const doc = await getCaseOr404(req.params.id, { withPrivate: true });

  // Idempotent-safe: a completed case returns its stored result, never re-scores.
  if (doc.completed) {
    return res.json({ success: true, alreadyCompleted: true, result: toPublicResult(doc) });
  }

  const accused = doc.suspects.find((s) => s.id === suspectId);
  if (!accused) throw ApiError.badRequest('That suspect is not part of this case.');

  const correct = accused.id === doc.culpritId;
  const { cluesDiscovered, hintsUsed } = progressOf(doc);
  const breakdown = computeScore({ correct, difficulty: doc.difficulty, cluesDiscovered, hintsUsed });

  doc.completed = true;
  doc.accusedId = accused.id;
  doc.accusedName = accused.name;
  doc.correct = correct;
  doc.score = breakdown.total;
  doc.breakdown = breakdown;
  await doc.save();

  res.json({ success: true, alreadyCompleted: false, result: toPublicResult(doc) });
});

/* ── GET /api/cases/:id/result ────────────────────────────────────────────── */

router.get('/:id/result', async (req, res) => {
  const doc = await getCaseOr404(req.params.id, { withPrivate: true });

  if (!doc.completed) {
    throw ApiError.conflict('Case not solved yet.');
  }
  res.json({ success: true, result: toPublicResult(doc) });
});

export default router;
