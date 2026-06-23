import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROW_CONFIG = {
  'Completed': { icon: CheckCircle2, color: 'text-green-400', label: 'Done' },
  'In Progress': { icon: Clock, color: 'text-amber-400', label: 'In Progress' },
  'Not Done': { icon: Circle, color: 'text-muted-foreground', label: 'Not Done' },
};

// Shows completion status of every assignee for tasks sharing the same
// title + due date created by the same person (one record per assignee).
export default function CompletionTracker({ task, user }) {
  const { data: siblings = [], isLoading } = useQuery({
    queryKey: ['task-siblings', task?.assigned_by_id, task?.title, task?.due_date],
    queryFn: () => base44.entities.Task.filter({
      unit: user?.unit,
      assigned_by_id: task.assigned_by_id,
      title: task.title,
    }, '-created_date', 200),
    enabled: !!task?.assigned_by_id && !!task?.title && !!user?.unit,
    select: (rows) => rows.filter(r => (r.due_date || '') === (task.due_date || '')),
  });

  if (isLoading || siblings.length === 0) return null;

  const done = siblings.filter(s => s.status === 'Completed');
  const pct = Math.round((done.length / siblings.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Completion</p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {done.length}/{siblings.length} done
        </span>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="divide-y divide-border -mx-1">
        {siblings.map((s) => {
          const cfg = ROW_CONFIG[s.status] || ROW_CONFIG['Not Done'];
          const Icon = cfg.icon;
          return (
            <div key={s.id} className="flex items-center justify-between px-1 py-2">
              <span className="text-sm">
                {s.assigned_to_rank ? `${s.assigned_to_rank} ` : ''}{s.assigned_to_name || '—'}
              </span>
              <span className={cn('flex items-center gap-1.5 text-xs font-semibold', cfg.color)}>
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}