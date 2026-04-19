import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function QuickAction({ to, icon: Icon, label, description, variant = 'default' }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-start gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.98]",
        variant === 'primary' 
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
          : "bg-card border-border hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
        variant === 'primary' ? "bg-primary/10" : "bg-muted"
      )}>
        <Icon className={cn(
          "h-4.5 w-4.5",
          variant === 'primary' ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
        )}
      </div>
    </Link>
  );
}