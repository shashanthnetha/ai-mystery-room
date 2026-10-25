import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, FileSearch, Fingerprint, Gavel, Lightbulb, Search, Sparkles, X } from 'lucide-react';

import DifficultyCard from '../components/DifficultyCard.jsx';
import CaseCard from '../components/CaseCard.jsx';
import Stamp from '../components/Stamp.jsx';
import { getRecentCases, forgetCase } from '../lib/storage.js';
import { DIFFICULTY_ORDER } from '../lib/difficulty.js';

const STEPS = [
  { n: '01', icon: Fingerprint, title: 'Brief the oracle', text: 'Give Gemini a premise — then choose Easy, Medium, or Hard.' },
  { n: '02', icon: FileSearch, title: 'Enter the room', text: 'Read the story, study the suspects, weigh every alibi.' },
  { n: '03', icon: Lightbulb, title: 'Follow the trail', text: 'Reveal hidden evidence; spend hints only if you dare.' },
  { n: '04', icon: Gavel, title: 'Name the culprit', text: 'One accusation. The verdict — and your score — are sealed.' },
];

const FLOATERS = [
  { ch: '?', top: '14%', left: '8%', size: 180, tilt: '-14deg', dur: '11s', o: 0.05 },
  { ch: '?', top: '58%', left: '3%', size: 90, tilt: '9deg', dur: '9s', o: 0.06 },
  { ch: '?', top: '18%', left: '88%', size: 140, tilt: '10deg', dur: '12s', o: 0.05 },
  { ch: '?', top: '66%', left: '92%', size: 70, tilt: '-8deg', dur: '8s', o: 0.07 },
  { ch: '†', top: '34%', left: '94%', size: 60, tilt: '6deg', dur: '10s', o: 0.06 },
  { ch: '?', top: '78%', left: '16%', size: 52, tilt: '12deg', dur: '13s', o: 0.05 },
];

export default function Home() {
  const [recents, setRecents] = useState([]);

  useEffect(() => {
    setRecents(getRecentCases());
  }, []);

  const hasRecents = recents.length > 0;

  return (
    <div>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative overflow-hidden pb-20 pt-20 sm:pt-28">
        {/* floating glyph field */}
        {FLOATERS.map((f, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute select-none font-display font-bold text-paper-100"
            style={{
              top: f.top,
              left: f.left,
              fontSize: f.size,
              opacity: f.o,
              ['--tilt']: f.tilt,
              animation: `float-slow ${f.dur} ease-in-out infinite`,
            }}
          >
            {f.ch}
          </span>
        ))}

        <div className="container-page relative text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Stamp variant="gold" size="sm" className="mb-8">
              Case File № 001 · Classified
            </Stamp>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="headline mx-auto max-w-4xl text-5xl leading-[1.06] sm:text-7xl"
          >
            Every room hides a{' '}
            <em className="shimmer-text font-display italic">secret.</em>
            <br />
            Every clue tells{' '}
            <span className="text-gold-300">a story.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-paper-400 sm:text-lg"
          >
            Step into an interrogation room built by AI. Give Gemini one premise and receive an
            original fair-play murder mystery — study the suspects, unlock the evidence, and put
            your finger on the culprit.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link to="/create" className="btn btn-primary btn-lg group">
              Open a New Case
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a href="#how" className="btn btn-outline btn-lg">
              How it works
            </a>
          </motion.div>

          {/* stat strip */}
          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="mx-auto mt-16 grid max-w-2xl grid-cols-1 divide-y divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            {[
              ['∞', 'unique mysteries'],
              ['3', 'difficulty tiers'],
              ['0', 'leaked culprits'],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col items-center gap-1 px-6 py-5">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-3xl font-bold text-gold-300">{v}</dd>
                <dd className="font-type text-[10px] uppercase tracking-[0.24em] text-paper-500">{l}</dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </section>

      {/* ───────────────────── HOW IT WORKS ───────────────────── */}
      <section id="how" className="scroll-mt-24 pt-10">
        <div className="container-page">
          <div className="text-center">
            <p className="kicker">The Procedure</p>
            <h2 className="headline mt-2 text-3xl sm:text-4xl">Four steps to a solved case</h2>
          </div>

          <ol className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className="panel panel-hover relative overflow-hidden p-6"
              >
                <span className="pointer-events-none absolute -right-1 -top-4 font-display text-[80px] font-bold leading-none text-white/[0.04]">
                  {s.n}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/[0.07] text-gold-400">
                  <s.icon size={19} strokeWidth={1.8} />
                </span>
                <h3 className="headline mt-4 text-lg">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-400">{s.text}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─────────────────────── DIFFICULTY ─────────────────────── */}
      <section className="pt-24">
        <div className="container-page">
          <div className="text-center">
            <p className="kicker">Choose Your Poison</p>
            <h2 className="headline mt-2 text-3xl sm:text-4xl">Three tiers of treachery</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-paper-400">
              More suspects, more evidence, sharper red herrings. Scores rise with the danger.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {DIFFICULTY_ORDER.map((d, i) => (
              <motion.div
                key={d}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
              >
                <DifficultyCard difficulty={d} />
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/create" className="btn btn-primary btn-md">
              <Sparkles size={16} />
              Start playing free
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────── CASE ARCHIVE ───────────────────── */}
      {hasRecents && (
        <section className="pt-24 pb-4">
          <div className="container-page">
            <div className="flex items-center justify-between">
              <div>
                <p className="kicker">Your Archive</p>
                <h2 className="headline mt-2 text-2xl sm:text-3xl">Recent case files</h2>
              </div>
              <span className="font-type text-[10px] uppercase tracking-[0.2em] text-paper-500">on this device</span>
            </div>

            <div className="mt-7 space-y-3">
              <AnimatePresence initial={false}>
                {recents.map((c) => (
                  <CaseCard
                    key={c.id}
                    c={c}
                    onForget={(id) => setRecents(forgetCase(id))}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
