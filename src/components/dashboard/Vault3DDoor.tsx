import React from 'react';
import { motion } from 'motion/react';

interface Vault3DDoorProps {
  tier: 'silver_starter' | 'gold_premium' | 'platinum_elite';
  isOpen: boolean;
  isAnimating?: boolean;
}

export const Vault3DDoor: React.FC<Vault3DDoorProps> = ({ tier, isOpen, isAnimating = false }) => {
  // Styles based on tier selection
  const styles = {
    silver_starter: {
      rimGrad: 'from-slate-200 via-slate-400 to-slate-600 border-slate-300',
      doorGrad: 'from-slate-100 via-slate-300 to-slate-500',
      glowColor: 'shadow-[0_0_25px_rgba(148,163,184,0.5)]',
      accentColor: 'text-slate-500',
      glowingCore: 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300',
      boltColor: 'from-slate-400 to-slate-200',
      wheelColor: 'from-slate-300 via-slate-400 to-slate-500',
      innerCoreGlow: 'from-emerald-400/20 via-teal-500/10 to-transparent',
      hudBorder: 'border-slate-400/30',
      textColor: 'text-slate-400',
    },
    gold_premium: {
      rimGrad: 'from-amber-200 via-yellow-500 to-amber-700 border-amber-400',
      doorGrad: 'from-amber-100 via-yellow-400 to-amber-600',
      glowColor: 'shadow-[0_0_35px_rgba(245,158,11,0.6)]',
      accentColor: 'text-amber-500',
      glowingCore: 'bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-500',
      boltColor: 'from-amber-500 to-yellow-200',
      wheelColor: 'from-amber-400 via-yellow-500 to-amber-600',
      innerCoreGlow: 'from-yellow-400/30 via-amber-500/20 to-transparent',
      hudBorder: 'border-amber-400/30',
      textColor: 'text-amber-400',
    },
    platinum_elite: {
      rimGrad: 'from-slate-600 via-slate-800 to-slate-950 border-slate-700',
      doorGrad: 'from-slate-700 via-slate-900 to-slate-950',
      glowColor: 'shadow-[0_0_45px_rgba(6,182,212,0.7)]',
      accentColor: 'text-cyan-400',
      glowingCore: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black',
      boltColor: 'from-cyan-600 to-slate-500',
      wheelColor: 'from-slate-800 via-slate-900 to-cyan-950',
      innerCoreGlow: 'from-cyan-500/30 via-emerald-500/20 to-transparent',
      hudBorder: 'border-cyan-500/30',
      textColor: 'text-cyan-400',
    }
  };

  const current = styles[tier];

  // Number of locking bolts around the door
  const boltsCount = 8;
  const boltIndexes = Array.from({ length: boltsCount });

  return (
    <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center select-none" style={{ perspective: 1000 }}>
      {/* Outer Vault Wall Frame */}
      <div className={`absolute inset-1 rounded-full bg-slate-950/40 border-4 border-slate-900 flex items-center justify-center p-3 overflow-hidden ${current.glowColor}`}>
        
        {/* Glow when open */}
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute inset-0 bg-radial ${current.innerCoreGlow} flex flex-col items-center justify-center gap-1 z-0`}
          >
            {/* Visual Safe Contents */}
            <div className="animate-pulse flex flex-col items-center">
              <span className="text-3xl sm:text-4xl">💰</span>
              <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400 uppercase mt-1">SAFE OPEN</span>
              <span className="text-[8px] font-mono text-emerald-400/70">SECURED LOCK</span>
            </div>
          </motion.div>
        )}

        {/* HUD grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />
      </div>

      {/* Radial Locking Bolts (Back layer, retract when open) */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {boltIndexes.map((_, i) => {
          const angle = (i * 360) / boltsCount;
          const rad = (angle * Math.PI) / 180;
          // Retract bolts by moving them inward
          const normalDistance = 70; // px from center
          const retractedDistance = 45; // px from center
          const currentDistance = isOpen ? retractedDistance : normalDistance;

          const x = Math.cos(rad) * currentDistance;
          const y = Math.sin(rad) * currentDistance;

          return (
            <motion.div
              key={i}
              initial={{ x: Math.cos(rad) * normalDistance, y: Math.sin(rad) * normalDistance }}
              animate={{ 
                x, 
                y,
                scaleY: isOpen ? 0.7 : 1,
              }}
              transition={{ type: 'spring', stiffness: 120, damping: 15 }}
              className="absolute w-8 h-3 rounded-sm bg-gradient-to-r"
              style={{
                top: '50%',
                left: '50%',
                marginTop: '-6px',
                marginLeft: '-16px',
                transform: `rotate(${angle}deg)`,
                backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                // Bind the colors dynamically
                content: '""',
              }}
            >
              <div className={`w-full h-full rounded-sm bg-gradient-to-r ${current.boltColor} shadow-md border-r border-slate-900/50`} />
            </motion.div>
          );
        })}
      </div>

      {/* Main Swinging Vault Door (Perspective door plate) */}
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ 
          rotateY: isOpen ? -95 : 0,
          z: isOpen ? 40 : 0,
          x: isOpen ? -18 : 0,
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 90, 
          damping: 14,
          restDelta: 0.01 
        }}
        className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full z-20 cursor-pointer shadow-2xl"
        style={{ 
          transformOrigin: 'left center',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Door Rim with metallic gradients */}
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${current.rimGrad} border-4 p-1 flex items-center justify-center shadow-inner relative`}>
          
          {/* Inner Door Core Plate */}
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${current.doorGrad} flex flex-col items-center justify-center p-2 border-2 border-slate-900/10 shadow-lg relative overflow-hidden`}>
            
            {/* Dial Tick Marks */}
            <div className="absolute inset-2 rounded-full border border-dashed border-slate-950/20 animate-spin-slow pointer-events-none opacity-40" />
            
            {/* High-tech HUD laser circle or line */}
            <div className={`absolute inset-4 rounded-full border ${current.hudBorder} pointer-events-none`} />

            {/* Central Rotary Combination Dial / Wheel (Spins on open/close) */}
            <motion.div
              animate={{ 
                rotate: isOpen ? 360 : 0 
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 70, 
                damping: 12 
              }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center relative z-30"
            >
              {/* Central Metallic Hub Dial */}
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${current.wheelColor} border-2 border-slate-950/30 flex items-center justify-center shadow-lg`}>
                <div className="w-4 h-4 rounded-full bg-slate-950 border border-white/20 flex items-center justify-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${tier === 'platinum_elite' ? 'bg-cyan-400' : tier === 'gold_premium' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                </div>
              </div>

              {/* Hand Spokes (Heavy metal levers) */}
              {Array.from({ length: 4 }).map((_, i) => {
                const rotation = i * 90;
                return (
                  <div
                    key={i}
                    className="absolute w-14 h-2 pointer-events-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      marginTop: '-4px',
                      marginLeft: '-28px',
                      transform: `rotate(${rotation}deg)`,
                    }}
                  >
                    {/* Spoke handle tip */}
                    <div className={`absolute right-0 w-3 h-3 rounded-full bg-gradient-to-br ${current.wheelColor} border border-slate-950/30 shadow-md`} />
                    {/* Spoke rod */}
                    <div className={`w-11 h-1.5 bg-gradient-to-r ${current.wheelColor} border-y border-slate-950/10 ml-2`} />
                  </div>
                );
              })}
            </motion.div>

            {/* Subtle Text indicator */}
            <div className="absolute bottom-2.5 flex flex-col items-center select-none pointer-events-none z-40">
              <span className={`text-[8px] font-extrabold tracking-widest uppercase ${current.textColor}`}>
                {tier === 'platinum_elite' ? 'PLATINUM' : tier === 'gold_premium' ? 'GOLD' : 'SILVER'}
              </span>
              <span className="text-[6px] font-mono text-slate-950/40 font-bold uppercase">
                {isOpen ? 'SECURE_OPEN' : 'SECURE_LOCKED'}
              </span>
            </div>

            {/* Shine highlight reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rounded-full pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* Decorative Heavy Duty Left Hinges */}
      <div className="absolute left-1 top-[25%] w-4 h-6 rounded-l-md bg-gradient-to-r from-slate-700 to-slate-900 border border-slate-950 shadow-md z-30" />
      <div className="absolute left-1 bottom-[25%] w-4 h-6 rounded-l-md bg-gradient-to-r from-slate-700 to-slate-900 border border-slate-950 shadow-md z-30" />
    </div>
  );
};
