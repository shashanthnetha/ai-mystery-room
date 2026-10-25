import { motion } from 'framer-motion';
import { LockKeyhole, Unlock, Search } from 'lucide-react';
import Stamp from './Stamp.jsx';

/**
 * Evidence board card. Locked state shows the label + reveal button;
 * unlocked state (animate on flip) shows the secret content with a stamp.
 */
export default function ClueCard({ clue, index, onDiscover, discoveringId, disabled }) {
  const busy = discoveringId === clue.id;

  if (clue.discovered) {
    return (
      <motion.article
        layout
        initial={{ rotateX: -55, opacity: 0, y: 10 }}
        animate={{ rotateX: 0, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 20 }}
        className="relative border border-gold-500/30 bg-gold-500/[0.05] p-5 [transform-style:preserve-3d]"
      >
        <span className="pin" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <p className="kicker flex items-center gap-1.5">
            <Unlock size={11} /> Evidence · {clue.id.toUpperCase()}
          </p>
          <Stamp variant="moss" size="sm" className="shrink-0">Discovered</Stamp>
        </div>
        <h4 className="mt-3 font-display text-[17px] font-semibold text-gold-200">{clue.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-paper-200/95">{clue.content}</p>
      </motion.article>
    );
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.35 }}
      className={`relative p-5 ${
        index % 2 === 0 ? 'rotate-[0.4deg]' : '-rotate-[0.4deg]'
      } rounded-sm border border-dashed border-white/[0.14] bg-white/[0.02] transition-colors duration-300 ${
        disabled || busy ? '' : 'hover:border-gold-500/50 hover:bg-white/[0.04]'
      }`}
    >
      <span className="pin" aria-hidden />
      <p className="kicker-muted flex items-center gap-1.5">
        <LockKeyhole size={11} /> Evidence · {clue.id.toUpperCase()}
      </p>
      <h4 className="mt-3 font-display text-[17px] font-semibold text-paper-100">{clue.title}</h4>
      <button
        type="button"
        onClick={() => onDiscover(clue)}
        disabled={busy || disabled}
        className="btn btn-outline btn-sm mt-4 w-full !tracking-[0.14em] font-type uppercase"
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-gold-400/40 border-t-gold-400" />
            Framing the photo…
          </span>
        ) : (
          <>
            <Search size={13} />
            Reveal evidence
          </>
        )}
      </button>
    </motion.article>
  );
}
