/**
 * The ONLY module allowed to turn a Case document into API responses.
 * Everything public must flow through these two serializers so the
 * culprit/solution/scores and unrevealed clue/hint content can never leak.
 */

export function toPublicCase(c) {
  const clues = (c.clues || []).map((cl) => {
    const pub = { id: cl.id, title: cl.title, discovered: !!cl.discovered };
    if (cl.discovered) {
      pub.content = cl.content;
      pub.discoveredAt = cl.discoveredAt;
    }
    return pub;
  });

  const hintsUsed = (c.hints || []).filter((h) => h.used).length;

  const pub = {
    id: String(c._id),
    title: c.title,
    difficulty: c.difficulty,
    setting: c.setting,
    victim: c.victim,
    story: c.story,
    suspects: (c.suspects || []).map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      description: s.description,
      alibi: s.alibi,
    })),
    clues,
    cluesDiscovered: clues.filter((x) => x.discovered).length,
    cluesTotal: clues.length,
    hintsUsed,
    hintsTotal: (c.hints || []).length,
    completed: !!c.completed,
  };

  if (c.completed && c.accusedId) {
    pub.accused = { id: c.accusedId, name: c.accusedName };
  }
  return pub;
}

/** Result payload — only ever built for a COMPLETED case (never early). */
export function toPublicResult(c) {
  const cluesTotal = (c.clues || []).length;
  const cluesDiscovered = (c.clues || []).filter((cl) => cl.discovered).length;
  const hintsUsed = (c.hints || []).filter((h) => h.used).length;

  const culprit = (c.suspects || []).find((s) => s.id === c.culpritId) || null;

  return {
    correct: !!c.correct,
    accused: c.accusedId ? { id: c.accusedId, name: c.accusedName } : null,
    culprit: culprit
      ? { id: culprit.id, name: culprit.name, role: culprit.role, description: culprit.description }
      : null,
    explanation: c.solution,
    score: typeof c.score === 'number' ? c.score : 0,
    breakdown: c.breakdown
      ? {
          base: c.breakdown.base,
          clueBonus: c.breakdown.clueBonus,
          hintPenalty: c.breakdown.hintPenalty,
          total: c.breakdown.total,
        }
      : { base: 0, clueBonus: 0, hintPenalty: 0, total: 0 },
    stats: {
      cluesDiscovered,
      cluesTotal,
      hintsUsed,
      hintsTotal: (c.hints || []).length,
      difficulty: c.difficulty,
    },
  };
}
