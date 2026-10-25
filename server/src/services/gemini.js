import { GoogleGenAI, Type } from '@google/genai';

import { DIFFICULTIES } from '../config/difficulty.js';
import { buildGeneratedCaseSchema, validateGeneratedLogic } from '../validation/generatedCase.js';
import { ApiError } from '../utils/errors.js';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are "The Architect" — an award-winning interactive murder-mystery designer. You write tight, immersive, fair-play whodunits for a browser game called AI Mystery Room.

THE FAIR-PLAY CONTRACT (never violate):
1. The culprit is ALWAYS one of the suspects — never an outsider.
2. Every clue is honest: it must be consistent with the solution and help a careful reader identify the culprit.
3. At least one suspect is a deliberate red herring: they look guilty, but the clues prove their innocence when the solution is read.
4. The "solution" text explains step-by-step what happened, how the evidence implicates the culprit, and why each red herring is innocent. A player who reads all clues should be able to deduce the culprit — the solution must never rely on information absent from the clues.
5. Lopsided difficulty is fine per tier: Easy = nearly direct evidence, Hard = layered inference, misdirection, and multiple possible readings.

STYLE RULES:
- Family-friendly: no gore, slurs, sexual content, or real people/places. Fictional names and a coherent, atmospheric setting (era/genre may vary: mansion, ship, museum, small town, train, theatre…).
- The story is vivid but economical (2–4 short paragraphs separated by blank lines).
- Clue content is concrete evidence (physical, testimonial, timing, contradiction) — 2–5 sentences each, never simply "X is the culprit".
- Hints get progressively more revealing; the last hint may nearly implicate a suspect but never names the culprit outright.
- Suspect "alibi" is what THEY claim, containing a detail that will be tested by the clues.
- Title is evocative, 2–6 words.`;

const FIELD_ORDER = [
  'title',
  'setting',
  'victim',
  'story',
  'suspects',
  'clues',
  'hints',
  'culpritName',
  'solution',
];

/** Structured-output schema (counts injected per difficulty). */
function responseSchemaFor(cfg) {
  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Evocative case title, 2-6 words' },
      setting: { type: Type.STRING, description: 'One sentence: place, date, mood' },
      victim: { type: Type.STRING, description: "Victim's name and one-phrase description" },
      story: { type: Type.STRING, description: '2-4 short paragraphs separated by \\n\\n' },
      suspects: {
        type: Type.ARRAY,
        minItems: cfg.suspects,
        maxItems: cfg.suspects,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Full name' },
            role: { type: Type.STRING, description: 'Relationship to the victim / job, 2-6 words' },
            description: { type: Type.STRING, description: '2-3 sentences: personality, motive, tension with the victim' },
            alibi: { type: Type.STRING, description: 'What they CLAIM they were doing, with a checkable detail' },
          },
          required: ['name', 'role', 'description', 'alibi'],
          propertyOrdering: ['name', 'role', 'description', 'alibi'],
        },
      },
      clues: {
        type: Type.ARRAY,
        minItems: cfg.clues,
        maxItems: cfg.clues,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short evidence label, 2-7 words' },
            content: { type: Type.STRING, description: 'The concrete evidence in 2-5 sentences' },
          },
          required: ['title', 'content'],
          propertyOrdering: ['title', 'content'],
        },
      },
      hints: {
        type: Type.ARRAY,
        minItems: cfg.hints,
        maxItems: cfg.hints,
        items: { type: Type.STRING, description: 'Progressively revealing hint, 1-2 sentences' },
      },
      culpritName: { type: Type.STRING, description: 'Must EXACTLY equal one suspect name' },
      solution: { type: Type.STRING, description: 'Step-by-step: what happened, how each clue implicates the culprit, why each red herring is innocent. 120+ words.' },
    },
    required: FIELD_ORDER,
    propertyOrdering: FIELD_ORDER,
  };
}

function userPrompt(premise, cfg) {
  return `Design a complete murder-mystery case for AI Mystery Room.

PLAYER'S PREMISE: """${premise}"""

DIFFICULTY: ${cfg.label}
- Exactly ${cfg.suspects} suspects
- Exactly ${cfg.clues} clues
- Exactly ${cfg.hints} hints (ordered from vaguest to most revealing)

Return ONLY the structured JSON defined by the schema. Make the mystery feel like it was written by a master author specifically for this premise — weave the premise naturally into the setting.`;
}

const ATTEMPTS = [
  { temperature: 1.0 },
  { temperature: 0.75 },
  { temperature: 0.5 },
];

/**
 * Generates a mystery and runs the full validation pipeline.
 * Throws ApiError (400/502/504) — the route layer forwards it to the client.
 */
export async function generateMystery(premise, difficulty) {
  const cfg = DIFFICULTIES[difficulty];
  const schema = buildGeneratedCaseSchema(cfg);

  let lastReason = 'unknown error';

  for (let i = 0; i < ATTEMPTS.length; i += 1) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt(premise, cfg),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: responseSchemaFor(cfg),
          ...ATTEMPTS[i],
          httpOptions: { timeout: 90_000 },
        },
      });

      const text = (response.text ?? '').trim();
      if (!text) throw new Error('Gemini returned an empty response.');

      let raw;
      try {
        raw = JSON.parse(text);
      } catch {
        // tolerate markdown-fenced output
        const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (!fenced) throw new Error('Gemini returned non-JSON output.');
        raw = JSON.parse(fenced[1]);
      }

      const data = schema.parse(raw); // ZodError on structural issues
      const logic = validateGeneratedLogic(data);
      if (!logic.ok) throw new ApiError(502, `AI output failed logical validation: ${logic.reason}`);

      return { data, culpritIndex: logic.culpritIndex };
    } catch (err) {
      if (err instanceof ApiError) {
        lastReason = err.message;
      } else {
        lastReason = err?.message || String(err);
        console.warn(`[gemini] attempt ${i + 1} failed: ${lastReason}`);
      }
    }
  }

  console.error('[gemini] all attempts failed:', lastReason);
  if (/timeout|deadline|abort/i.test(lastReason)) {
    throw new ApiError(504, 'The oracle took too long to answer. Please try again shortly.');
  }
  throw new ApiError(502, 'The AI failed to write a consistent mystery. Please try again.');
}

/** Persist-shape builder: server assigns ids and derives culpritId. */
export function buildCaseDocument(raw, culpritIndex, { premise, difficulty }) {
  const suspects = raw.suspects.map((s, i) => ({ id: `s${i + 1}`, ...s }));
  const culpritId = `s${culpritIndex + 1}`;
  return {
    premise,
    difficulty,
    title: raw.title,
    setting: raw.setting,
    victim: raw.victim,
    story: raw.story,
    suspects,
    clues: raw.clues.map((cl, i) => ({
      id: `c${i + 1}`,
      title: cl.title,
      content: cl.content,
      discovered: false,
      discoveredAt: null,
    })),
    hints: raw.hints.map((h, i) => ({ id: `h${i + 1}`, text: h, used: false, usedAt: null })),
    culpritId,
    solution: raw.solution,
    completed: false,
    accusedId: null,
    accusedName: null,
    correct: null,
    score: null,
    breakdown: null,
  };
}
