/**
 * End-to-end game-flow test against a RUNNING dev server.
 *   node scripts/e2e.mjs
 * Verifies: generation → privacy (no premature leaks) → discover → hints
 * → overflow → wrong/right accusation → scoring math → idempotency.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const BASE = process.env.BASE_URL || 'http://localhost:5001/api';
const mustHaveKey = process.env.GEMINI_API_KEY;
if (!mustHaveKey) {
  console.error('GEMINI_API_KEY required for generation.');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function check(name, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return [res.status, await res.json()];
}
async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  return [res.status, await res.json()];
}

const PRIVATE_TOKENS = ['culpritId', 'culprit_id', 'solution', '"correct"', '"score"', '"breakdown"'];

function assertNoLeaks(name, obj) {
  const json = JSON.stringify(obj);
  const leaked = PRIVATE_TOKENS.filter((t) => json.includes(t));
  check(`${name} — no private fields in payload`, leaked.length === 0, leaked.join(','));

  // undiscovered clue objects must not reveal content
  const caseObj = obj.case || obj;
  if (caseObj.clues) {
    const lockedWithContent = caseObj.clues.filter((c) => c.discovered === false && c.content);
    check(`${name} — locked clues carry no content`, lockedWithContent.length === 0);
  }
}

await mongoose.connect(process.env.MONGODB_URI, { dbName: 'mystery_room' });

/* ── 1. Generate an easy case ─────────────────────────────────────────────── */
console.log('\n[1] POST /cases (easy)');
const [genStatus, genBody] = await post('/cases', {
  premise: 'A famous violinist is found dead in her locked dressing room minutes before the encore.',
  difficulty: 'easy',
});
check('POST /cases → 201', genStatus === 201, `got ${genStatus}: ${JSON.stringify(genBody).slice(0, 200)}`);
const c = genBody.case;
check('title exists', !!c.title);
check('3 suspects', c.suspects?.length === 3, `got ${c.suspects?.length}`);
check('5 clues', c.clues?.length === 5, `got ${c.clues?.length}`);
check('hintsTotal 2', c.hintsTotal === 2, `got ${c.hintsTotal}`);
check('completed false', c.completed === false);
assertNoLeaks('generated', c);

/* ── 2. GET public snapshot ───────────────────────────────────────────────── */
console.log('\n[2] GET /cases/:id');
const [getStatus, getBody] = await get(`/cases/${c.id}`);
check('GET → 200', getStatus === 200);
assertNoLeaks('get', getBody.case);

/* ── 3. Discover one clue ─────────────────────────────────────────────────── */
console.log('\n[3] POST .../clues/c1/discover');
const [dStatus, dBody] = await post(`/cases/${c.id}/clues/c1/discover`);
check('discover → 200', dStatus === 200);
check('clue now has content', typeof dBody.clue?.content === 'string' && dBody.clue.content.length > 0);
check('progress 1/5', dBody.progress?.cluesDiscovered === 1);
assertNoLeaks('discover', dBody);
const [d2Status, d2Body] = await post(`/cases/${c.id}/clues/c1/discover`);
check('re-discover idempotent → 200 alreadyDiscovered', d2Status === 200 && d2Body.alreadyDiscovered === true);

/* ── 4. Hints (2 available) ───────────────────────────────────────────────── */
console.log('\n[4] POST .../hints');
const [h1Status, h1Body] = await post(`/cases/${c.id}/hints`);
check('hint 1 → 200', h1Status === 200 && typeof h1Body.hint?.text === 'string');
const [h2Status, h2Body] = await post(`/cases/${c.id}/hints`);
check('hint 2 → 200 (1/2 used)', h2Status === 200);
const [h3Status, h3Body] = await post(`/cases/${c.id}/hints`);
check('overflow hint → 409 friendly', h3Status === 409 && /every hint/i.test(h3Body.message || ''), h3Body?.message);

/* ── 5. Result before completion → 409 ────────────────────────────────────── */
console.log('\n[5] GET .../result (not completed)');
const [r0Status, r0Body] = await get(`/cases/${c.id}/result`);
check('early result → 409', r0Status === 409, `got ${r0Status}`);

/* ── 6. Discover remaining clues ──────────────────────────────────────────── */
for (const clueId of ['c2', 'c3', 'c4', 'c5']) {
  await post(`/cases/${c.id}/clues/${clueId}/discover`);
}
const [, prog] = await get(`/cases/${c.id}`);
check('5/5 clues discovered', prog.case.cluesDiscovered === 5);

/* ── 7. Accuse the TRUE culprit (read from Mongo as the server would) ─────── */
console.log('\n[7] POST .../accuse (correct)');
const CaseDoc = mongoose.connection.collection('cases');
const doc = await CaseDoc.findOne({ _id: new mongoose.Types.ObjectId(c.id) });
const culpritId = doc.culpritId;
check('culprit stored in private field only', typeof culpritId === 'string', 'missing culpritId in doc');

const [aStatus, aBody] = await post(`/cases/${c.id}/accuse`, { suspectId: culpritId });
check('accuse → 200', aStatus === 200);
const res1 = aBody.result;
check('correct true', res1.correct === true);
// exact: base 100 + 5×5 discovered clues − 10×2 spent hints = 105
check('exact score 105 (100 + 25 − 20)', res1.score === 105, `got ${res1.score}`);
check('breakdown hintPenalty −20', res1.breakdown?.hintPenalty === -20, JSON.stringify(res1.breakdown));
check('explanation revealed', typeof res1.explanation === 'string' && res1.explanation.length > 100);
check('culprit identity revealed', res1.culprit?.name === doc.suspects.find((s) => s.id === culpritId).name);

/* ── 8. Idempotent re-accuse + state checks ───────────────────────────────── */
console.log('\n[8] idempotency after completion');
const [a2Status, a2Body] = await post(`/cases/${c.id}/accuse`, { suspectId: culpritId });
check('re-accuse → 200 alreadyCompleted', a2Status === 200 && a2Body.alreadyCompleted === true);
const [hintAfterStatus] = await post(`/cases/${c.id}/hints`);
check('hint after completion → 409', hintAfterStatus === 409);
const [, r1Body] = await get(`/cases/${c.id}/result`);
check('GET result now works', typeof r1Body.result?.explanation === 'string');

/* ── 9. Fresh case: wrong accusation scores 0 ─────────────────────────────── */
console.log('\n[9] POST /cases (easy) — wrong accusation');
const [gen2Status, gen2Body] = await post('/cases', {
  premise: 'A pilot vanishes mid-flight over the Rockies and the co-pilot swears it was turbulence.',
  difficulty: 'easy',
});
check('second generation → 201', gen2Status === 201, `got ${gen2Status}`);
const c2 = gen2Body.case;
const doc2 = await CaseDoc.findOne({ _id: new mongoose.Types.ObjectId(c2.id) });
const wrongId = doc2.suspects.find((s) => s.id !== doc2.culpritId).id;
const [wStatus, wBody] = await post(`/cases/${c2.id}/accuse`, { suspectId: wrongId });
check('wrong accuse → 200 correct=false', wStatus === 200 && wBody.result.correct === false);
check('wrong score 0', wBody.result.score === 0, `got ${wBody.result.score}`);
check('breakdown.clueBonus 0 (no clues discovered)', wBody.result.breakdown?.clueBonus === 0);
check('real culprit revealed on wrong guess', !!wBody.result.culprit?.name && wBody.result.culprit.id === doc2.culpritId);
assertNoLeaks('get-after-complete', (await get(`/cases/${c2.id}`))[1].case);

/* ── 10. Medium generation counts ─────────────────────────────────────────── */
console.log('\n[10] POST /cases (medium) — count check');
const [g3Status, g3Body] = await post('/cases', {
  premise: 'During a masquerade ball at Blackmoor Manor, the host is poisoned and everyone saw a different mask.',
  difficulty: 'medium',
});
check('medium generation → 201', g3Status === 201, `got ${g3Status}`);
const c3 = g3Body.case;
check('4 suspects / 7 clues / 3 hints',
  c3.suspects?.length === 4 && c3.clues?.length === 7 && c3.hintsTotal === 3,
  `S=${c3.suspects?.length} C=${c3.clues?.length} H=${c3.hintsTotal}`);

/* ── cleanup: remove ONLY the test docs we created, close ─────────────────── */
await CaseDoc.deleteMany({ _id: { $in: [new mongoose.Types.ObjectId(c.id), new mongoose.Types.ObjectId(c2.id), new mongoose.Types.ObjectId(c3.id)] } });
console.log(`\n(passed ${passed}, failed ${failed}${failed ? ' — see ✗ above' : ''})`);
await mongoose.connection.close();
process.exit(failed ? 1 : 0);
