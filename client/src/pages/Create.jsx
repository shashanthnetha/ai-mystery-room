import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shuffle, FileText, Check, PenLine } from 'lucide-react';

import DifficultyCard, { DIFFICULTY_ORDER } from '../components/DifficultyCard.jsx';
import GenerateOverlay from '../components/GenerateOverlay.jsx';
import ErrorState from '../components/ErrorState.jsx';
import api, { getErrorMessage } from '../lib/api.js';
import { DIFFICULTY_INFO, CLUE_BONUS, HINT_PENALTY } from '../lib/difficulty.js';
import { rememberCase } from '../lib/storage.js';

const SAMPLE_PREMISES = [
  'A famous violinist is found dead in her locked dressing room minutes before the encore.',
  'A snowy mountain lodge, seven guests, and a host who never makes it to midnight.',
  'A priceless manuscript vanishes from a university library — and so does the librarian.',
  'The old lighthouse keeper is found dead at the top of a tower with a door only he could open.',
  'During the masquerade ball, the jeweller’s mask comes off — and he never takes another breath.',
  'A web comic artist is poisoned hours after announcing they found a “way too good” collaboration deal.',
  'A world chess champion collapses across the board mid-match; one misstep too many, someone changed the tea.',
];

const PREMISE_MIN = 10;
const PREMISE_MAX = 400;

export default function Create() {
  const navigate = useNavigate();
  const [premise, setPremise] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const info = DIFFICULTY_INFO[difficulty];
  const length = premise.trim().length;
  const valid = length >= PREMISE_MIN && length <= PREMISE_MAX;

  const [sample, setSample] = useState(() => SAMPLE_PREMISES[Math.floor(Math.random() * SAMPLE_PREMISES.length)]);

  function shuffleSample() {
    let next = sample;
    while (next === sample && SAMPLE_PREMISES.length > 1) {
      next = SAMPLE_PREMISES[Math.floor(Math.random() * SAMPLE_PREMISES.length)];
    }
    setSample(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const [data, err] = await apiCallSafe({ premise: premise.trim(), difficulty });
    if (err) {
      setSubmitting(false);
      setError(err);
      return;
    }
    rememberCase({
      id: data.case.id,
      title: data.case.title,
      difficulty,
      status: 'open',
    });
    navigate(`/case/${data.case.id}`);
  }

  async function apiCallSafe(body) {
    try {
      const res = await api.post('/cases', body);
      return [res.data, null];
    } catch (err) {
      return [null, getErrorMessage(err, 'The oracle refused the brief. Try again.')];
    }
  }

  return (
    <div className="container-page pb-8 pt-12 sm:pt-16">
      {submitting && <GenerateOverlay />}

      <div className="mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <p className="kicker">New Case File</p>
          <h1 className="headline mt-2 text-4xl sm:text-5xl">Brief the oracle</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-paper-400 sm:text-base">
            Whisper your premise — a place, a victim, a scent of jealousy. Gemini will grow it
            into a complete mystery… but only the server knows who stays behind bars.
          </p>
        </motion.div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="mx-auto mt-12 max-w-3xl space-y-10"
      >
        {/* ───────── PREMISE ───────── */}
        <section className="panel p-6 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="premise" className="kicker flex items-center gap-2">
              <PenLine size={12} /> The Premise
            </label>
            <span
              className={`font-type text-[11px] ${valid ? 'text-moss-300' : 'text-paper-500'}`}
            >
              {length}/{PREMISE_MAX}
            </span>
          </div>

          <textarea
            id="premise"
            value={premise}
            onChange={(e) => setPremise(e.target.value.slice(0, PREMISE_MAX))}
            placeholder="e.g. A famous violinist is found dead in her locked dressing room minutes before the encore…"
            rows={4}
            className="input mt-4 min-h-[130px] resize-y"
            autoFocus
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-type text-[10px] uppercase tracking-[0.18em] text-paper-500">
              <Shuffle size={11} /> Need a spark?
            </span>
            <button
              type="button"
              onClick={shuffleSample}
              className="border-b border-dashed border-gold-500/50 pb-0.5 text-left text-xs italic text-gold-300/90 transition-colors hover:text-gold-200"
            >
              “{sample}”
            </button>
          </div>
        </section>

        {/* ───────── DIFFICULTY ───────── */}
        <section>
          <p className="kicker mb-4 flex items-center gap-2">
            <FileText size={12} /> Choose the difficulty
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {DIFFICULTY_ORDER.map((d) => (
              <DifficultyCard key={d} difficulty={d} selected={difficulty === d} onSelect={setDifficulty} />
            ))}
          </div>
        </section>

        {error && <ErrorState message={error} onRetry={() => setError(null)} />}

        {/* ───────── SUBMIT ───────── */}
        <div className="flex flex-col items-center gap-4">
          <button type="submit" disabled={!valid || submitting} className="btn btn-primary btn-lg w-full sm:w-auto sm:min-w-72">
            <Check size={18} />
            Seal the brief · Generate mystery
          </button>
          <DossierSummary info={info} />
        </div>
      </motion.form>
    </div>
  );
}

function DossierSummary({ info }) {
  const rows = [
    [`${info.suspects} suspects`, 'with motives and alibis'],
    [`${info.clues} clues`, `(+${CLUE_BONUS} pts each you uncover)`],
    [`${info.hints} hints`, `(−${HINT_PENALTY} pts each you spend)`],
    [`${info.base} pts`, 'for a correct accusation — min total is 0'],
  ];
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-dashed border-gold-500/25 bg-gold-500/[0.03] p-5">
      <p className="kicker text-center">What hides inside the dossier</p>
      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map(([a, b]) => (
          <li key={a} className="flex items-baseline gap-2 text-[13px]">
            <span className="font-display font-semibold text-gold-300">{a}</span>
            <span className="text-paper-500">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
