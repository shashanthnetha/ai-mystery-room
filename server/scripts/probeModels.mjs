import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const candidates = [
  'gemini-3.8-flash',
  'gemini-3.8-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash',
];

for (const model of candidates) {
  try {
    const res = await ai.models.generateContent({
      model,
      contents: 'Reply with the single word OK.',
      config: { maxOutputTokens: 8, httpOptions: { timeout: 20_000 } },
    });
    console.log(`✓ ${model} → "${(res.text || '').trim().slice(0, 20)}"`);
  } catch (err) {
    const code = err?.status || /code"?:(\d+)/.exec(err?.message || '')?.[1] || 'ERR';
    console.log(`✗ ${model} → ${code} ${String(err?.message || err).slice(0, 110)}`);
  }
}
