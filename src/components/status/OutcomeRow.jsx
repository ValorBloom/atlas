import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OUTCOME_CATEGORIES = ['MC', 'Light Duty', 'Excused RMJ', 'Excused Heavy Loads', 'Others'];

// A single editable outcome: category + duration + start/end dates.
// `Others` reveals a free-text label field.
export default function OutcomeRow({ outcome, index, canRemove, onChange, onRemove }) {
  const set = (patch) => onChange(index, { ...outcome, ...patch });

  return (
    <div className="p-3 rounded-xl border border-border bg-card space-y-3 relative">
      {canRemove && (
        <button
          onClick={() => onRemove(index)}
          className="absolute top-2.5 right-2.5 text-muted-foreground/50 hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="space-y-1.5">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Outcome *</Label>
        <div className="grid grid-cols-2 gap-2">
          {OUTCOME_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => set({ category: cat })}
              className={cn(
                'p-2 rounded-lg border text-[11px] font-semibold transition-all text-left px-2.5',
                outcome.category === cat
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/30'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {outcome.category === 'Others' && (
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Specify Status *</Label>
          <Input
            placeholder="e.g. EXCUSED RUNNING"
            value={outcome.custom_label || ''}
            onChange={e => set({ custom_label: e.target.value.toUpperCase() })}
            className="h-9 text-xs"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Duration (days) *</Label>
        <Input
          type="number"
          min="1"
          placeholder="e.g. 7"
          value={outcome.duration_days || ''}
          onChange={e => set({ duration_days: e.target.value })}
          className="h-9 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Start *</Label>
          <Input type="date" value={outcome.start_date || ''} onChange={e => set({ start_date: e.target.value })} className="h-9 text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">End *</Label>
          <Input type="date" value={outcome.end_date || ''} onChange={e => set({ end_date: e.target.value })} className="h-9 text-xs" />
        </div>
      </div>
    </div>
  );
}