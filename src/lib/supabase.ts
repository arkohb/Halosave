import { createClient } from '@supabase/supabase-js';

// Read configuration from Vite environment variables
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const hasRealSupabase = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))
);

// Initialize real Supabase client if keys are present
export const supabase = hasRealSupabase 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null;

// Structure for Session and Device tracking
export interface ActiveSession {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  isActiveNow: boolean;
  lastActive: string;
}

// Generate randomized but realistic sessions for simulation
const generateSimulatedSessions = (): ActiveSession[] => {
  return [
    {
      id: 'sess_current',
      deviceType: 'desktop',
      browser: 'Chrome 124.0.0',
      os: 'macOS 14.4.1',
      ipAddress: '102.176.32.14',
      location: 'Accra, Greater Accra (Ghana)',
      isActiveNow: true,
      lastActive: new Date().toISOString(),
    },
    {
      id: 'sess_old_1',
      deviceType: 'mobile',
      browser: 'Safari Mobile 17.4',
      os: 'iOS 17.4.1',
      ipAddress: '102.176.32.89',
      location: 'Kumasi, Ashanti (Ghana)',
      isActiveNow: false,
      lastActive: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4 hours ago
    },
    {
      id: 'sess_old_2',
      deviceType: 'desktop',
      browser: 'Firefox 125.0',
      os: 'Windows 11',
      ipAddress: '197.251.184.2',
      location: 'London, England (UK)',
      isActiveNow: false,
      lastActive: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
    }
  ];
};

// Simulated Local Storage Keys
const SESS_KEY = 'halosave_simulated_sessions';

export const getSimulatedSessions = (): ActiveSession[] => {
  const cached = localStorage.getItem(SESS_KEY);
  if (!cached) {
    const fresh = generateSimulatedSessions();
    localStorage.setItem(SESS_KEY, JSON.stringify(fresh));
    return fresh;
  }
  return JSON.parse(cached);
};

export const terminateSimulatedSession = (id: string): ActiveSession[] => {
  const current = getSimulatedSessions();
  const next = current.filter(s => s.id !== id);
  localStorage.setItem(SESS_KEY, JSON.stringify(next));
  return next;
};
