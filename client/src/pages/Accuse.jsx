import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gavel, Ruler, X } from 'lucide-react';

import { SuspectAvatar } from '../components/SuspectCard.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import GenerateOverlay from '../components/GenerateOverlay.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Stamp from '../components/Stamp.jsx';
import api, { apiCall, getErrorMessage } from '../lib/api.js';
import { DIFFICULTY_INFO } from '../lib/difficulty.js';
import { rememberCase } from '../lib/storage.js';

export default function Accuse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/cases/${id}`)
      .then((res) => {
        if (!alive) return;
        const pub = res.data.case;
        if (pub.completed) {
          rememberCase({ id, title: pub.title, difficulty: pub.difficulty, status: 'solved' });
          navigate(`/case/${id}/result`, { replace: true });
          return;
        }
        setCaseData(pub);
        setLoadError(null);
      })
      .catch((err) => alive && setLoadError(getErrorMessage(err, 'This case file could not be opened.')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, navigate]);

  async function handleConfirm() {
    if (!selected || submitting) return;
    setSubmitting(true);
    const [data, err] = await apiCall(api.post(`/cases/${id}/accuse`, { suspectId: selected }));
    if (err) {
      setSubmitError(err);
      setSubmitting(false);
      setConfirming(false);
      return;
    }
    rememberCase({ id, title: caseData.title, difficulty: caseData.difficulty, status: 'solved' });
    navigate(`/case/${id}/result`, { state: { verdict: data.result } });
  }

  if (loading) return <AccuseSkeleton />;
  if (loadError || !caseData) {
    return (
      <div className="container-page py-20">
        <ErrorState message={loadError || 'This case file could not be opened.'} />
      </div>
    );
  }

  const info = DIFFICULTY_INFO[caseData.difficulty] || {};
  const selectedName = caseData.suspects.find((s) => s.id === selected)?.name;

  return (
    <div className="container-page pb-24 pt-10 sm:pt-14">
      {submitting && <GenerateOverlay title="Delivering the verdict" />}
      {submitError && (
        <div className="mx-auto mb-8 max-w-3xl">
          <ErrorState message={submitError} onRetry={() => setSubmitError(null)} />
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Stamp variant="blood" size="sm" className="mb-6">Final Verdict</Stamp>
          <h1 className="headline text-4xl sm:text-5xl">
            Point your <em className="text-blood-400 italic">finger</em>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-paper-400 sm:text-base">
            One name ends the night. Choose the suspect you believe killed {caseData.victim.split(/\s+[—-]\s+/)[0].trim()} —
            once confirmed, the case closes and the truth comes out.
          </p>
        </motion.div>

        {/* progress recap */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <span className="chip chip-gold">
            <Ruler size={12} /> {info.label}
          </span>
          <span className="chip">{caseData.cluesDiscovered}/{caseData.cluesTotal} clues uncovered</span>
          <span className="chip">{caseData.hintsUsed}/{caseData.hintsTotal} hints spent</span>
        </div>

        {/* suspect selection */}
        <div className="mt-9 space-y-3" role="radiogroup" aria-label="Accuse a suspect">
          {caseData.suspects.map((s, i) => {
            const active = selected === s.id;
            return (
              <motion.button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(s.id)}
                whileTap={{ scale: 0.99 }}
                className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-250 ${
                  active
                    ? 'border-blood-500/60 bg-blood-500/[0.07] shadow-glow-red'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18]'
                }`}
              >
                <SuspectAvatar name={s.name} index={i} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold text-paper-100">{s.name}</span>
                    <span className="kicker-muted">{s.role}</span>
                  </span>
                  <span className="mt-1.5 block line-clamp-2 text-[13px] leading-relaxed text-paper-400">
                    {s.description}
                  </span>
                  <span className={`mt-2 block truncate font-type text-[12px] italic text-paper-500 transition-opacity ${active ? 'opacity-90' : 'opacity-70'}`}>
                    “{s.alibi}”
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                    active ? 'border-blood-400 bg-blood-500 text-paper-50' : 'border-white/20 text-transparent'
                  }`}
                >
                  {active ? <Gavel size={12} strokeWidth={2.5} /> : <X size={12} opacity={0.35} />}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-9 flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={!selected}
            onClick={() => setConfirming(true)}
            className="btn btn-danger btn-lg w-full sm:w-auto sm:min-w-80"
          >
            <Gavel size={18} />
            Accuse {selectedName || 'a suspect'}
          </button>
          <p className="font-type text-[10px] uppercase tracking-[0.22em] text-paper-500">
            Scoring happens at HQ · clues +5 · hints −10 · min 0
          </p>
        </div>
      </div>

      <ConfirmModal
        open={confirming}
        title="This is final, detective."
        confirmLabel={`Accuse ${selectedName || ''}`}
        onConfirm={handleConfirm}
        onCancel={() => !submitting && setConfirming(false)}
        busy={submitting}
      >
        You are accusing <strong className="text-paper-200">{selectedName}</strong> of murder.
        Once confirmed, the verdict is sealed and there are no take-backs. The culprit, the
        explanation, and your final score will be revealed.
      </ConfirmModal>
    </div>
  );
}

function AccuseSkeleton() {
  return (
    <div className="container-page pb-20 pt-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 h-10 w-2/3 mx-auto animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="panel h-24 animate-pulse p-5" style={{ opacity: 1 - i * 0.2 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
