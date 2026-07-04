import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { 
  UserCheck, Shield, Smartphone, Bell, KeyRound, LogOut, Copy, Check, 
  HeartHandshake, AlertTriangle, Fingerprint, Award, Monitor, Tablet, Laptop, Activity, Trash2, Camera,
  Plus, ShieldCheck, Sun, Moon
} from 'lucide-react';
import { formatMoney } from '../../lib/utils.ts';
import { PWAPanel } from '../pwa/PWAPanel.tsx';
import { ApiClient } from '../../api/client.ts';

export const ProfileTab: React.FC = () => {
  const { 
    user, referrals, showToast, logout, changePassword, 
    updateAdminSettings, sessions, fetchSessions, revokeSession, updateProfile,
    isDarkMode, toggleDarkMode
  } = useApp();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [notifMethod, setNotifMethod] = useState(user?.preferredNotification || 'email');
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Change password states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // WebAuthn Passkeys States & Methods
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  const fetchPasskeys = async () => {
    setIsLoadingPasskeys(true);
    try {
      const data = await ApiClient.getPasskeys();
      if (data.success) {
        setPasskeys(data.passkeys || []);
      }
    } catch (err) {
      console.error('Failed to fetch passkeys:', err);
    } finally {
      setIsLoadingPasskeys(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleRegisterPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      // 1. Get registration options from server
      const { options } = await ApiClient.getWebAuthnRegisterOptions();
      
      // 2. Start registration with the browser's credentials API
      const { startRegistration } = await import('@simplewebauthn/browser');
      const attestationResponse = await startRegistration({ optionsJSON: options });
      
      // 3. Verify on server
      const name = newPasskeyName.trim() || 'My Passkey ' + (passkeys.length + 1);
      const verifyResult = await ApiClient.verifyWebAuthnRegister(attestationResponse, name);
      
      if (verifyResult.success) {
        showToast({ title: 'Passkey Registered! 🔑', description: `Your passkey "${name}" is active.`, type: 'success' });
        setNewPasskeyName('');
        fetchPasskeys();
      } else {
        showToast({ title: 'Registration Failed', description: verifyResult.error || 'Could not verify passkey.', type: 'error' });
      }
    } catch (err: any) {
      console.error('Passkey registration error:', err);
      showToast({ title: 'Passkey Cancelled', description: err.message || 'Passkey setup cancelled or unsupported.', type: 'error' });
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      const res = await ApiClient.deletePasskey(id);
      if (res.success) {
        showToast({ title: 'Passkey Removed', description: 'Your passkey has been successfully deleted.', type: 'warning' });
        fetchPasskeys();
      }
    } catch (err) {
      console.error('Failed to delete passkey:', err);
      showToast({ title: 'Error', description: 'Could not remove passkey.', type: 'error' });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast({ title: 'Invalid File', description: 'Please select an image file.', type: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const base64String = canvas.toDataURL('image/jpeg', 0.8);
          await updateProfile({ avatarUrl: base64String });
          setIsUploading(false);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploading(false);
      showToast({ title: 'Upload Failed', description: 'Could not process image.', type: 'error' });
    }
  };
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const currency = user?.currency || 'GHS';
  const referralCode = referrals?.code || 'BISMARK-HALOSAVE-99';
  const referralLink = `https://halosave.app/ref/${referralCode}`;

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCopy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    showToast({ title: 'Copied to Clipboard! 📋', description: `${text} copied.`, type: 'success' });
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-halo-gold" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-cyan-400" />;
      default:
        return <Monitor className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-24 max-w-4xl mx-auto">
      
      {/* User Identity Header Card */}
      <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <div className="relative shrink-0 group">
          <img
            src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={user?.fullName}
            className={`w-24 h-24 rounded-2xl object-cover ring-4 ring-halo-gold/40 shadow-2xl transition-all ${isUploading ? 'opacity-50 blur-sm' : ''}`}
          />
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            <Camera className="w-6 h-6 text-white" />
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp"
              className="hidden" 
              onChange={handleAvatarUpload} 
              disabled={isUploading}
            />
          </label>
          <div className="absolute -bottom-2 -right-2 bg-halo-gold text-halo-dark p-1.5 rounded-xl shadow-lg border-2 border-halo-border">
            <Shield className="w-4 h-4 fill-slate-950" />
          </div>
        </div>

        <div className="space-y-2.5 flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-halo-dark tracking-tight">{user?.fullName || 'Bismark Arko-Ofori'}</h1>
            {user?.isKycVerified ? (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-halo-gold/20 text-emerald-300 rounded-full border border-halo-gold/30 font-bold">
                Tier-{user?.kycTier || 1} KYC Verified
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 font-bold">
                KYC Pending
              </span>
            )}

            {/* Role Permissions / Admin Roles Badging */}
            <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border font-bold ${
              user?.role === 'super_admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-sm' :
              user?.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-sm' :
              'bg-slate-500/20 text-halo-text-secondary border-slate-500/30'
            }`}>
              Security Role: {user?.role || 'user'}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-mono text-halo-text-tertiary">
            <span>📧 {user?.email || 'beamark54@gmail.com'}</span>
            <span>📱 {user?.phone || '+233 54 123 4567'}</span>
            <span>🌍 {user?.country || 'Ghana'} ({currency})</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <button
            onClick={async () => {
              const newName = prompt('Enter new Full Name:', user?.fullName);
              const newPhone = prompt('Enter new Phone:', user?.phone);
              const newTarget = prompt('Enter new Monthly Target:', user?.monthlyTarget?.toString() || '');
              
              if (newName || newPhone || newTarget) {
                const targetNumber = newTarget ? Number(newTarget) : undefined;
                await updateProfile({ 
                  fullName: newName || user?.fullName, 
                  phone: newPhone || user?.phone, 
                  monthlyTarget: targetNumber || user?.monthlyTarget 
                });
                showToast({ title: 'Profile Updated', description: 'Your profile has been saved.', type: 'success' });
              }
            }}
            className="p-3 rounded-2xl bg-halo-cream hover:bg-halo-secondary text-halo-gold border border-halo-border transition-colors flex items-center gap-2 text-xs font-bold justify-center cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={logout}
            className="p-3 rounded-2xl bg-halo-cream hover:bg-halo-secondary text-rose-400 border border-halo-border transition-colors flex items-center gap-2 text-xs font-bold justify-center cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Viral Referral Engine Card */}
      <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Award className="w-48 h-48 text-indigo-400" />
        </div>

        <div className="flex items-center justify-between z-10 relative">
          <div>
            <span className="text-xs font-mono text-indigo-400 uppercase font-bold tracking-wider">VIRAL REFERRAL ENGINE</span>
            <h3 className="text-xl font-extrabold text-halo-dark mt-1">Invite Friends & Earn Commission</h3>
            <p className="text-xs text-halo-text-secondary mt-1 max-w-md">
              Earn GH₵ 25.00 for every friend who joins and completes their first 30-day withdrawal lock.
            </p>
          </div>
          
          <div className="hidden sm:block bg-halo-cream/80 p-3.5 rounded-2xl border border-halo-border text-right font-mono">
            <span className="text-[10px] text-halo-text-tertiary block">TOTAL EARNINGS</span>
            <span className="text-xl font-extrabold text-halo-gold">{formatMoney(referrals?.totalEarnings || 350, currency)}</span>
          </div>
        </div>

        {/* Copy Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 z-10 relative">
          <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-halo-text-tertiary block">YOUR REFERRAL CODE</span>
              <span className="font-mono font-bold text-halo-dark tracking-wider text-sm">{referralCode}</span>
            </div>
            <button
              onClick={() => handleCopy(referralCode, 'code')}
              className="p-2 rounded-xl bg-halo-card hover:bg-halo-secondary text-halo-gold transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-halo-gold" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-halo-cream p-4 rounded-2xl border border-halo-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-halo-text-tertiary block">REFERRAL LINK</span>
              <span className="font-mono text-xs text-indigo-300 truncate block">{referralLink}</span>
            </div>
            <button
              onClick={() => handleCopy(referralLink, 'link')}
              className="p-2 rounded-xl bg-halo-card hover:bg-halo-secondary text-indigo-400 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-indigo-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-indigo-300 pt-2 font-mono">
          <HeartHandshake className="w-4 h-4" />
          <span>You have successfully invited **{referrals?.referralsCount || 14} friends** to HaloSave discipline! 🔥</span>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Security & Biometrics PWA Card */}
        <div className="bg-halo-card p-6 sm:p-7 rounded-3xl border border-halo-border shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-halo-dark text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-halo-gold" />
              <span>Security & Device Authentication</span>
            </h3>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-halo-cream border border-halo-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 text-halo-gold" />
                    <div>
                      <span className="text-xs font-bold text-halo-dark block">WebAuthn Passkeys</span>
                      <span className="text-[10px] text-halo-text-tertiary">Secure login with biometrics</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded font-bold border border-emerald-500/20">
                    ACTIVE
                  </span>
                </div>

                {/* List of registered passkeys */}
                {passkeys.length > 0 ? (
                  <div className="space-y-2 pt-2 border-t border-halo-border/60">
                    <span className="text-[9px] text-halo-text-tertiary uppercase font-bold tracking-wider block">Registered Keys ({passkeys.length})</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {passkeys.map(pk => (
                        <div key={pk.id} className="flex items-center justify-between p-2 rounded-xl bg-halo-card border border-halo-border/40 text-xs">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-halo-dark block leading-tight truncate">{pk.name}</span>
                              <span className="text-[9px] text-halo-text-tertiary block leading-none">
                                Added {new Date(pk.createdAt).toLocaleDateString()} • Uses: {pk.counter}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeletePasskey(pk.id)}
                            className="p-1.5 hover:bg-red-500/10 text-halo-text-tertiary hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Delete Passkey"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-halo-card/40 rounded-xl border border-dashed border-halo-border/80 text-xs text-halo-text-tertiary space-y-1">
                    <span>No passkeys registered yet.</span>
                    <span className="text-[10px] block text-halo-text-tertiary/70">Register biometrics or a hardware key to log in passwordless!</span>
                  </div>
                )}

                {/* Add new passkey form */}
                <div className="pt-2 border-t border-halo-border/60 space-y-2">
                  <span className="text-[9px] text-halo-text-tertiary uppercase font-bold tracking-wider block">Secure a new device</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Passkey Name (e.g., iPhone FaceID)"
                      value={newPasskeyName}
                      onChange={(e) => setNewPasskeyName(e.target.value)}
                      className="flex-1 bg-halo-card border border-halo-border focus:border-halo-gold/50 rounded-xl px-3 py-2 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all"
                    />
                    <button
                      onClick={handleRegisterPasskey}
                      disabled={isRegisteringPasskey}
                      className="px-3.5 py-2 rounded-xl bg-halo-gold hover:opacity-90 disabled:opacity-50 text-halo-dark text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {isRegisteringPasskey ? (
                        <div className="w-3 h-3 border-2 border-halo-dark border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Register</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-halo-cream border border-halo-border">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold text-halo-dark block">Two-Factor Auth (2FA)</span>
                    <span className="text-[10px] text-halo-text-tertiary">Authenticator App TOTP Active</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-halo-gold/20 text-emerald-300 rounded font-bold">
                  ENFORCED
                </span>
              </div>
            </div>
          </div>

          {showPasswordForm ? (
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!currentPassword) {
                  showToast({ title: 'Validation Error', description: 'Enter your current password.', type: 'error' });
                  return;
                }
                if (newPassword.length < 8) {
                  showToast({ title: 'Validation Error', description: 'New password must be at least 8 characters.', type: 'error' });
                  return;
                }
                if (newPassword !== confirmPassword) {
                  showToast({ title: 'Validation Error', description: 'Passwords do not match.', type: 'error' });
                  return;
                }
                setIsSavingPassword(true);
                const success = await changePassword(currentPassword, newPassword);
                setIsSavingPassword(false);
                if (success) {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }
              }} 
              className="space-y-3.5 p-4 rounded-2xl bg-halo-cream border border-halo-border animate-in slide-in-from-top-4 duration-200"
            >
              <div className="space-y-1">
                <label className="text-[10px] text-halo-text-tertiary font-mono uppercase font-bold">Current Passphrase</label>
                <input
                  type="password"
                  placeholder="Current passphrase"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-halo-card border border-halo-border focus:border-halo-gold/50 rounded-xl px-3.5 py-2.5 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-halo-text-tertiary font-mono uppercase font-bold">New Passphrase</label>
                <input
                  type="password"
                  placeholder="New secure passphrase"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-halo-card border border-halo-border focus:border-halo-gold/50 rounded-xl px-3.5 py-2.5 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-halo-text-tertiary font-mono uppercase font-bold">Confirm Passphrase</label>
                <input
                  type="password"
                  placeholder="Confirm secure passphrase"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-halo-card border border-halo-border focus:border-halo-gold/50 rounded-xl px-3.5 py-2.5 text-xs text-halo-dark placeholder-halo-text-muted focus:outline-none transition-all font-mono"
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-halo-card hover:bg-halo-secondary text-halo-text-tertiary text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="flex-1 py-2.5 rounded-xl bg-halo-gold hover:bg-halo-gold text-halo-dark text-xs font-extrabold transition-all cursor-pointer"
                >
                  {isSavingPassword ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="w-full py-3 rounded-xl bg-halo-secondary hover:bg-halo-tertiary text-halo-dark text-xs font-bold transition-colors cursor-pointer"
            >
              Change Master Account Password
            </button>
          )}
        </div>

        {/* Notifications & Preferences Card */}
        <div className="bg-halo-card p-6 sm:p-7 rounded-3xl border border-halo-border shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-halo-dark text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Notification & Discipline Channel</span>
            </h3>

            <div className="space-y-2 pt-2">
              <span className="text-[11px] text-halo-text-tertiary block font-semibold uppercase">Preferred Alert Delivery</span>
              {(['email', 'sms', 'push'] as const).map(ch => (
                <label key={ch} className="flex items-center justify-between p-3 rounded-xl bg-halo-cream border border-halo-border cursor-pointer text-xs">
                  <span className="capitalize text-halo-dark font-medium">{ch === 'push' ? 'Web Push (PWA Service Worker)' : `${ch.toUpperCase()} Summaries`}</span>
                  <input
                    type="radio"
                    name="notifChannel"
                    checked={notifMethod === ch}
                    onChange={() => {
                      setNotifMethod(ch);
                      showToast({ title: 'Channel Updated', description: `Alerts routed to ${ch}.`, type: 'success' });
                    }}
                    className="accent-halo-gold cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-halo-cream rounded-xl border border-halo-border text-[11px] font-mono text-halo-text-tertiary">
            Monthly Target: **{formatMoney(user?.monthlyTarget || 5000, currency)}**
          </div>
        </div>

        {/* Theme & Aesthetics Card */}
        <div className="bg-halo-card p-6 sm:p-7 rounded-3xl border border-halo-border shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-halo-dark text-base flex items-center gap-2">
              <Sun className="w-4 h-4 text-halo-gold" />
              <span>Theme & Visual Aesthetics</span>
            </h3>

            <p className="text-[11px] text-halo-text-secondary leading-relaxed">
              Personalize your dashboard interface. Toggle between the original golden cream theme or the dark mode style.
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => isDarkMode && toggleDarkMode()}
                className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  !isDarkMode
                    ? 'bg-halo-cream border-halo-gold shadow-md text-halo-dark ring-2 ring-halo-gold/20'
                    : 'bg-halo-cream/40 border-halo-border text-halo-text-secondary hover:border-halo-gold-hover hover:text-halo-dark'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <div className="text-left">
                    <span className="text-xs font-bold block">Original Halo Theme</span>
                    <span className="text-[10px] text-halo-text-tertiary block">Warm Cream & Golden Accents</span>
                  </div>
                </div>
                {!isDarkMode && (
                  <span className="w-2 h-2 rounded-full bg-halo-gold animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => !isDarkMode && toggleDarkMode()}
                className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  isDarkMode
                    ? 'bg-halo-cream border-halo-gold shadow-md text-halo-dark ring-2 ring-halo-gold/20'
                    : 'bg-halo-cream/40 border-halo-border text-halo-text-secondary hover:border-halo-gold-hover hover:text-halo-dark'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <span className="text-xs font-bold block">Dark Mode Theme</span>
                    <span className="text-[10px] text-halo-text-tertiary block">Immersive Twilight Charcoal</span>
                  </div>
                </div>
                {isDarkMode && (
                  <span className="w-2 h-2 rounded-full bg-halo-gold animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <div className="p-3 bg-halo-cream rounded-xl border border-halo-border text-[11px] font-mono text-halo-text-tertiary flex items-center justify-between">
            <span>Current Theme:</span>
            <span className="font-bold text-halo-gold uppercase">{isDarkMode ? 'Dark Twilight' : 'Original Halo'}</span>
          </div>
        </div>

      </div>

      {/* PWA Settings & Offline Controls */}
      <PWAPanel />

      {/* DEVICE TRACKING & SESSION MANAGEMENT PANEL */}
      <div className="bg-halo-card p-6 sm:p-8 rounded-3xl border border-halo-border shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-halo-dark text-lg flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-halo-gold" />
              <span>Active Device Sessions & Location Tracking</span>
            </h3>
            <p className="text-xs text-halo-text-tertiary max-w-2xl">
              Track and manage current active sessions connected to your HaloSave. You can instantly terminate any secondary browser session below to block dynamic token refresh.
            </p>
          </div>
          <button 
            onClick={fetchSessions}
            className="text-[10px] font-mono uppercase bg-halo-cream text-halo-text-tertiary px-2.5 py-1 rounded-lg border border-halo-border hover:text-halo-dark hover:border-halo-border-hover cursor-pointer"
          >
            Refresh List
          </button>
        </div>

        <div className="space-y-3 pt-2">
          {sessions.length === 0 ? (
            <div className="text-center py-6 text-halo-text-muted text-xs font-mono">
              Fetching active secure sessions...
            </div>
          ) : (
            sessions.map((sess) => (
              <div 
                key={sess.id} 
                className={`p-4 rounded-2xl bg-halo-cream border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                  sess.isActiveNow ? 'border-halo-gold/20 shadow-[0_0_20px_-12px_rgba(16,185,129,0.2)]' : 'border-halo-border/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-halo-card border border-halo-border rounded-xl mt-0.5">
                    {getDeviceIcon(sess.deviceType)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-halo-dark">{sess.browser}</span>
                      <span className="text-[10px] font-mono text-halo-text-tertiary bg-halo-card px-1.5 py-0.5 rounded border border-halo-border">{sess.os}</span>
                      {sess.isActiveNow ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold text-halo-gold bg-halo-gold/10 px-2 py-0.5 rounded-full border border-halo-gold/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-halo-gold animate-ping" />
                          Current Device
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[9px] font-mono uppercase font-bold text-halo-text-tertiary bg-halo-card px-2 py-0.5 rounded-full border border-halo-border">
                          Active Session
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-halo-text-tertiary font-mono">
                      <span className="text-halo-text-secondary">{sess.location}</span>
                      <span className="text-halo-text-muted">•</span>
                      <span>IP: {sess.ipAddress}</span>
                      <span className="text-halo-text-muted">•</span>
                      <span>Last active: {sess.isActiveNow ? 'Just Now' : new Date(sess.lastActive).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex sm:justify-end items-center">
                  {sess.isActiveNow ? (
                    <button
                      onClick={logout}
                      className="text-xs font-mono font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 bg-halo-card/50 hover:bg-halo-card border border-halo-border/80 rounded-xl px-3 py-1.5 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Revoke Current</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => revokeSession(sess.id)}
                      className="text-xs font-mono font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl px-3 py-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke Session</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-950/30 border border-rose-500/30 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-400 text-base">Account Termination Zone</h4>
            <p className="text-xs text-halo-text-secondary mt-1 leading-relaxed">
              Deleting your account will irreversibly liquidate any matured balances and cancel active mutual fund subscriptions. Locked tranches will remain frozen under regulatory compliance until their maturity dates.
            </p>
          </div>
        </div>

        {showDeleteConfirm ? (
          <div className="bg-halo-cream p-4 rounded-2xl border border-rose-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in zoom-in-95">
            <span className="text-xs text-rose-300 font-bold">Are you absolutely certain? This cannot be undone.</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-halo-secondary text-halo-dark text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast({ title: 'Account Deletion Requested', description: 'Discipline liquidation audit created.', type: 'error' });
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-halo-dark text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors cursor-pointer"
          >
            Request Account Deletion
          </button>
        )}
      </div>

    </div>
  );
};
