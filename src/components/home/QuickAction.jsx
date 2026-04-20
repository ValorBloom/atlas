import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function QuickAction({ to, icon: Icon, label, description, variant = 'default' }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.97] select-none",
        variant === 'primary'
          ? "bg-primary/8 border-primary/20 hover:bg-primary/12"
          : "bg-card border-border hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
        variant === 'primary' ? "bg-primary/15" : "bg-muted"
      )}>
        <Icon
          style={{ width: 17, height: 17 }}
          className={cn(
            variant === 'primary' ? "text-primary" : "text-foreground/70"
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>
        )}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="text-muted-foreground/40 shrink-0">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}