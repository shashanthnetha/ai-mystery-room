import { Link, NavLink, useLocation } from 'react-router-dom';
import { Search, Feather } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const inGame = location.pathname.startsWith('/case');
  const linkCls = ({ isActive }) =>
    `text-[13px] font-medium tracking-wide transition-colors duration-200 hover:text-gold-300 ${
      isActive ? 'text-gold-300' : 'text-paper-400'
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="group flex items-center gap-3" aria-label="AI Mystery Room home">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-400 transition-all duration-300 group-hover:rotate-12 group-hover:shadow-glow-gold">
            <Search size={17} strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-type text-[13px] uppercase tracking-[0.28em] text-paper-100">
              Mystery Room
            </span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.32em] text-paper-500">
              AI Case Files
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <NavLink to="/" className={linkCls} end>
            <span className="rounded-lg px-3 py-2">Home</span>
          </NavLink>
          {!inGame && (
            <NavLink to="/create" className={linkCls}>
              <span className="rounded-lg px-3 py-2">Open a New Case</span>
            </NavLink>
          )}
          {inGame && (
            <NavLink to="/create" className={linkCls}>
              <span className="hidden rounded-lg px-3 py-2 sm:inline">New Case</span>
              <span className="rounded-lg px-3 py-2 sm:hidden">
                <Feather size={16} />
              </span>
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
