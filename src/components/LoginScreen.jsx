import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

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

// Animated corner bracket
function CornerBrackets({ className = '' }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-blue-400/50 rounded-tl" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-blue-400/50 rounded-tr" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-blue-400/50 rounded-bl" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-blue-400/50 rounded-br" />
    </div>
  );
}

// Animated scan line inside a container
function ScanLine() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/80 to-transparent animate-scan" />
    </div>
  );
}

// Decorative hex grid in background
function HexGrid() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hex" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
          <polygon points="28,4 52,16 52,40 28,52 4,40 4,16" fill="none" stroke="#60a5fa" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
    </svg>
  );
}

const TAGLINES = [
  'MISSION READY',
  'OPERATIONAL EXCELLENCE',
  'UNIT COHESION',
  'STRENGTH THROUGH DISCIPLINE',
];

export default function LoginScreen({ onLogin }) {
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTaglineIdx(i => (i + 1) % TAGLINES.length);
        setVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#05080f] flex flex-col overflow-hidden select-none">

      {/* Hex grid background */}
      <HexGrid />

      {/* Gradient radial glow — top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/12 blur-3xl pointer-events-none" />
      {/* Gradient radial glow — bottom right accent */}
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-blue-800/8 blur-3xl pointer-events-none" />

      {/* Fine horizontal rule lines */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(96,165,250,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 60px'
        }}
      />

      {/* ── TOP BAR ── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-14">
        <div className="flex items-center gap-2">
          <AtlasMark size={16} className="text-blue-400/70" />
          <span className="text-[10px] tracking-[0.35em] uppercase text-blue-400/60 font-semibold">ATLAS</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Data readout decorations */}
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-1 rounded-full bg-blue-400/60`} style={{ height: `${8 + i * 4}px`, opacity: 0.3 + i * 0.15 }} />
            ))}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] text-green-400 font-semibold tracking-widest">SYS ONLINE</span>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">

        {/* Outer ring + mark */}
        <div className="relative mb-10">
          {/* Outermost ring — slow spin */}
          <div
            className="absolute inset-0 rounded-full border border-dashed border-blue-500/15"
            style={{ width: 160, height: 160, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
          />

          {/* Middle ring */}
          <div
            className="absolute rounded-full border border-blue-500/20"
            style={{ width: 130, height: 130, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
          />

          {/* Logo box */}
          <div className="relative w-32 h-32 rounded-3xl border border-blue-500/25 bg-gradient-to-b from-blue-950/60 to-blue-950/20 backdrop-blur-sm flex items-center justify-center">
            <ScanLine />
            <CornerBrackets />
            <AtlasMark size={60} className="text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]" />
          </div>

          {/* Ping rings */}
          <div className="absolute inset-0 rounded-3xl border border-blue-400/8 animate-ping" style={{ animationDuration: '3.5s' }} />
          <div className="absolute inset-0 rounded-3xl border border-blue-400/5 animate-ping" style={{ animationDuration: '5s', animationDelay: '1s' }} />

          {/* Corner data readouts */}
          <div className="absolute -top-2 -right-10 text-right">
            <p className="text-[8px] text-blue-400/40 font-mono tracking-wider">v2.0.1</p>
          </div>
          <div className="absolute -bottom-2 -left-10">
            <p className="text-[8px] text-blue-400/40 font-mono tracking-wider">SEC-LVL 3</p>
          </div>
        </div>

        {/* Title block */}
        <div className="text-center space-y-2 mb-10">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-blue-500/40" />
            <span className="text-[9px] tracking-[0.4em] uppercase text-blue-400/50 font-semibold">SECURE PLATFORM</span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-blue-500/40" />
          </div>

          <h1 className="text-5xl font-bold text-white tracking-tight leading-none"
            style={{ textShadow: '0 0 40px rgba(96,165,250,0.25)' }}>
            Atlas
          </h1>

          {/* Rotating tagline */}
          <div className="h-5 flex items-center justify-center overflow-hidden">
            <p
              className="text-[11px] tracking-[0.2em] uppercase font-medium transition-opacity duration-300"
              style={{
                opacity: visible ? 1 : 0,
                color: 'rgba(96,165,250,0.6)',
              }}
            >
              {TAGLINES[taglineIdx]}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8 w-full max-w-xs">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-blue-500/20" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-blue-400/30" />
            ))}
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-blue-500/20" />
        </div>

        {/* Sign-in CTA */}
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={onLogin}
            className="w-full h-14 rounded-2xl text-white font-semibold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1e40af 100%)',
              boxShadow: '0 0 30px rgba(37,99,235,0.35), 0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <Lock className="w-4 h-4" strokeWidth={2.5} />
            <span className="tracking-wide">Sign in to Continue</span>
          </button>

          <p className="text-center text-[10px] text-slate-600 tracking-wide">
            Authorised personnel only · Secured access
          </p>
        </div>
      </div>

      {/* ── BOTTOM DATA BAR ── */}
      <div className="relative z-10 px-6 pb-10 flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-px w-6 bg-blue-500/30" />
            <span className="text-[8px] text-blue-400/30 tracking-widest uppercase font-mono">AUTH</span>
          </div>
          <span className="text-[8px] text-slate-700 font-mono">SGP-{new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-1 opacity-30">
          {[2, 4, 3, 5, 2, 4, 3].map((h, i) => (
            <div key={i} className="w-0.5 bg-blue-400 rounded-full" style={{ height: `${h * 3}px` }} />
          ))}
        </div>
      </div>

      {/* Background Atlas watermark */}
      <div className="absolute bottom-0 right-0 opacity-[0.015] pointer-events-none translate-x-1/4 translate-y-1/4">
        <AtlasMark size={300} className="text-blue-400" />
      </div>
    </div>
  );
}