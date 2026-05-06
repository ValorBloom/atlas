import React, { useEffect, useState } from 'react';

const ATLAS_LOGO_URL = 'https://media.base44.com/images/public/69e4b33d62de074557854c0f/299b68b6d_image-removebg-preview.png';

const tips = [
  "Fall in — loading your unit data",
  "Syncing movement logs",
  "Preparing parade state",
  "Stand by for orders",
  "Checking personnel status",
];

// Atlas vertebra SVG — the C1 bone connecting spine to skull
function AtlasIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <ellipse cx="32" cy="32" rx="28" ry="20" stroke="currentColor" strokeWidth="2.5" />
      {/* Inner foramen / hole */}
      <ellipse cx="32" cy="32" rx="12" ry="9" stroke="currentColor" strokeWidth="2" />
      {/* Lateral masses — left */}
      <rect x="4" y="27" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
      {/* Lateral masses — right */}
      <rect x="48" y="27" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
      {/* Posterior arch notch */}
      <path d="M20 46 Q32 54 44 46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Anterior arch */}
      <path d="M20 18 Q32 10 44 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function LoadingScreen() {
  const [tip, setTip] = useState(tips[0]);
  const [fade, setFade] = useState(true);
  const [dots, setDots] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let i = 0;
    const tipInterval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        i = (i + 1) % tips.length;
        setTip(tips[i]);
        setFade(true);
      }, 300);
    }, 2200);
    return () => clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    const d = setInterval(() => setDots(p => (p + 1) % 4), 450);
    return () => clearInterval(d);
  }, []);

  useEffect(() => {
    const p = setInterval(() => setProgress(prev => Math.min(prev + Math.random() * 15, 92)), 400);
    return () => clearInterval(p);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8"
      style={{ background: 'hsl(222, 24%, 7%)' }}>

      {/* Background grid — military feel */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(hsl(217,91%,55%) 1px, transparent 1px), linear-gradient(90deg, hsl(217,91%,55%) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

      {/* Radial glow */}
      <div className="absolute w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(217,91%,55%,0.12) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div className="relative flex flex-col items-center gap-3">
        <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsl(217,91%,20%) 0%, hsl(222,24%,12%) 100%)',
            boxShadow: '0 0 0 1px hsl(217,91%,55%,0.3), 0 20px 40px hsl(217,91%,55%,0.15)'
          }}>
          <img src={ATLAS_LOGO_URL} alt="ATLAS" width={38} height={38} style={{ objectFit: 'contain' }} />
          {/* Corner accents */}
          <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-primary/60 rounded-tl" />
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t-2 border-r-2 border-primary/60 rounded-tr" />
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-2 border-l-2 border-primary/60 rounded-bl" />
          <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-2 border-r-2 border-primary/60 rounded-br" />
        </div>

        {/* Outer pulse ring */}
        <div className="absolute top-0 left-0 w-20 h-20 rounded-3xl border border-primary/30 animate-ping"
          style={{ animationDuration: '2.4s' }} />
      </div>

      {/* App name */}
      <div className="text-center space-y-1.5 relative">
        <div className="flex items-center justify-center gap-2">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/40" />
          <h1 className="text-2xl font-bold tracking-[0.15em] uppercase"
            style={{ color: 'hsl(210,20%,94%)', letterSpacing: '0.18em' }}>
            ATLAS
          </h1>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/40" />
        </div>
        <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: 'hsl(220,10%,45%)' }}>
          SAF Management Platform
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-48 space-y-1.5">
        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: 'hsl(222,18%,18%)' }}>
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p
          className="text-[10px] text-center tracking-wider transition-opacity duration-300"
          style={{ opacity: fade ? 0.6 : 0, color: 'hsl(220,10%,45%)' }}
        >
          {tip}{'.'.repeat(dots)}
        </p>
      </div>
    </div>
  );
}