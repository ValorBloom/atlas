import React from 'react';
import { CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Compact distribution report for a sent CET. Shows how many unit members the
// broadcast reached and surfaces any delivery failures.
export default function DeliveryStatus({ delivery }) {
  if (!delivery || delivery.total_members === undefined) return null;

  const { total_members = 0, delivered = 0, failed = 0, failures = [], sent_at } = delivery;
  const allReached = failed === 0 && delivered >= total_members && total_members > 0;
  const pct = total_members > 0 ? Math.round((delivered / total_members) * 100) : 0;

  return (
    <div className={`rounded-xl border p-3 ${allReached ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/8 border-amber-500/20'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allReached ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          )}
          <span className={`text-sm font-medium ${allReached ? 'text-green-400' : 'text-amber-400'}`}>
            {allReached ? 'Delivered to all members' : 'Partial delivery'}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {delivered}/{total_members}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${allReached ? 'bg-green-400' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Failures */}
      {failed > 0 && (
        <div className="mt-2 pt-2 border-t border-amber-500/20">
          <p className="text-xs text-amber-400 font-medium">{failed} failed to deliver:</p>
          <p className="text-xs text-muted-foreground mt-0.5 break-words">{failures.join(', ')}</p>
        </div>
      )}

      {sent_at && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Sent {format(parseISO(sent_at), 'dd MMM yyyy, HHmm')}H
        </p>
      )}
    </div>
  );
}