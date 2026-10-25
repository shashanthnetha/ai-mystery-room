import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },      // "s1".."s5" — assigned server-side
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    alibi: { type: String, default: '', trim: true },
  },
  { _id: true },
);

const clueSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },      // "c1".."c9" — assigned server-side
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true }, // SECRET until discovered
    discovered: { type: Boolean, default: false },
    discoveredAt: { type: Date, default: null },
  },
  { _id: true },
);

const hintSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },      // "h1".."h3" — assigned server-side
    text: { type: String, required: true, trim: true },    // SECRET until used
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { _id: true },
);

const breakdownSchema = new mongoose.Schema(
  {
    base: Number,
    clueBonus: Number,
    hintPenalty: Number,
    total: Number,
  },
  { _id: false },
);

const caseSchema = new mongoose.Schema(
  {
    premise: { type: String, required: true, trim: true },
    difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },

    // Generated mystery
    title: { type: String, required: true, trim: true },
    setting: { type: String, required: true, trim: true },
    victim: { type: String, required: true, trim: true },
    story: { type: String, required: true, trim: true },
    suspects: { type: [suspectSchema], default: [] },
    clues: { type: [clueSchema], default: [] },
    hints: { type: [hintSchema], default: [] },

    // ───────────────────────── PRIVATE (never serialized publicly) ─────────┐
    culpritId: { type: String, required: true, select: false }, // "s3" etc.
    solution:  { type: String, required: true, select: false }, // full explanation
    correct:   { type: Boolean, default: null, select: false },
    score:     { type: Number,  default: null, select: false },
    breakdown: { type: breakdownSchema, default: null, select: false },
    // ──────────────────────────────────────────────────────────────────────-┘

    // Player state
    completed:  { type: Boolean, default: false },
    accusedId:  { type: String, default: null },   // public-safe once accused
    accusedName:{ type: String, default: null },
  },
  { timestamps: true },
);

caseSchema.index({ createdAt: -1 });

/**
 * `select: false` is defense-in-depth: even a careless query without an
 * explicit projection will not leak the culprit, solution or score.
 * All API responses must still go through utils/publicCase.js serializers.
 */
export const Case = mongoose.model('Case', caseSchema);
