import { Component, useEffect } from 'react';
import { useLocation, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Atmosphere from './components/Atmosphere.jsx';
import Home from './pages/Home.jsx';
import Create from './pages/Create.jsx';
import Case from './pages/Case.jsx';
import Accuse from './pages/Accuse.jsx';
import Result from './pages/Result.jsx';
import NotFound from './pages/NotFound.jsx';

/* Full-render crash guard — better a styled panel than a white screen. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="container-page py-24">
          <div className="panel border-blood-500/25 p-8">
            <p className="kicker text-blood-400">Case file corrupted</p>
            <h1 className="headline mt-2 text-2xl">Something shattered in the evidence room.</h1>
            <p className="mt-2 text-sm text-paper-400">{String(this.state.error?.message || this.state.error)}</p>
            <button className="btn btn-primary btn-md mt-6" onClick={() => window.location.assign('/')}>
              Return to HQ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AnimatedRoutes() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="flex min-h-[calc(100vh-4rem)] flex-col"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/case/:id" element={<Case />} />
          <Route path="/case/:id/accuse" element={<Accuse />} />
          <Route path="/case/:id/result" element={<Result />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Atmosphere />
        <Navbar />
        <AnimatedRoutes />
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
