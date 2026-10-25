import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Trash2 } from 'lucide-react';
import { DIFFICULTY_INFO } from '../lib/difficulty.js';

/** Recent-case row for the Home archive (device-local). */
export default function CaseCard({ c, onForget }) {
  const info = DIFFICULTY_INFO[c.difficulty] || null;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="panel panel-hover flex flex-wrap items-center gap-4 px-5 py-4"
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-display text-base font-semibold text-paper-100">
          {c.title || 'Untitled case'}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
          {info && <span className="chip chip-gold py-0.5">{info.label}</span>}
          {c.status === 'solved' ? (
            <span className="chip chip-moss py-0.5">Solved</span>
          ) : (
            <span className="chip py-0.5">Open case</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={c.status === 'solved' ? `/case/${c.id}/result` : `/case/${c.id}`}
          className="btn btn-primary btn-sm"
        >
          {c.status === 'solved' ? 'View verdict' : 'Resume'} <ArrowRight size={13} />
        </Link>
        <button
          type="button"
          onClick={() => onForget(c.id)}
          className="btn btn-ghost btn-sm !px-2 text-paper-500 hover:text-blood-400"
          aria-label={`Forget case ${c.title}`}
          title="Clear this case file"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}
