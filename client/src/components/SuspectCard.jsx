import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

export function SuspectAvatar({ name, index, size = 'md' }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const dims = size === 'md' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';
  return (
    <span
      className={`avatar-${(index % 5) + 1} ${dims} flex shrink-0 items-center justify-center rounded-full font-display font-bold text-ink-950 shadow-[inset_0_-6px_12px_rgba(0,0,0,0.25)]`}
      aria-hidden
    >
      {initials || '?'}
    </span>
  );
}

export default function SuspectCard({ suspect, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4, ease: 'easeOut' }}
      className="panel panel-hover relative overflow-hidden p-5"
    >
      <span className="pointer-events-none absolute -right-2 -top-3 font-display text-[64px] font-bold leading-none text-white/[0.045]" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="flex items-start gap-4">
        <SuspectAvatar name={suspect.name} index={index} />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-tight text-paper-100">
            {suspect.name}
          </h3>
          <p className="kicker-muted mt-1">{suspect.role}</p>
        </div>
      </div>

      <p className="mt-3.5 text-sm leading-relaxed text-paper-300/90">{suspect.description}</p>

      <div className="mt-4 rounded-r-lg border-l-2 border-gold-500/40 bg-gold-500/[0.05] py-2.5 pl-3.5 pr-3">
        <p className="flex items-center gap-1.5 font-type text-[10px] uppercase tracking-[0.2em] text-gold-500/80">
          <Quote size={10} /> Claimed alibi
        </p>
        <p className="mt-1.5 font-type text-[13px] italic leading-relaxed text-paper-400">
          “{suspect.alibi}”
        </p>
      </div>
    </motion.article>
  );
}
