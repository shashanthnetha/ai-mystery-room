import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { DIFFICULTIES } from '../src/config/difficulty.js';
import { buildGeneratedCaseSchema, validateGeneratedLogic } from '../src/validation/generatedCase.js';

/**
 * Standalone smoke test for the Gemini generation pipeline:
 *   node scripts/checkGemini.js [easy|medium|hard]
 * Prints the validated mystery summary and confirms culprit masking.
 */
const difficulty = process.argv[2] || 'easy';
const cfg = DIFFICULTIES[difficulty];
if (!cfg) {
  console.error(`Unknown difficulty "${difficulty}". Use: easy | medium | hard`);
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is missing from server/.env');
  process.exit(1);
}

const premise = process.argv[3] || 'A famous violinist is found dead in her locked concert hall dressing room minutes before the encore.';

console.log(`⏳ Asking Gemini for a ${cfg.label} mystery…`);

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: `Design a complete murder-mystery case for AI Mystery Room. PLAYER'S PREMISE: """${premise}""" Difficulty: ${cfg.label} — exactly ${cfg.suspects} suspects, ${cfg.clues} clues, ${cfg.hints} hints. Return ONLY the structured JSON.`,
  config: {
    systemInstruction:
      'You are "The Architect" — a fair-play murder-mystery designer. The culprit is always one of the suspects; every clue must be honest and consistent with the solution; at least one suspect is a red herring that the clues clear. Family-friendly fiction, no real people.',
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        setting: { type: Type.STRING },
        victim: { type: Type.STRING },
        story: { type: Type.STRING },
        suspects: {
          type: Type.ARRAY,
          minItems: cfg.suspects,
          maxItems: cfg.suspects,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              description: { type: Type.STRING },
              alibi: { type: Type.STRING },
            },
            required: ['name', 'role', 'description', 'alibi'],
          },
        },
        clues: {
          type: Type.ARRAY,
          minItems: cfg.clues,
          maxItems: cfg.clues,
          items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['title', 'content'] },
        },
        hints: { type: Type.ARRAY, minItems: cfg.hints, maxItems: cfg.hints, items: { type: Type.STRING } },
        culpritName: { type: Type.STRING },
        solution: { type: Type.STRING },
      },
      required: ['title', 'setting', 'victim', 'story', 'suspects', 'clues', 'hints', 'culpritName', 'solution'],
    },
    temperature: 0.9,
    httpOptions: { timeout: 90_000 },
  },
});

const raw = JSON.parse(response.text);
const schema = buildGeneratedCaseSchema(cfg);
const data = schema.parse(raw); // throws ZodError if structure/count wrong
const logic = validateGeneratedLogic(data);
if (!logic.ok) {
  console.error('✗ Logic validation failed:', logic.reason);
  process.exit(1);
}

console.log('✓ Validated mystery');
console.log('  Title   :', data.title);
console.log('  Setting :', data.setting);
console.log('  Victim  :', data.victim);
console.log('  Suspects:', data.suspects.map((s) => `${s.name} (${s.role})`).join(' | '));
console.log('  Clues    :', data.clues.map((c) => c.title).join(' | '));
console.log('  Hints    :', data.hints.map((h) => `“${h.slice(0, 60)}…”`).join(' | '));
console.log('  Culprit  :', data.culpritName, `(would become ${`s${logic.culpritIndex + 1}`})`);
console.log('  Story len:', data.story.length, '·Solution len:', data.solution.length);
