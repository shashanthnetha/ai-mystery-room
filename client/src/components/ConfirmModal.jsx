import { AnimatePresence, motion } from 'framer-motion';
import { AlertOctagon } from 'lucide-react';

/** Confirmation dialog used before the final accusation. */
export default function ConfirmModal({ open, title, children, confirmLabel, onConfirm, onCancel, busy }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="absolute inset-0 bg-ink-950/85 backdrop-blur-sm"
            onClick={busy ? undefined : onCancel}
          />
          <motion.div
            initial={{ scale: 0.92, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-blood-500/30 bg-ink-900 p-7 shadow-2xl"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blood-500/40 bg-blood-500/10 text-blood-400">
                <AlertOctagon size={18} />
              </span>
              <h2 className="font-display text-xl font-semibold text-paper-100">{title}</h2>
            </div>
            <div className="text-sm leading-relaxed text-paper-400">{children}</div>
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={onCancel} disabled={busy} className="btn btn-outline btn-md">
                More investigating
              </button>
              <button type="button" onClick={onConfirm} disabled={busy} className="btn btn-danger btn-md">
                {busy ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper-50/40 border-t-paper-50" />
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
