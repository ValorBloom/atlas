import React from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72;

export default function PullToRefresh({ pullDistance, refreshing }) {
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const triggered = pullDistance >= THRESHOLD || refreshing;
  const visible = pullDistance > 4 || refreshing;

  if (!visible) return null;

  return (
    <div
      className="absolute left-0 right-0 flex justify-center items-center pointer-events-none z-30 transition-all"
      style={{ top: refreshing ? 12 : Math.max(pullDistance - 40, 4) }}
    >
      <div
        className={`w-9 h-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center transition-all ${
          triggered ? 'border-primary/40' : ''
        }`}
        style={{ opacity: Math.max(progress * 1.2, refreshing ? 1 : 0) }}
      >
        <RefreshCw
          className={`h-4 w-4 transition-colors ${triggered ? 'text-primary' : 'text-muted-foreground'} ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${progress * 360}deg)`, transition: refreshing ? undefined : 'transform 0.05s linear' }}
        />
      </div>
    </div>
  );
}