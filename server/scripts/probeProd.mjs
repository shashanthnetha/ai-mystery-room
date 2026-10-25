const BASE = 'https://mystery-room-api-2dvt.onrender.com/api';
const res = await fetch(`${BASE}/cases`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    premise: 'A birthday cake in the orphanage kitchen disappears every midnight without a crumb left behind.',
    difficulty: 'easy',
  }),
});
const body = await res.json();
if (res.ok && body.success) {
  const c = body.case;
  console.log(`✓ Generated on Render: "${c.title}" — ${c.suspects.length} suspects, ${c.clues.length} clues, ${c.hintsTotal} hints`);
  console.log(`  id=${c.id}`);
} else {
  console.log(`✗ ${res.status}: ${JSON.stringify(body).slice(0, 400)}`);
}
