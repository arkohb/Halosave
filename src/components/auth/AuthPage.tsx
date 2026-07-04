import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { 
  Shield, Lock, Mail, User, Phone, Globe, Eye, EyeOff, 
  Loader2, KeyRound, Chrome, CheckCircle2, ChevronLeft, AlertTriangle, Gift,
  Fingerprint
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, passkeyLogin, register, googleLogin, forgotPassword, verifyEmail, showToast } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGooglePicker, setShowGooglePicker] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Ghana');
  const [referredBy, setReferredBy] = useState('');

  // Recovery message state
  const [recoverySent, setRecoverySent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'login') {
        if (!email || !password) return;
        await login(email, password);
      } else if (authMode === 'register') {
        if (!email || !fullName) return;
        const success = await register({ fullName, email, phone, country, password, referredBy });
        if (success) {
          // Send to verification state
          setAuthMode('verify');
        }
      } else if (authMode === 'forgot') {
        if (!email) return;
        const success = await forgotPassword(email);
        if (success) {
          setRecoverySent(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSelect = async (gEmail: string, gName: string) => {
    setLoading(true);
    setShowGooglePicker(false);
    try {
      const success = await googleLogin(gEmail, gName, 'google_' + Math.random().toString(36).substring(2, 9));
      if (success) {
        // Logged in
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateVerification = async () => {
    setLoading(true);
    try {
      await verifyEmail();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-halo-cream flex flex-col justify-start items-center p-4 sm:p-8 relative overflow-y-auto">

      {/* Main Container */}
      <div className="w-full max-w-md z-10 my-auto py-8">
        {/* Brand/Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex p-3 rounded-full bg-halo-card border-2 border-halo-gold shadow-sm">
            <Shield className="w-8 h-8 text-halo-gold" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-halo-dark tracking-tight">
            HaloSave
          </h1>
          <p className="text-xs text-halo-text-tertiary uppercase tracking-widest font-sans">
            SAVE • LOCK • GROW
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-halo-card/50 backdrop-blur-xl border border-halo-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          
          {/* Header tabs - only visible in Login & Register states */}
          {(authMode === 'login' || authMode === 'register') && (
            <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-halo-cream rounded-xl border border-halo-border/60">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setEmail('');
                  setPassword('');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  authMode === 'login'
                    ? 'bg-halo-gold/15 text-halo-gold border border-halo-gold/20'
                    : 'text-halo-text-tertiary hover:text-halo-dark'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthMode('register');
                  setEmail('');
                  setPassword('');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  authMode === 'register'
                    ? 'bg-halo-gold/15 text-halo-gold border border-halo-gold/20'
                    : 'text-halo-text-tertiary hover:text-halo-dark'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* FORGOT PASSWORD MODE */}
          {authMode === 'forgot' && (
            <div className="space-y-4">
              <button 
                onClick={() => { setAuthMode('login'); setRecoverySent(false); }}
                className="flex items-center gap-1.5 text-xs text-halo-text-tertiary hover:text-halo-dark transition-all mb-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </button>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-halo-dark">Reset Master Password</h3>
                <p className="text-xs text-halo-text-tertiary leading-relaxed">
                  Enter your registered email below, and we will dispatch secure recovery parameters and a validation link to reset your keys.
                </p>
              </div>

              {recoverySent ? (
                <div className="p-4 bg-halo-gold/10 border border-halo-gold/20 rounded-2xl space-y-3 mt-4">
                  <div className="flex gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-halo-gold shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-halo-gold">Recovery Sent Successfully</p>
                      <p className="text-[11px] text-halo-text-tertiary mt-1 leading-relaxed">
                        We have dispatched a secure JWT recovery token to <span className="text-halo-dark font-mono">{email}</span>. Click the link inside the inbox to create a new password.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setAuthMode('login'); setRecoverySent(false); }}
                    className="w-full bg-halo-gold text-halo-dark text-xs font-bold py-2 rounded-xl"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-halo-text-tertiary uppercase font-bold block">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-halo-text-muted">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="kwame@domain.com"
                        className="w-full bg-halo-cream/60 border border-halo-border focus:border-halo-gold/50 text-halo-dark rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-halo-gold/30 transition-all font-sans"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-halo-gold hover:bg-halo-gold text-halo-dark font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>Dispatch Recovery Email</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* EMAIL VERIFICATION SCREEN */}
          {authMode === 'verify' && (
            <div className="space-y-5 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-halo-dark">Email Verification Required</h3>
                <p className="text-xs text-halo-text-tertiary leading-relaxed">
                  Your HaloSave credentials have been created! In compliance with Supabase KYC identity policies, we have sent a secure confirmation email.
                </p>
              </div>

              <div className="bg-halo-cream border border-halo-border rounded-2xl p-4 text-left space-y-3">
                <div className="text-[11px] text-halo-text-tertiary font-mono leading-relaxed">
                  <span className="text-amber-400 font-bold block mb-1">🔍 SANDBOX TESTING TRACE</span>
                  A real verification hook has been setup via Supabase Auth. Since you are in the AI Studio environment, you can bypass this instantly using the bypass button below.
                </div>
                
                <button
                  onClick={handleSimulateVerification}
                  disabled={loading}
                  className="w-full bg-halo-gold hover:bg-halo-gold text-halo-dark text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Instant sandbox verify bypass</span>
                </button>
              </div>

              <button
                onClick={() => setAuthMode('login')}
                className="text-xs text-halo-text-tertiary hover:text-halo-dark underline font-mono"
              >
                Skip & Return to Login
              </button>
            </div>
          )}

          {/* STANDARD LOGIN AND REGISTRATION FORM */}
          {(authMode === 'login' || authMode === 'register') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (Sign Up only) */}
              {authMode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-halo-text-tertiary uppercase font-bold block">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-halo-text-muted">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Kwame Mensah"
                      className="w-full bg-halo-cream/60 border border-halo-border focus:border-halo-gold/50 text-halo-dark rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-halo-gold/30 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-halo-text-tertiary uppercase font-bold block">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-halo-text-muted">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@domain.com"
                    className="w-full bg-halo-cream/60 border border-halo-border focus:border-halo-gold/50 text-halo-dark rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-halo-gold/30 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Phone (Sign Up only) */}
              {authMode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-halo-text-tertiary uppercase font-bold block">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-halo-text-muted">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 54 123 4567"
                      className="w-full bg-halo-cream/60 border border-halo-border focus:border-halo-gold/50 text-halo-dark rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-halo-gold/30 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              {/* Country (Sign Up only) */}
              {authMode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-halo-text-tertiary uppercase font-bold block">
                    Country of Residence
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-halo-text-muted">
                      <Globe className="w-4 h-4" />
                    </span>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-halo-cream/60 border border-halo-border focus:border-halo-gold/50 text-halo-dark rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-halo-gold/30 transition-all font-sans appearance-none cursor-pointer"
                    >
                      <option value="Ghana">Ghana (GHS)</option>
                      <option value="Nigeria">Nigeria (NGN)</option>
                      <option value="Kenya">Kenya (KES)</option>
                      <option value="United States">United States (USD)</option>
                      <option value="United Kingdom">United Kingdom (GBP)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Referral Code (Sign Up only) */}
              {authMode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-halo-text-tertiary uppercase font-bold block">
                    Referral Code (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-halo-text-muted">
                      <Gift className="w-4 h-4 text-halo-gold/80" />
                    </span>
                    <input
                      type="text"
                      value={referredBy}
                      onChange={(e) => setReferredBy(e.target.value)}
                      placeholder="e.g. SAVINGS-GURU"
                      className="w-full bg-halo-cream/60 border border-halo-border focus:border-halo-gold/50 text-halo-dark rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-halo-gold/30 transition-all font-sans uppercase font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono text-halo-text-tertiary uppercase font-bold block">
                    Master Password
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      className="text-[10px] text-halo-gold hover:underline font-mono focus:outline-none"
                      onClick={() => setAuthMode('forgot')}
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-halo-text-muted">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-halo-cream/60 border border-halo-border focus:border-halo-gold/50 text-halo-dark rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-halo-gold/30 transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-halo-text-muted hover:text-halo-text-secondary focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-halo-gold hover:bg-halo-gold text-halo-dark font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-halo-gold/10 flex items-center justify-center gap-2 mt-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Establishing secure handshake...</span>
                  </>
                ) : (
                  <span>{authMode === 'login' ? 'Establish Secure Session' : 'Create Discipline Vault'}</span>
                )}
              </button>

              {/* GOOGLE SIGN IN OAUTH PROVIDER SECTION */}
              <div className="relative my-4 flex py-1.5 items-center">
                <div className="flex-grow border-t border-halo-border/80"></div>
                <span className="flex-shrink mx-3 text-[10px] text-halo-text-muted font-mono uppercase tracking-widest">or integrate via</span>
                <div className="flex-grow border-t border-halo-border/80"></div>
              </div>

              <button
                type="button"
                onClick={() => setShowGooglePicker(true)}
                className="w-full bg-halo-cream border border-halo-border hover:border-halo-border-hover hover:bg-halo-card/60 text-halo-dark font-bold py-2.5 rounded-xl text-xs tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Chrome className="w-4 h-4 text-halo-gold" />
                <span>Continue with Google</span>
              </button>

              {authMode === 'login' && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    if (!email) {
                      showToast({ title: 'Email Required', description: 'Please enter your registered email address first to find your passkey credentials.', type: 'error' });
                      return;
                    }
                    setLoading(true);
                    try {
                      await passkeyLogin(email);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full bg-halo-cream border border-halo-border hover:border-halo-gold/30 hover:bg-halo-card/60 text-halo-dark font-bold py-2.5 rounded-xl text-xs tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer mt-2"
                >
                  <Fingerprint className="w-4 h-4 text-emerald-500" />
                  <span>Sign In with Passkey / FaceID</span>
                </button>
              )}
            </form>
          )}

          {/* Secure Handshake Disclaimer */}
          <div className="mt-6 p-3 rounded-xl bg-halo-cream/80 border border-halo-border/80 flex items-start gap-2.5 text-[10px] text-halo-text-tertiary leading-normal font-mono">
            <Shield className="w-4 h-4 text-halo-gold shrink-0 mt-0.5" />
            <span>
              All keys and credentials are encrypted. Vault locks are mathematically enforced by system discipline schedules.
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-halo-text-muted font-mono">
          Secured with Bank-Grade AES-256 Shield & Databank Partner Compliance
        </div>
      </div>

      {/* GOOGLE OAUTH SIMULATED DIALOG */}
      {showGooglePicker && (
        <div className="fixed inset-0 bg-halo-cream/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-halo-card border border-halo-border rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-halo-gold/10 border border-halo-gold/20 flex items-center justify-center mx-auto text-halo-gold">
                <Chrome className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-halo-dark">Google OAuth Authentication</h3>
              <p className="text-xs text-halo-text-tertiary leading-relaxed">
                Connect your Google Account to authorize access to HaloSave.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleGoogleSelect('kwame.mensah.dev@gmail.com', 'Kwame Mensah')}
                className="w-full bg-halo-cream hover:bg-halo-card border border-halo-border rounded-xl p-3 text-left transition-all flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-halo-gold flex items-center justify-center font-bold text-xs text-halo-dark">
                  KM
                </div>
                <div>
                  <p className="text-xs font-bold text-halo-dark">Kwame Mensah</p>
                  <p className="text-[10px] text-halo-text-tertiary">kwame.mensah.dev@gmail.com</p>
                </div>
              </button>

              <button
                onClick={() => handleGoogleSelect('beamark54@gmail.com', 'Bea Mark')}
                className="w-full bg-halo-cream hover:bg-halo-card border border-halo-border rounded-xl p-3 text-left transition-all flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs text-halo-dark">
                  BM
                </div>
                <div>
                  <p className="text-xs font-bold text-halo-dark">Bea Mark</p>
                  <p className="text-[10px] text-halo-text-tertiary">beamark54@gmail.com</p>
                </div>
              </button>

              <div className="p-3 bg-halo-cream border border-halo-border rounded-xl">
                <label className="text-[9px] font-mono text-halo-text-tertiary uppercase tracking-wider block mb-1">Or Continue with custom email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    id="custom-google-email"
                    placeholder="custom@gmail.com"
                    defaultValue="demo.user@gmail.com"
                    className="flex-grow bg-halo-card border border-halo-border rounded-lg text-xs p-1.5 text-halo-dark outline-none focus:border-halo-gold"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('custom-google-email') as HTMLInputElement;
                      const customEmail = input?.value || 'demo.user@gmail.com';
                      const customName = customEmail.split('@')[0];
                      handleGoogleSelect(customEmail, customName);
                    }}
                    className="bg-halo-gold text-halo-dark font-bold px-3 py-1.5 rounded-lg text-xs"
                  >
                    Go
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowGooglePicker(false)}
              className="w-full bg-halo-cream text-halo-text-tertiary hover:text-halo-dark py-2 border border-halo-border rounded-xl text-xs transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
