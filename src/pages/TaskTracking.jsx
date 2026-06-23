import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import {
  ClipboardList, CheckCircle2, Circle, Clock, ChevronDown, AlertCircle, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isAfter } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonList } from '@/components/ui/SkeletonCard';

const ROW_CONFIG = {
  'Completed': { icon: CheckCircle2, color: 'text-green-400', label: 'Done' },
  'In Progress': { icon: Clock, color: 'text-amber-400', label: 'In Progress' },
  'Not Done': { icon: Circle, color: 'text-muted-foreground', label: 'Pending' },
};

// Group tasks into batches keyed by creator + title + due date.
function buildBatches(tasks) {
  const map = {};
  for (const t of tasks) {
    const key = `${t.assigned_by_id || ''}|${t.title || ''}|${t.due_date || ''}`;
    (map[key] ||= {
      key,
      title: t.title,
      due_date: t.due_date,
      assigned_by_name: t.assigned_by_name,
      assigned_by_id: t.assigned_by_id,
      created_date: t.created_date,
      members: [],
    }).members.push(t);
  }
  return Object.values(map).sort((a, b) =>
    new Date(b.created_date || 0) - new Date(a.created_date || 0)
  );
}

function BatchCard({ batch, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const done = batch.members.filter(m => m.status === 'Completed');
  const pending = batch.members.filter(m => m.status !== 'Completed');
  const pct = Math.round((done.length / batch.members.length) * 100);
  const allDone = done.length === batch.members.length;
  const isOverdue = batch.due_date && !allDone && isAfter(new Date(), parseISO(batch.due_date));
  const dueLabel = batch.due_date
    ? format(parseISO(batch.due_date), "d MMM, h:mma").replace(':00', '')
    : null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-bold leading-tight', allDone && 'text-green-400')}>
              {batch.title}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="h-2.5 w-2.5" /> {batch.members.length} assigned
              </span>
              {batch.assigned_by_name && (
                <span className="text-[10px] text-muted-foreground">by {batch.assigned_by_name}</span>
              )}
              {dueLabel && (
                <span className={cn('text-[10px] flex items-center gap-0.5', isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                  {isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                  Due {dueLabel}
                </span>
              )}
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground/50 shrink-0 transition-transform', open && 'rotate-180')} />
        </div>

        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <div className={cn('h-full transition-all', allDone ? 'bg-green-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
          </div>
          <span className={cn('text-xs font-bold shrink-0', allDone ? 'text-green-400' : 'text-muted-foreground')}>
            {done.length}/{batch.members.length}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3">
              {pending.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Pending ({pending.length})
                  </p>
                  {pending.map(m => {
                    const cfg = ROW_CONFIG[m.status] || ROW_CONFIG['Not Done'];
                    const Icon = cfg.icon;
                    return (
                      <div key={m.id} className="flex items-center justify-between py-1">
                        <span className="text-sm">
                          {m.assigned_to_rank ? `${m.assigned_to_rank} ` : ''}{m.assigned_to_name || '—'}
                        </span>
                        <span className={cn('flex items-center gap-1.5 text-xs font-semibold', cfg.color)}>
                          <Icon className="h-3.5 w-3.5" /> {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {done.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Completed ({done.length})
                  </p>
                  {done.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">
                        {m.assigned_to_rank ? `${m.assigned_to_rank} ` : ''}{m.assigned_to_name || '—'}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Done
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TaskTracking() {
  const { user } = useOutletContext();
  const canManage = isInstructor(user) || isCadetAdmin(user);

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.unit],
    queryFn: () => base44.entities.Task.filter({ unit: user?.unit }, '-created_date', 200),
    enabled: !!user?.unit,
  });

  // Only batches created by this user (so they follow up on what they assigned),
  // unless they're an instructor who oversees the whole unit.
  const relevant = isInstructor(user)
    ? allTasks
    : allTasks.filter(t => t.assigned_by_id === user?.id);

  const batches = buildBatches(relevant);
  const openBatches = batches.filter(b => b.members.some(m => m.status !== 'Completed'));
  const doneBatches = batches.filter(b => b.members.every(m => m.status === 'Completed'));

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Task Tracking" backTo="/tasks" />
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">Instructors and admins only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Task Tracking"
        subtitle="Completion by assignee"
        backTo="/tasks"
      />
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <SkeletonList count={3} />
        ) : batches.length === 0 ? (
          <div className="py-14 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No assigned tasks to track yet</p>
          </div>
        ) : (
          <>
            {openBatches.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  In Progress ({openBatches.length})
                </p>
                {openBatches.map((b, i) => (
                  <BatchCard key={b.key} batch={b} defaultOpen={i === 0} />
                ))}
              </div>
            )}
            {doneBatches.length > 0 && (
              <div className="space-y-2.5 mt-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Fully Completed ({doneBatches.length})
                </p>
                {doneBatches.map(b => (
                  <BatchCard key={b.key} batch={b} defaultOpen={false} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}