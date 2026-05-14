import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import { ClipboardList, Plus, ChevronRight, CheckCircle2, Clock, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isAfter } from 'date-fns';

const STATUS_CONFIG = {
  'Not Done': { icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted/50 border-border', label: 'Not Done' },
  'In Progress': { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20', label: 'In Progress' },
  'Completed': { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/8 border-green-500/20', label: 'Completed' },
};

const PRIORITY_CONFIG = {
  'High': 'text-destructive bg-destructive/10 border-destructive/20',
  'Medium': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Low': 'text-muted-foreground bg-muted/50 border-border',
};

function TaskCard({ task, onStatusChange, canManage }) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['Not Done'];
  const StatusIcon = cfg.icon;
  const isOverdue = task.due_date && task.status !== 'Completed' && isAfter(new Date(), parseISO(task.due_date));

  return (
    <Link
      to={`/tasks/${task.id}`}
      className={cn('block p-4 rounded-xl border transition-all active:scale-[0.98]', cfg.bg)}
    >
      <div className="flex items-start gap-3">
        <StatusIcon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-semibold leading-tight', task.status === 'Completed' && 'line-through text-muted-foreground')}>{task.title}</p>
            <Badge className={cn('text-[9px] px-1.5 py-0 shrink-0 border', PRIORITY_CONFIG[task.priority])}>{task.priority}</Badge>
          </div>
          {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">→ {task.assigned_to_rank ? `${task.assigned_to_rank} ` : ''}{task.assigned_to_name}</span>
            {task.due_date && (
              <span className={cn('text-[10px] flex items-center gap-0.5', isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                {isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                Due {format(parseISO(task.due_date), 'd MMM')}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mt-1 shrink-0" />
      </div>
    </Link>
  );
}

export default function Tasks() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const canManage = instructor || cadetAdmin;

  const [filter, setFilter] = useState('all'); // all | mine | assigned

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.unit],
    queryFn: () => base44.entities.Task.filter({ unit: user?.unit }, '-created_date', 50),
    enabled: !!user?.unit,
  });

  const filtered = allTasks.filter(t => {
    if (filter === 'mine') return t.assigned_to_id === user?.id;
    if (filter === 'assigned') return t.assigned_by_id === user?.id;
    return true;
  });

  // Group by status
  const groups = ['Not Done', 'In Progress', 'Completed'];
  const grouped = groups.reduce((acc, s) => {
    acc[s] = filtered.filter(t => t.status === s);
    return acc;
  }, {});

  const openCount = filtered.filter(t => t.status !== 'Completed').length;

  return (
    <div className="pb-24">
      <PageHeader
        title="Tasks"
        subtitle={`${user?.unit} · ${openCount} open`}
        backTo="/"
        rightAction={
          canManage && (
            <Link to="/tasks/new">
              <Button size="sm" className="h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Assign
              </Button>
            </Link>
          )
        }
      />

      {/* Filter tabs */}
      <div className="px-4 pt-3 flex gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'mine', label: 'Assigned to me' },
          ...(canManage ? [{ key: 'assigned', label: 'I assigned' }] : []),
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              filter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tasks found</p>
            {canManage && <Link to="/tasks/new"><Button size="sm" variant="outline" className="mt-3 text-xs">Assign a task</Button></Link>}
          </div>
        ) : (
          groups.map(status => (
            grouped[status]?.length > 0 && (
              <div key={status} className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {status} ({grouped[status].length})
                </p>
                {grouped[status].map(task => (
                  <TaskCard key={task.id} task={task} canManage={canManage} />
                ))}
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}