import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/projects.routes';
import globalRoutes from './routes/global.routes';

const app = express();

// ── Trust proxy (for Render deployment) ────────────────────────────────────────
app.set('trust proxy', 1);

// ── Security headers ───────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check (Exempt from rate limiting & auth for deployment health probes) ──────
app.get(['/health', '/'], (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ── General rate limiting ──────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: config.rateLimit.general.windowMs,
    max: config.rateLimit.general.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health' || req.path === '/',
    message: { error: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  })
);

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', globalRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'SERVER_ERROR', message: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🔐 DevVault API running on port ${PORT} [${config.nodeEnv}]`);
});

export default app;
