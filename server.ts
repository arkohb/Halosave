import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { router as apiRouter } from './src/server/routes/index.ts';
import { errorHandler } from './src/server/shared/middleware/errorHandler.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Trust the Railway/proxy layer so rate-limiting and IPs work correctly.
  app.set('trust proxy', 1);

  // Security headers. CSP is disabled here because the SPA + Vite need inline assets;
  // tighten this with an explicit CSP once your asset origins are known.
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS: lock to your own origin in production via ALLOWED_ORIGIN, open in dev.
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  app.use(cors({
    origin: isProd && allowedOrigin ? allowedOrigin.split(',').map(o => o.trim()) : true,
    credentials: true,
  }));

  // Capture the raw body so the Paystack webhook can verify the HMAC signature
  // against the exact bytes Paystack signed (not a re-stringified object).
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
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

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'HaloSave Core API', version: '2.0.0-prod' });
  });

  // Mount clean enterprise API layer
  app.use('/api', apiRouter);

  // Mount global enterprise error handler middleware
  app.use(errorHandler);

  // Vite development middleware vs Static production build
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HaloSave Fintech Server running on port ${PORT}`);
  });
}

startServer();
