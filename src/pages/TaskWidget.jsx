import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isPast, isToday } from 'date-fns';
import { CheckCircle2, Circle, AlertCircle, ClipboardList, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// Minimal standalone task widget — designed for "Add to Home Screen" bookmark
export default function TaskWidget() {
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me();
      setUser(me);
      if (me) {
        const all = await base44.entities.Task.filter({ assigned_to_id: me.id }, '-created_date', 30);
        const active = all.filter(t => t.status !== 'Completed');
        setTasks(active);
        setLastUpdated(new Date());
      }
    } catch {
      /* not logged in */
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getUrgency = (task) => {
    if (!task.due_date) return 'normal';
    const due = new Date(task.due_date);
    if (isPast(due) && !isToday(due)) return 'overdue';
    if (isToday(due)) return 'today';
    return 'normal';
  };

  const urgencyStyle = {
    overdue: { dot: 'bg-red-500', row: 'border-red-500/30 bg-red-500/5', label: 'text-red-400' },
    today:   { dot: 'bg-amber-400', row: 'border-amber-500/30 bg-amber-500/5', label: 'text-amber-400' },
    normal:  { dot: 'bg-muted-foreground/30', row: 'border-border bg-card', label: 'text-muted-foreground' },
  };

  const overdueCount = tasks.filter(t => getUrgency(t) === 'overdue').length;
  const todayCount = tasks.filter(t => getUrgency(t) === 'today').length;

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">My Tasks</span>
          {tasks.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{tasks.length}</span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className={cn('h-3.5 w-3.5 text-muted-foreground', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="px-3 py-3 space-y-2 pb-8">
        {/* Summary badges */}
        {(overdueCount > 0 || todayCount > 0) && (
          <div className="flex gap-2 mb-3">
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25">
                <AlertCircle className="h-3 w-3 text-red-400" />
                <span className="text-[11px] font-semibold text-red-400">{overdueCount} overdue</span>
              </div>
            )}
            {todayCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25">
                <AlertCircle className="h-3 w-3 text-amber-400" />
                <span className="text-[11px] font-semibold text-amber-400">{todayCount} due today</span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : !user ? (
          <div className="text-center py-16 space-y-2">
            <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Please log in to see your tasks</p>
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Log In
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-green-400/50 mx-auto" />
            <p className="text-sm text-muted-foreground">All clear — no pending tasks</p>
          </div>
        ) : (
          tasks
            .sort((a, b) => {
              const order = { overdue: 0, today: 1, normal: 2 };
              return order[getUrgency(a)] - order[getUrgency(b)];
            })
            .map(task => {
              const urgency = getUrgency(task);
              const s = urgencyStyle[urgency];
              const StatusIcon = task.status === 'In Progress' ? Circle : Circle;
              return (
                <a
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]',
                    s.row
                  )}
                >
                  <div className="pt-0.5 shrink-0">
                    <div className={cn('w-2.5 h-2.5 rounded-full mt-0.5', s.dot)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn('text-[10px] font-semibold', s.label)}>
                        {urgency === 'overdue' ? 'OVERDUE' : urgency === 'today' ? 'DUE TODAY' : task.status?.toUpperCase()}
                      </span>
                      {task.due_date && urgency === 'normal' && (
                        <span className="text-[10px] text-muted-foreground">
                          Due {format(new Date(task.due_date), 'dd MMM')}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusIcon className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                </a>
              );
            })
        )}

        {lastUpdated && (
          <p className="text-center text-[10px] text-muted-foreground/40 pt-2">
            Updated {format(lastUpdated, 'HHmm')}H
          </p>
        )}
      </div>
    </div>
  );
}