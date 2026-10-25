/**
 * Full production game-flow on the DEPLOYED site:
 *   node scripts/prodFlow.mjs
 * Creates a case, discovers everything, uses hints, plays a correct
 * accusation using the culprit read straight from Atlas (what the server
 * does internally), then verifies verdict + accepted output shape.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const API = 'https://mystery-room-api-2dvt.onrender.com/api';

async function post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return [r.status, await r.json()];
}
async function get(path) {
  const r = await fetch(`${API}${path}`);
  return [r.status, await r.json()];
}

console.log('1) Generating a mystery on the deployed backend…');
const [, gen] = await post('/cases', {
  premise: 'During the final performance of a travelling theatre troupe, the acclaimed lead actor falls dead on stage — and the understudy monopolises the applause.',
  difficulty: 'medium',
});
const c = gen.case;
console.log(`   ✓ "${c.title}" — suspects=${c.suspects.length} clues=${c.clues.length} hints=${c.hintsTotal} (id ${c.id})`);

console.log('2) Discovering every clue…');
for (const cl of c.clues) {
  await post(`/cases/${c.id}/clues/${cl.id}/discover`);
}
const [, withAll] = await get(`/cases/${c.id}`);
console.log(`   ✓ ${withAll.case.cluesDiscovered}/${withAll.case.cluesTotal} discovered`);

console.log('3) Requesting all hints…');
for (let i = 0; i < c.hintsTotal; i += 1) await post(`/cases/${c.id}/hints`);
const [, withHints] = await get(`/cases/${c.id}`);
console.log(`   ✓ ${withHints.case.hintsUsed}/${withHints.case.hintsTotal} hints used`);

console.log('4) Accusing the true culprit…');
await mongoose.connect(process.env.MONGODB_URI, { dbName: 'mystery_room' });
const doc = await mongoose.connection.collection('cases').findOne({ _id: new mongoose.Types.ObjectId(c.id) });
await mongoose.connection.close();
const [, verdict] = await post(`/cases/${c.id}/accuse`, { suspectId: doc.culpritId });

const r = verdict.result;
const expectScore = 150 + 7 * 5 - 3 * 10;
const ok = r.correct === true && r.score === expectScore && typeof r.explanation === 'string' && r.explanation.length > 300;
console.log(`   ✓ correct=${r.correct} score=${r.score} (expected ${expectScore}) breakdown=${JSON.stringify(r.breakdown)}`);
console.log(`   ✓ culprit="${r.culprit.name}" explanation chars=${r.explanation.length}`);
console.log(`   VERDICT: ${c.title} — ${r.correct ? 'CASE CLOSED' : 'UNEXPECTED'} — https://ai-mystery-room-brown.vercel.app/case/${c.id}/result`);
process.exit(ok ? 0 : 1);
