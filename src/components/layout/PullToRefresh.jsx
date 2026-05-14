import React from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72;

export default function PullToRefresh({ pullDistance, refreshing, lastUpdated }) {
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const triggered = pullDistance >= THRESHOLD || refreshing;
  const visible = pullDistance > 4 || refreshing;

  if (!visible) return null;

  const timeLabel = lastUpdated
    ? (() => {
        const secs = Math.floor((Date.now() - lastUpdated) / 1000);
        if (secs < 60) return 'Just updated';
        const mins = Math.floor(secs / 60);
        return `Updated ${mins}m ago`;
      })()
    : null;

  return (
    <div
      className="absolute left-0 right-0 flex flex-col justify-center items-center pointer-events-none z-30 transition-all gap-1"
      style={{ top: refreshing ? 12 : Math.max(pullDistance - 48, 4) }}
    >
      <div
        className={`w-9 h-9 rounded-full bg-card border shadow-lg flex items-center justify-center transition-all ${
          triggered ? 'border-primary/40 shadow-primary/10' : 'border-border'
        }`}
        style={{ opacity: Math.max(progress * 1.2, refreshing ? 1 : 0) }}
      >
        <RefreshCw
          className={`h-4 w-4 transition-colors ${triggered ? 'text-primary' : 'text-muted-foreground'} ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${progress * 360}deg)`, transition: refreshing ? undefined : 'transform 0.05s linear' }}
        />
      </div>
      {refreshing && timeLabel && (
        <span className="text-[10px] text-muted-foreground bg-card/80 px-2 py-0.5 rounded-full backdrop-blur-sm border border-border">
          {timeLabel}
        </span>
      )}
    </div>
  );
}