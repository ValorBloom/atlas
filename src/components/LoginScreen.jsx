import React, { useState, useEffect } from 'react';
import { Lock, Crosshair, Radio, Radar } from 'lucide-react';

// Atlas C1 vertebra mark
function AtlasMark({ size = 48, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="32" cy="32" rx="28" ry="20" stroke="currentColor" strokeWidth="2.5" />
      <ellipse cx="32" cy="32" rx="12" ry="9" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="27" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="48" y="27" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// Animated scanning line
function ScanLine() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
      <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-scan" />
    </div>
  );
}

const FEATURES = [
  { icon: Radio, label: 'Movement Tracking', sub: 'Real-time personnel log' },
  { icon: Crosshair, label: 'SFT Submissions', sub: 'Structured fitness training' },
  { icon: Radar, label: 'Status Reporting', sub: 'RSO · RSI · MA workflows' },
];

export default function LoginScreen({ onLogin }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#070b14] flex flex-col overflow-hidden select-none">

      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />

      {/* Top status bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14">
        <div className="flex items-center gap-2">
          <AtlasMark size={18} className="text-blue-400/80" />
          <span className="text-[11px] tracking-[0.25em] uppercase text-blue-400/80 font-semibold">ATLAS</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400 font-medium tracking-wide">SECURE</span>
        </div>
      </div>

      {/* Center hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-8">

        {/* Logo box */}
        <div className="relative mb-8">
          {/* Outer ring */}
          <div className="w-28 h-28 rounded-3xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-sm flex items-center justify-center relative">
            <ScanLine />
            <AtlasMark size={52} className="text-blue-400" />
            {/* Corner ticks */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-blue-400/50" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-blue-400/50" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-blue-400/50" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-blue-400/50" />
          </div>
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-3xl border border-blue-400/10 scale-110 animate-ping" style={{ animationDuration: '3s' }} />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Atlas</h1>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-[1px] w-8 bg-blue-500/30" />
          <p className="text-[10px] tracking-[0.3em] uppercase text-blue-400/60 font-medium">OCS Operations Platform</p>
          <div className="h-[1px] w-8 bg-blue-500/30" />
        </div>
        <p className="text-xs text-slate-500 mt-1 mb-8">Unit management for cadets &amp; instructors</p>

        {/* Feature rows */}
        <div className="w-full max-w-xs space-y-2 mb-10">
          {FEATURES.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">{label}</p>
                <p className="text-[10px] text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onLogin}
          className="w-full max-w-xs h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          <Lock className="w-4 h-4" />
          Sign in to Continue
        </button>
        <p className="text-[10px] text-slate-600 mt-3 text-center">
          By signing in, you agree to unit usage policies
        </p>
      </div>

      {/* Bottom corner decoration */}
      <div className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none opacity-[0.03]">
        <AtlasMark size={192} className="text-blue-400" />
      </div>
    </div>
  );
}