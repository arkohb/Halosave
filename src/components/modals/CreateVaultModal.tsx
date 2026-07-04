import React, { useState, useId } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { Vault, Sparkles, ShieldCheck } from 'lucide-react';

export const CreateVaultModal: React.FC = () => {
  const { isCreateVaultModalOpen, setIsCreateVaultModalOpen, createVault } = useApp();
  
  const nameId = useId();
  const targetId = useId();
  const lockId = useId();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('10000');
  const [color, setColor] = useState('emerald');
  const [icon, setIcon] = useState('ShieldAlert');
  const getFutureDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const [lockSelection, setLockSelection] = useState<string>('90');
  const [customDays, setCustomDays] = useState('90');
  const [customDate, setCustomDate] = useState(() => getFutureDateString(90));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCreateVaultModalOpen) return null;

  const colors = [
    { id: 'emerald', bg: 'bg-halo-gold' },
    { id: 'cyan', bg: 'bg-cyan-500' },
    { id: 'indigo', bg: 'bg-indigo-500' },
    { id: 'amber', bg: 'bg-amber-500' },
    { id: 'rose', bg: 'bg-rose-500' },
    { id: 'purple', bg: 'bg-purple-500' },
  ];

  const iconsList = ['ShieldAlert', 'PlaneTakeoff', 'Home', 'GraduationCap', 'HeartPulse', 'Sparkles'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalTargetDate: string;
    let finalLockPeriod: number;

    if (lockSelection === 'custom_date') {
      const selectedDate = new Date(customDate + 'T23:59:59');
      if (isNaN(selectedDate.getTime())) {
        selectedDate.setTime(Date.now() + 90 * 24 * 3600 * 1000);
      }
      finalTargetDate = selectedDate.toISOString();
      const diffTime = selectedDate.getTime() - Date.now();
      finalLockPeriod = Math.max(1, Math.ceil(diffTime / (24 * 3600 * 1000)));
    } else if (lockSelection === 'custom_days') {
      const days = parseInt(customDays) || 90;
      finalLockPeriod = Math.max(1, days);
      finalTargetDate = new Date(Date.now() + finalLockPeriod * 24 * 3600 * 1000).toISOString();
    } else {
      finalLockPeriod = parseInt(lockSelection) || 90;
      finalTargetDate = new Date(Date.now() + finalLockPeriod * 24 * 3600 * 1000).toISOString();
    }

    setIsSubmitting(true);
    try {
      await createVault({
        name,
        color,
        icon,
        targetAmount: parseFloat(targetAmount) || 5000,
        targetDate: finalTargetDate,
        defaultLockPeriod: finalLockPeriod,
      });
      setIsCreateVaultModalOpen(false);
      setName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start p-4 sm:p-8 bg-halo-cream/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-halo-card border border-halo-border rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative mt-8 sm:mt-12 mb-auto h-fit">
        
        <div className="flex items-center justify-between pb-4 border-b border-halo-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-halo-gold/10 rounded-xl text-halo-gold border border-halo-gold/20">
              <Vault className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-halo-dark">Create Savings Vault</h3>
              <p className="text-xs text-halo-text-tertiary">Targeted wealth container with strict lock</p>
            </div>
          </div>
          <button onClick={() => setIsCreateVaultModalOpen(false)} className="text-halo-text-tertiary hover:text-halo-dark text-sm">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-5">
          
          <div className="space-y-1.5">
            <label htmlFor={nameId} className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary">
              Vault Title
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dream Car Deposit 🏎️"
              className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={targetId} className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary">
              Target Amount (GHS)
            </label>
            <input
              id={targetId}
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold font-mono font-bold"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary block">
              Color Accent
            </label>
            <div className="flex gap-3">
              {colors.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`w-8 h-8 rounded-full ${c.bg} transition-transform ${color === c.id ? 'ring-4 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary block">
              Icon Badge
            </label>
            <div className="flex gap-2">
              {iconsList.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-2.5 rounded-xl border text-xs font-mono ${icon === ic ? 'bg-halo-gold/20 border-halo-gold text-emerald-300' : 'bg-halo-cream border-halo-border text-halo-text-tertiary'}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor={lockId} className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary block">
                Withdrawal Lock Period
              </label>
              <select
                id={lockId}
                value={lockSelection}
                onChange={(e) => setLockSelection(e.target.value)}
                className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold"
              >
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days (Recommended)</option>
                <option value="180">180 Days</option>
                <option value="365">365 Days</option>
                <option value="custom_days">Custom Duration (Days)</option>
                <option value="custom_date">Custom Maturity Date (Specific Date) 📅</option>
              </select>
            </div>

            {lockSelection === 'custom_days' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary block">
                  Lock Duration (Number of Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold font-mono font-bold"
                  required
                />
              </div>
            )}

            {lockSelection === 'custom_date' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-semibold uppercase tracking-wider text-halo-text-secondary block">
                  Choose Specific Lock Date
                </label>
                <input
                  type="date"
                  min={getFutureDateString(1)}
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full bg-halo-cream border border-halo-border rounded-xl px-4 py-3 text-sm text-halo-dark focus:outline-none focus:border-halo-gold font-sans font-bold"
                  required
                />
              </div>
            )}

            {/* Lock Period Live Preview */}
            <div className="p-3 bg-halo-gold/10 border border-halo-gold/20 rounded-xl text-xs text-halo-dark flex items-start gap-2">
              <span className="text-lg">🔒</span>
              <div>
                <p className="font-semibold text-halo-dark">Lock Details:</p>
                <p className="text-halo-text-secondary mt-0.5">
                  Your vault will unlock on{' '}
                  <span className="font-bold text-halo-dark">
                    {lockSelection === 'custom_date'
                      ? new Date(customDate + 'T23:59:59').toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : new Date(
                          Date.now() +
                            (lockSelection === 'custom_days'
                              ? parseInt(customDays) || 0
                              : parseInt(lockSelection) || 90) *
                              24 *
                              3600 *
                              1000
                        ).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                  </span>{' '}
                  (in{' '}
                  <span className="font-bold text-halo-dark">
                    {lockSelection === 'custom_date'
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(customDate + 'T23:59:59').getTime() - Date.now()) /
                              (24 * 3600 * 1000)
                          )
                        )
                      : lockSelection === 'custom_days'
                      ? parseInt(customDays) || 0
                      : parseInt(lockSelection) || 90}
                  </span>{' '}
                  days). Early withdrawals will incur discipline penalties.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-halo-gold to-teal-600 hover:from-halo-gold hover:to-teal-500 text-halo-dark font-extrabold text-sm shadow-xl shadow-halo-gold/20 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Launch Vault & Lock Plan</span>
          </button>
        </form>

      </div>
    </div>
  );
};
