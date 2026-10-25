import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, FileSearch, Home, PartyPopper, ScrollText } from 'lucide-react';

import ErrorState from '../components/ErrorState.jsx';
import Stamp from '../components/Stamp.jsx';
import api, { apiCall, getErrorMessage } from '../lib/api.js';
import { DIFFICULTY_INFO } from '../lib/difficulty.js';
import { updateCaseStatus } from '../lib/storage.js';

export default function Result() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(location.state?.verdict || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!location.state?.verdict);
  const firedConfetti = useRef(false);

  useEffect(() => {
    if (result) return;
    let alive = true;
    (async () => {
      const [data, err] = await apiCall(api.get(`/cases/${id}/result`));
      if (!alive) return;
      if (err) {
        if (/already|not solved/i.test(err) || err?.status === 409) {
          navigate(`/case/${id}`, { replace: true });
          return;
        }
        setError(err);
      } else {
        setResult(data.result);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, result, navigate]);

  useEffect(() => {
    if (!result) return;
    updateCaseStatus(id, 'solved');
    if (result.correct && !firedConfetti.current && typeof window !== 'undefined' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      firedConfetti.current = true;
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 130,
          spread: 75,
          origin: { y: 0.25 },
          colors: ['#d9ad4f', '#e8c47c', '#f3ecdd', '#b91c1c', '#5fa17a'],
          zIndex: 60,
        });
        setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.35 } }), 380);
      });
    }
  }, [result, id]);

  if (loading) return <ResultSkeleton />;
  if (error || !result) {
    return (
      <div className="container-page py-20">
        <ErrorState message={error || 'The verdict could not be delivered.'} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const { correct, accused, culprit, explanation, score, breakdown, stats } = result;
  const info = DIFFICULTY_INFO[stats.difficulty] || {};

  return (
    <div className="container-page pb-24 pt-10 sm:pt-14">
      {/* ───────────── VERDICT HEADER ───────────── */}
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center">
        <Stamp variant={correct ? 'moss' : 'blood'} size="lg" className="mb-7">
          {correct ? 'Case Closed' : 'Case Cold'}
        </Stamp>
        <h1 className="headline text-4xl leading-tight sm:text-6xl">
          {correct ? (
            <>
              You got <em className="shimmer-text italic">them,</em> detective.
            </>
          ) : (
            <>
              The truth <em className="text-blood-400 italic">slipped</em> away.
            </>
          )}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-paper-400 sm:text-base">
          {correct
            ? `“${accused?.name || 'The accused'}” ends tonight — the accusation was right, and the score reflects a job well done.`
            : `You believed ${accused?.name || 'someone'}. The real answer is below — study it for next time.`}
        </p>
        {correct && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-gold-300">
            <PartyPopper size={15} /> Masterful sleuthing.
          </p>
        )}
      </motion.div>

      {/* ───────────── CULPRIT REVEAL ───────────── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="panel mx-auto mt-12 max-w-4xl overflow-hidden"
        aria-label="The culprit"
      >
        <div className={`flex items-center gap-2 px-6 py-3 text-[11px] font-type uppercase tracking-[0.22em] ${correct ? 'bg-moss-600/15 text-moss-300' : 'bg-blood-600/15 text-blood-400'}`}>
          {correct ? 'Culprit as accused' : 'The real culprit'}
        </div>
        <div className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className={correct ? '' : 'grayscale opacity-90'}>
            <CulpritAvatar seed={culprit?.name || '?'} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-3xl font-semibold text-paper-100">{culprit?.name}</h2>
            <p className="kicker mt-1">{culprit?.role}</p>
            <p className="mt-2.5 text-sm leading-relaxed text-paper-400">{culprit?.description}</p>
          </div>
          {!correct && accused && (
            <div className="shrink-0 rounded-xl border border-blood-500/30 bg-blood-500/[0.06] px-4 py-3 text-center">
              <p className="kicker-muted text-[9px]">You accused</p>
              <p className="mt-1 font-display text-lg text-paper-200 line-through decoration-blood-500/70 decoration-2">{accused.name}</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ───────────── SCORE ───────────── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="panel mx-auto mt-6 max-w-4xl p-6 sm:p-8"
        aria-label="Final score"
      >
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
          <div className="text-center sm:w-44">
            <p className="kicker">Final score</p>
            <ScoreNumber value={score} />
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <Row label="Difficulty" value={info.label} />
            <Row label="Correct accusation" value={correct ? `+${breakdown.base}` : '+0'} good={correct} />
            <Row label={`Clues (${stats.cluesDiscovered}/${stats.cluesTotal})`} value={`+${breakdown.clueBonus}`} good={breakdown.clueBonus > 0} />
            <Row label="Hints" value={breakdown.hintPenalty === 0 ? '−0' : String(breakdown.hintPenalty)} good={breakdown.hintPenalty === 0} />
          </dl>
        </div>
        <div className="divider-gold mt-6" />
        <p className="mt-4 text-center text-xs text-paper-500">
          Score = base for a correct accusation + 5 pts per discovered clue − 10 pts per hint, floored at 0. Computed by the backend.
        </p>
      </motion.section>

      {/* ───────────── EXPLANATION ───────────── */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="panel mx-auto mt-6 max-w-4xl p-6 sm:p-9"
        aria-label="The full explanation"
      >
        <h2 className="kicker flex items-center gap-2">
          <ScrollText size={12} /> The full explanation
        </h2>
        <div className="story-text mt-4">
          {explanation?.split(/\n\s*\n/).map((p, i) => (
            <p key={i} className={`${i === 0 ? 'drop-cap' : ''} mb-4`}>{p}</p>
          ))}
        </div>
      </motion.section>

      {/* ───────────── ACTIONS ───────────── */}
      <div className="mx-auto mt-12 flex max-w-4xl flex-col items-center justify-center gap-4 sm:flex-row">
        <Link to="/create" className="btn btn-primary btn-lg group">
          <FileSearch size={17} />
          Solve another mystery
          <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
        <Link to="/" className="btn btn-outline btn-lg">
          <Home size={16} /> Back to home
        </Link>
      </div>
    </div>
  );
}

function ScoreNumber({ value }) {
  const spring = useSpring(0, { stiffness: 55, damping: 16 });
  const text = useTransform(spring, (v) => Math.round(v).toLocaleString('en-US'));
  const [done, setDone] = useState(false);
  useEffect(() => {
    spring.set(value);
    const t = setTimeout(() => setDone(true), 1400);
    return () => clearTimeout(t);
  }, [value, spring]);
  return (
    <motion.span animate={{ scale: done ? [1, 1.08, 1] : 1 }} transition={{ duration: 0.5 }} className="mt-2 block font-display text-6xl font-bold text-gold-300" style={{ textShadow: '0 6px 40px rgba(212,160,60,0.35)' }}>
      {text}
    </motion.span>
  );
}

function CulpritAvatar({ seed }) {
  const initials = seed.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const idx = seed.length % 5;
  return (
    <span className={`avatar-${idx + 1} flex h-16 w-16 items-center justify-center rounded-2xl font-display text-xl font-bold text-ink-950`}>
      {initials}
    </span>
  );
}

function Row({ label, value, good }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-4 py-3">
      <dt className="kicker-muted truncate text-[9px]">{label}</dt>
      <dd className={`mt-1 font-display text-xl font-semibold ${good ? 'text-moss-300' : 'text-blood-400'}`}>{value}</dd>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="container-page pb-20 pt-16">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <AnimatePresence>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="shimmer-text font-type text-xs uppercase tracking-[0.35em]">
            Opening the sealed envelope…
          </motion.p>
        </AnimatePresence>
        <div className="mx-auto h-16 w-64 animate-pulse rounded-xl bg-white/[0.05]" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}
