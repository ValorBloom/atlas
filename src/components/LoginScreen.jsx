import React, { useState } from 'react';
import { Anchor, Shield, Lock } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [hovering, setHovering] = useState(false);

  return (
    <div className="fixed inset-0 bg-[#0a0e1a] flex flex-col items-center justify-between overflow-hidden">

      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-700/5 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="w-full flex justify-between items-center px-6 pt-12 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Anchor className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">ATLAS</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-green-400 font-medium">Secure</span>
        </div>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center gap-8 relative z-10 px-8 text-center">

        {/* Logo */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center backdrop-blur-sm shadow-2xl shadow-blue-500/10">
            <Anchor className="w-10 h-10 text-blue-400" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
            <Shield className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Atlas
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            Unit management platform for cadets and instructors
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {['Movement tracking', 'SFT submissions', 'Status reporting'].map((f) => (
            <div key={f} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400/70 shrink-0" />
              <span className="text-xs text-slate-400">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="w-full px-6 pb-12 space-y-3 relative z-10">
        <button
          onClick={onLogin}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-base shadow-xl shadow-blue-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          Sign in with Atlas
        </button>
        <p className="text-center text-[11px] text-slate-500">
          By signing in, you agree to unit usage policies
        </p>
      </div>

    </div>
  );
}