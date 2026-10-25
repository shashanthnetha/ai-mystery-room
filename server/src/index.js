import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';

import { connectDB } from './config/db.js';
import casesRouter from './routes/cases.js';
import { notFoundHandler, errorHandler } from './utils/errors.js';

export function createApp() {
  const app = express();

  // Behind Render/Heroku-style proxies we still want correct client IPs (rate limiting).
  app.set('trust proxy', 1);

  const rawOrigins = (process.env.CLIENT_URL || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: rawOrigins.includes('*')
        ? true // dev: allow all origins (no auth data in this app)
        : (origin, cb) => cb(null, !origin || rawOrigins.includes(origin)),
    }),
  );

  app.use(express.json({ limit: '100kb' }));

  // Health check (used as Render's health probe).
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/cases', casesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const PORT = Number(process.env.PORT) || 5000;

connectDB()
  .then(() => {
    createApp().listen(PORT, () => {
      console.log(`🔎 AI Mystery Room API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
