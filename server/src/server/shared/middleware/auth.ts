import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set to a strong value (at least 16 characters).');
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabaseAdmin: any = null;
const isSupabaseConfigured = supabaseUrl && 
  supabaseServiceKey && 
  supabaseUrl !== 'https://your-project.supabase.co' && 
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

if (isSupabaseConfigured) {
  try {
    supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);
    console.log('⚡ Server initialized with Supabase Admin/Auth services.');
  } catch (err) {
    console.error('Error initializing server-side Supabase client:', err);
  }
}

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email?: string };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.split(' ')[1] 
    : (req.cookies?.token);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  // 1. Try to verify via Supabase if active
  if (supabaseAdmin) {
    try {
      const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && sbUser) {
        // Map Supabase metadata to user object
        const role = sbUser.app_metadata?.role || sbUser.user_metadata?.role || 'user';
        req.user = {
          id: sbUser.id,
          role: role,
          email: sbUser.email
        };
        return next();
      }
    } catch (sbErr) {
      console.warn('Supabase token verification failed, trying local JWT signature...', sbErr);
    }
  }

  // 2. Fall back to standard JWT verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; email?: string };
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error verifying JWT signature:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  requireAuth(req, res, () => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  });
};
