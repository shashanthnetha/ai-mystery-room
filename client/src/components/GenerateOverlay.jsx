import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';

const STATUS_LINES = [
  'Awakening the Gemini oracle…',
  'Sketching the crime scene…',
  'Summoning the suspects…',
  'Planting red herrings…',
  'Hiding the evidence…',
  'Cross-checking alibis…',
  'Sealing the case file…',
];

/** Full-screen generation overlay with rotating noir status lines. */
export default function GenerateOverlay({ title = 'Wrapping the case' }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % STATUS_LINES.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-ink-950/92 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col items-center px-6 text-center">
        <div className="relative mb-9 flex h-24 w-24 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/[0.06]" style={{ animation: 'pulse-ring 2.2s ease-out infinite' }}>
          <Search size={36} className="text-gold-400" strokeWidth={1.6} />
          <motion.div
            className="absolute inset-0 rounded-full border border-gold-400/25"
            animate={{ rotate: 360 }}
            transition={{ duration: 9, ease: 'linear', repeat: Infinity }}
            style={{ borderStyle: 'dashed' }}
          />
        </div>

        <p className="font-type text-xs uppercase tracking-[0.3em] text-gold-500">{title}</p>

        <div className="mt-5 h-7">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="font-display text-xl italic text-paper-200"
            >
              {STATUS_LINES[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-7 h-[3px] w-56 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full w-1/3 rounded-full bg-gold-400"
            style={{ animation: 'progress-slide 1.6s ease-in-out infinite' }}
          />
        </div>

        <p className="mt-6 max-w-xs text-xs leading-relaxed text-paper-500">
          Gemini is writing an original fair-play mystery for you. The culprit stays hidden in
          the vault until you make your accusation.
        </p>
      </div>

      <style>{`@keyframes progress-slide { 0% { transform: translateX(-120%); } 100% { transform: translateX(420%); } }`}</style>
    </div>
  );
}
