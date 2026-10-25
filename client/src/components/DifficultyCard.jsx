import { motion } from 'framer-motion';
import { Fingerprint, FileSearch, Lightbulb, Check } from 'lucide-react';
import { DIFFICULTY_INFO, DIFFICULTY_ORDER } from '../lib/difficulty.js';

/**
 * Difficulty selector card (shared by Create + Home).
 * `selected` is only honoured when `onSelect` is provided (create mode).
 */
export default function DifficultyCard({ difficulty, selected, onSelect }) {
  const info = DIFFICULTY_INFO[difficulty];
  if (!info) return null;
  const interactive = typeof onSelect === 'function';

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-2xl font-semibold text-paper-100">{info.label}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-paper-400">{info.blurb}</p>
        </div>
        {interactive && (
          <span
            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
              selected
                ? 'border-gold-400 bg-gold-400 text-ink-950'
                : 'border-white/20 bg-transparent text-transparent'
            }`}
          >
            <Check size={13} strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4">
        <Stat icon={Fingerprint} value={info.suspects} label="suspects" />
        <Stat icon={FileSearch} value={info.clues} label="clues" />
        <Stat icon={Lightbulb} value={info.hints} label="hints" />
      </div>

      <p className="mt-4 font-type text-[11px] uppercase tracking-[0.18em] text-gold-500/90">
        Correct accusation · {info.base} pts
      </p>
    </>
  );

  const cls = `relative rounded-2xl border p-5 transition-all duration-300 ${
    selected
      ? 'border-gold-400/70 bg-gold-500/[0.07] shadow-glow-gold'
      : 'border-white/[0.08] bg-white/[0.03]'
  } ${interactive ? 'cursor-pointer hover:border-gold-500/40' : ''}`;

  if (!interactive) {
    return (
      <div className={`${cls} hover:border-gold-500/30 hover:-translate-y-1 panel-hover`}>{content}</div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(difficulty)}
      className={`${cls} text-left`}
      whileTap={{ scale: 0.985 }}
      aria-pressed={selected}
    >
      {content}
    </motion.button>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-white/[0.03] py-2.5">
      <Icon size={14} className="text-gold-500" />
      <span className="font-display text-lg font-semibold leading-none text-paper-100">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.16em] text-paper-500">{label}</span>
    </div>
  );
}

export { DIFFICULTY_ORDER };
