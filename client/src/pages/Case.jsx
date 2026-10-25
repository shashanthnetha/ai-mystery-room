import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileSearch, Fingerprint, Gavel, MapPin, UserX, ChevronLeft } from 'lucide-react';
import SuspectCard from '../components/SuspectCard.jsx';
import ClueCard from '../components/ClueCard.jsx';
import HintPanel from '../components/HintPanel.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Stamp from '../components/Stamp.jsx';
import api, { apiCall, getErrorMessage } from '../lib/api.js';
import { DIFFICULTY_INFO } from '../lib/difficulty.js';
import { rememberCase } from '../lib/storage.js';

export default function Case() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null); // public case snapshot
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [discoveringId, setDiscoveringId] = useState(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [progress, setProgress] = useState({ cluesDiscovered: 0, cluesTotal: 0, hintsUsed: 0, hintsTotal: 0 });
  const [usedHints, setUsedHints] = useState([]); // local add-ons as hints get revealed
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/cases/${id}`)
      .then((res) => {
        if (!alive) return;
        const pub = res.data.case;
        if (pub.completed) {
          // Case is already closed — the verdict is one click away.
          rememberCase({ id, title: pub.title, difficulty: pub.difficulty, status: 'solved' });
          navigate(`/case/${id}/result`, { replace: true });
          return;
        }
        rememberCase({ id, title: pub.title, difficulty: pub.difficulty, status: 'open' });
        setData(pub);
        setLoadError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(getErrorMessage(err, 'This case file could not be opened.'));
        setData(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, navigate]);

  // Seed progress/derived state when a case snapshot first arrives.
  useEffect(() => {
    if (!data) return;
    const discovered = data.clues.filter((c) => c.discovered).length;
    setProgress({
      cluesDiscovered: discovered,
      cluesTotal: data.cluesTotal,
      hintsUsed: data.hintsUsed,
      hintsTotal: data.hintsTotal,
    });
    setUsedHints([]);
    // This intentionally runs only when a NEW case id loads (not on every clue discovery).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4600);
    return () => clearTimeout(t);
  }, [toast]);

  const discoverClue = useCallback(
    async (clue) => {
      if (discoveringId || clue.discovered) return;
      setDiscoveringId(clue.id);
      const [payload, err] = await apiCall(api.post(`/cases/${id}/clues/${clue.id}/discover`));
      setDiscoveringId(null);
      if (err) {
        setToast(err);
        return;
      }
      setData((prev) => ({
        ...prev,
        clues: prev.clues.map((cl) => (cl.id === clue.id ? { ...cl, ...payload.clue } : cl)),
      }));
      setProgress((p) => ({ ...p, ...payload.progress }));
    },
    [id, discoveringId],
  );

  const requestHint = useCallback(async () => {
    if (hintBusy) return;
    setHintBusy(true);
    const [payload, err] = await apiCall(api.post(`/cases/${id}/hints`));
    setHintBusy(false);
    if (err) {
      setToast(err);
      return;
    }
    setProgress((p) => ({ ...p, ...payload.progress }));
    setUsedHints((hs) => [...hs, payload.hint.text]);
  }, [id, hintBusy]);

  if (loading) return <CaseSkeleton />;
  if (loadError || !data) {
    return (
      <div className="container-page py-20">
        <ErrorState message={loadError || 'This case file could not be opened.'} />
        <div className="mt-6 text-center">
          <Link to="/create" className="btn btn-outline btn-md">
            <FileSearch size={15} /> Open a different case
          </Link>
        </div>
      </div>
    );
  }

  const info = DIFFICULTY_INFO[data.difficulty] || {};
  const pct = progress.cluesTotal ? Math.round((progress.cluesDiscovered / progress.cluesTotal) * 100) : 0;

  return (
    <div className="container-page pb-36 pt-10 sm:pt-14">
      {/* toast (transient action errors) */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-1/2 top-20 z-40 w-[min(92vw,430px)] -translate-x-1/2 rounded-xl border border-blood-500/40 bg-ink-900/95 px-4 py-3 text-sm text-blood-400 shadow-2xl backdrop-blur"
          role="alert"
        >
          {toast}
        </motion.div>
      )}

      {/* ───────────── CASE HEADER ───────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="group inline-flex items-center gap-1.5 text-sm text-paper-500 transition-colors hover:text-gold-300">
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Back to HQ
          </Link>
          <Stamp variant="gold" size="sm">Case Open</Stamp>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="kicker">The Investigation Room · {info.label}</p>
            <h1 className="headline mt-2 text-4xl leading-tight sm:text-5xl">{data.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">
                <MapPin size={12} className="text-gold-400" /> {data.setting}
              </span>
              <span className="chip">
                <UserX size={12} className="text-blood-400" /> Victim: {data.victim}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ───────────── PROGRESS ───────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="panel mt-8 flex items-center gap-5 px-5 py-4">
        <Fingerprint size={18} className="shrink-0 text-gold-400" />
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-type uppercase tracking-[0.18em] text-paper-500">Case progress</span>
            <span className="text-paper-400">
              {progress.cluesDiscovered}/{progress.cluesTotal} clues · {progress.hintsUsed}/{progress.hintsTotal} hints
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>

      {/* ───────────── THE STORY ───────────── */}
      <section className="panel mt-6 p-7 sm:p-9" aria-label="The story">
        <p className="kicker">The Case</p>
        <div className="story-text mt-4 space-y-0">
          {data.story.split(/\n\s*\n/).map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.14 }}
              className={i === 0 ? 'drop-cap' : ''}
            >
              {p}
            </motion.p>
          ))}
        </div>
      </section>

      {/* ───────────── ROOM GRID ───────────── */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* suspects */}
        <div className="lg:col-span-5">
          <h2 className="kicker mb-4 flex items-center gap-2">
            <Fingerprint size={13} /> The Suspects · {data.suspects.length}
          </h2>
          <div className="space-y-4">
            {data.suspects.map((s, i) => (
              <SuspectCard key={s.id} suspect={s} index={i} />
            ))}
          </div>
        </div>

        {/* evidence board + hints */}
        <div className="space-y-6 lg:col-span-7">
          <div>
            <h2 className="kicker mb-4 flex items-center gap-2">
              <FileSearch size={13} /> The Evidence Board · {progress.cluesDiscovered}/{progress.cluesTotal} uncovered
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:auto-rows-fr">
              {data.clues.map((cl, i) => (
                <ClueCard
                  key={cl.id}
                  clue={cl}
                  index={i}
                  onDiscover={discoverClue}
                  discoveringId={discoveringId}
                  disabled={data.completed}
                />
              ))}
            </div>
          </div>

          <HintPanel
            hintsUsed={progress.hintsUsed}
            hintsTotal={progress.hintsTotal}
            usedHintTexts={usedHints}
            onRequestHint={requestHint}
            busy={hintBusy}
            disabled={data.completed}
          />
        </div>
      </div>

      {/* ───────────── STICKY ACCUSE BAR ───────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-ink-950/85 backdrop-blur-md">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="hidden text-sm text-paper-400 min-[420px]:block">
            Ready to name the killer,
            <span className="font-display italic text-gold-300"> detective?</span>
          </p>
          <div className="flex flex-1 flex-col gap-2 min-[420px]:flex-none min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4">
            <span className="text-center text-[11px] text-paper-500">
              {progress.cluesTotal - progress.cluesDiscovered} clues still hidden · {progress.hintsTotal - progress.hintsUsed} hints left
            </span>
            <Link to={`/case/${id}/accuse`} className="btn btn-danger btn-md min-[420px]:shadow-glow-red group">
              <Gavel size={16} className="transition-transform group-hover:-rotate-6" />
              Make your accusation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaseSkeleton() {
  return (
    <div className="container-page pb-20 pt-14">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="mb-3 h-10 w-2/3 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="mb-8 h-4 w-1/3 animate-pulse rounded bg-white/[0.05]" />
        <div className="panel space-y-3 p-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2.5" style={{ opacity: 1 - i * 0.25 }}>
              <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
              <div className="h-3 w-[92%] animate-pulse rounded bg-white/[0.05]" />
              <div className="h-3 w-[97%] animate-pulse rounded bg-white/[0.05]" />
              <div className="h-3 w-[60%] animate-pulse rounded bg-white/[0.05]" />
            </div>
          ))}
        </div>
        <p className="shimmer-text mt-6 text-center font-type text-xs uppercase tracking-[0.3em]">
          Opening the case file…
        </p>
      </div>
    </div>
  );
}
