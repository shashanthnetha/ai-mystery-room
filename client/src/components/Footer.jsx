import { Search } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.06] py-10">
      <div className="container-page flex flex-col items-center gap-3 text-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-500/30 text-gold-500">
          <Search size={14} />
        </span>
        <p className="font-type text-[11px] uppercase tracking-[0.3em] text-paper-500">
          The AI Mystery Room
        </p>
        <p className="text-xs text-paper-500/80">
          React · Express · MongoDB · Gemini — mysteries generated, scored and sealed server-side.
        </p>
      </div>
    </footer>
  );
}
