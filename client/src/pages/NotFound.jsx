import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';
import Stamp from '../components/Stamp.jsx';

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center pb-24 pt-24 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Stamp variant="blood" size="lg">404 · Case Not Found</Stamp>
        <h1 className="headline mt-9 text-4xl sm:text-5xl">This room was never built.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-paper-400">
          Maybe the evidence was destroyed, the address was wrong, or fate intervened. HQ has
          plenty of real cases waiting.
        </p>
        <span className="mt-8 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-paper-500">
          <SearchX size={24} />
        </span>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link to="/" className="btn btn-primary btn-md">Return to HQ</Link>
          <Link to="/create" className="btn btn-outline btn-md">Open a new case</Link>
        </div>
      </motion.div>
    </div>
  );
}
