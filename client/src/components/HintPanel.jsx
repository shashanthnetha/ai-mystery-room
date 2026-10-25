import { Lightbulb, Sparkles } from 'lucide-react';
import Stamp from './Stamp.jsx';

/**
 * "Consult the Oracle" hint panel. Hints are revealed sequentially by
 * POST /hints; each costs −10 points at scoring time.
 */
export default function HintPanel({ hintsUsed, hintsTotal, usedHintTexts, onRequestHint, busy, disabled }) {
  const remaining = hintsTotal - hintsUsed;

  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="kicker flex items-center gap-2">
          <Sparkles size={12} /> Consult the Oracle
        </h3>
        <span className="font-type text-[11px] text-paper-500">
          {hintsUsed}/{hintsTotal} used
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {usedHintTexts.map((text, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-3.5"
          >
            <Lightbulb size={15} className="mt-0.5 shrink-0 text-gold-400" />
            <p className="text-[13px] italic leading-relaxed text-paper-200/90">{text}</p>
          </div>
        ))}

        {usedHintTexts.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/[0.1] p-4 text-center text-xs text-paper-500">
            No hints revealed yet. The oracle is listening — but every whisper costs points.
          </p>
        )}
      </div>

      {remaining > 0 ? (
        <button
          type="button"
          onClick={onRequestHint}
          disabled={busy || disabled}
          className="btn btn-outline btn-sm mt-4 w-full !tracking-[0.16em] font-type uppercase"
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-gold-400/40 border-t-gold-400" />
              Channeling…
            </span>
          ) : (
            `Request a hint · −10 pts`
          )}
        </button>
      ) : (
        <div className="mt-4">
          <Stamp variant="paper" size="sm" className="w-full justify-center">
            The oracle has spoken its last
          </Stamp>
        </div>
      )}
    </section>
  );
}
