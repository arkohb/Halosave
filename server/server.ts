import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { router as apiRouter } from './src/server/routes/index.ts';
import { errorHandler } from './src/server/shared/middleware/errorHandler.ts';

// ============================================================
// HaloSave API — Railway service (API only).
// The frontend is a separate Vite SPA deployed on Netlify.
// Set ALLOWED_ORIGIN to your Netlify URL(s), comma-separated.
// ============================================================

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Trust the Railway proxy layer so rate-limiting and client IPs work correctly.
  app.set('trust proxy', 1);

  // Security headers. CSP relaxed because the sandbox checkout page is served
  // from this origin with inline scripts.
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS: in production, lock to the Netlify frontend origin(s).
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (isProd && !allowedOrigin) {
    console.warn(
      '⚠️  ALLOWED_ORIGIN is not set. Set it to your Netlify URL, e.g. https://halosave.netlify.app'
    );
  }
  app.use(
    cors({
      origin: isProd && allowedOrigin
        ? allowedOrigin.split(',').map((o) => o.trim())
        : true,
      credentials: true,
    })
  );

  // Capture the raw body so the Paystack webhook can verify the HMAC signature
  // against the exact bytes Paystack signed (not a re-stringified object).
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // Rate limit sensitive auth + payment endpoints to slow brute-force / abuse.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many attempts. Please try again later.' },
  });
  app.use('/api/auth', authLimiter);
  app.use('/api/payments', authLimiter);

  // Health check (Railway healthcheck path: /api/health)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'HaloSave Core API', version: '2.1.0-split' });
  });

  // Friendly root response so hitting the Railway URL directly isn't a 404.
  app.get('/', (_req, res) => {
    res.json({
      service: 'HaloSave API',
      status: 'running',
      docs: 'This service only serves /api/* routes. The app UI is hosted on Netlify.',
    });
  });

  // Mount API layer + global error handler
  app.use('/api', apiRouter);
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HaloSave API running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal: failed to start HaloSave API', err);
  process.exit(1);
});
