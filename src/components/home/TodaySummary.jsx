import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ListTodo, MapPin, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Sticky "Today at a glance" collapsible banner for the Home screen.
 * Shows: pending tasks, active statuses, personnel out.
 */
export default function TodaySummary({ taskCount = 0, statusCount = 0, outCount = 0 }) {
  const [open, setOpen] = useState(true);
  const total = taskCount + statusCount + outCount;

  if (total === 0) return null;

  const items = [
    taskCount > 0 && { icon: ListTodo, label: `${taskCount} task${taskCount > 1 ? 's' : ''} pending`, to: '/tasks', color: 'text-primary' },
    statusCount > 0 && { icon: FileText, label: `${statusCount} on status`, to: '/actions/status/update/RSO', color: 'text-amber-400' },
    outCount > 0 && { icon: MapPin, label: `${outCount} personnel out`, to: '/admin/locations', color: 'text-orange-400' },
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-foreground">Today — {total} item{total > 1 ? 's' : ''} need attention</span>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {items.map(({ icon: Icon, label, to, color }, i) => (
            <Link key={i} to={to} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors active:scale-[0.99]">
              <Icon className={cn('h-3.5 w-3.5 shrink-0', color)} />
              <span className="text-xs text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}