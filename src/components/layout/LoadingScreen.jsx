import React, { useEffect, useState } from 'react';

const tips = [
  "Fall in — loading your unit data",
  "Syncing movement logs",
  "Preparing parade state",
  "Stand by for orders",
  "Checking personnel status",
];

export default function LoadingScreen() {
  const [tip, setTip] = useState(tips[0]);
  const [fade, setFade] = useState(true);
  const [dots, setDots] = useState(0);

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

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-8">
      {/* Logo mark */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <span className="text-white font-bold text-2xl">A</span>
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
      </div>

      {/* App name */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold text-foreground tracking-tight">Anchor</h1>
        <p className="text-xs text-muted-foreground">OCS Operations Platform</p>
      </div>

      {/* Progress bar */}
      <div className="w-40 h-0.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{
            width: '60%',
            animation: 'loadbar 1.6s ease-in-out infinite alternate',
          }}
        />
      </div>

      {/* Rotating tip */}
      <p
        className="text-xs text-muted-foreground px-8 text-center transition-opacity duration-300"
        style={{ opacity: fade ? 1 : 0 }}
      >
        {tip}{'.'.repeat(dots)}
      </p>

      <style>{`
        @keyframes loadbar {
          0% { transform: translateX(-100%); width: 40%; }
          100% { transform: translateX(200%); width: 60%; }
        }
      `}</style>
    </div>
  );
}