import { AlertTriangle, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

/** Shared inline error card. */
export default function ErrorState({ message, onRetry, compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`panel border-blood-500/25 bg-blood-500/[0.05] ${compact ? 'p-4' : 'p-6 sm:p-8'}`}
      role="alert"
    >
      <div className="flex items-start gap-4">
        <span className={`flex shrink-0 items-center justify-center rounded-full border border-blood-500/40 bg-blood-500/10 text-blood-400 ${compact ? 'h-8 w-8' : 'h-11 w-11'}`}>
          <AlertTriangle size={compact ? 15 : 19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-blood-400 ${compact ? 'text-sm' : 'text-base'}`}>
            The trail went cold
          </p>
          <p className={`mt-1 text-paper-400 ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>
            {message || 'Something unexpected happened. Please try again.'}
          </p>
          {onRetry && (
            <button onClick={onRetry} className="btn btn-outline btn-sm mt-4">
              <RotateCcw size={14} />
              Retry
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
