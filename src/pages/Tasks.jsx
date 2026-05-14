import React, { useState } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import { ClipboardList, Plus, ChevronRight, CheckCircle2, Clock, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isAfter } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  'Not Done': { icon: Circle, color: 'text-muted-foreground', bg: 'bg-card border-border' },
  'In Progress': { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20' },
  'Completed': { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/8 border-green-500/20' },
};

function TaskCard({ task, user, canManage, onDone }) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['Not Done'];
  const StatusIcon = cfg.icon;
  const isOverdue = task.due_date && task.status !== 'Completed' && isAfter(new Date(), parseISO(task.due_date));
  const isAssignee = task.assigned_to_id === user?.id;
  const showDone = (isAssignee || canManage) && task.status !== 'Completed';

  const dueLabel = task.due_date
    ? format(parseISO(task.due_date), "d MMM, h:mma").replace(':00', '')
    : null;

  return (
    <div className={cn('rounded-xl border transition-all', cfg.bg)}>
      <Link to={`/tasks/${task.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <StatusIcon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.color)} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold leading-tight', task.status === 'Completed' && 'line-through text-muted-foreground')}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {task.assigned_to_name && (
                <span className="text-[10px] text-muted-foreground">
                  → {task.assigned_to_rank ? `${task.assigned_to_rank} ` : ''}{task.assigned_to_name}
                </span>
              )}
              {dueLabel && (
                <span className={cn('text-[10px] flex items-center gap-0.5', isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                  {isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                  Due {dueLabel}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mt-1 shrink-0" />
        </div>
      </Link>

      {showDone && (
        <div className="px-4 pb-3 -mt-1">
          <button
            onClick={(e) => { e.preventDefault(); onDone(task); }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-colors active:scale-[0.98]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Done
          </button>
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const canManage = instructor || cadetAdmin;

  const [tab, setTab] = useState('mine'); // mine | all

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.unit],
    queryFn: () => base44.entities.Task.filter({ unit: user?.unit }, '-created_date', 100),
    enabled: !!user?.unit,
  });

  const myTasks = allTasks.filter(t => t.assigned_to_id === user?.id && t.status !== 'Completed');
  const allOpen = allTasks.filter(t => t.status !== 'Completed');
  const allCompleted = allTasks.filter(t => t.status === 'Completed');

  // For "mine" tab: show my open tasks; for "all" tab: show everything grouped
  const handleDone = async (task) => {
    await base44.entities.Task.update(task.id, { status: 'Completed' });

    // notify assigner
    if (task.assigned_by_id && task.assigned_by_id !== user?.id) {
      const unitUsers = await base44.entities.User.filter({ unit: user?.unit });
      const assigner = unitUsers.find(u => u.id === task.assigned_by_id);
      if (assigner) {
        await base44.entities.Notification.create({
          title: '✅ Task Completed',
          message: `"${task.title}" has been completed by ${user?.rank ? user.rank + ' ' : ''}${user?.display_name || user?.full_name || ''}`,
          type: 'success',
          category: 'admin',
          recipient_email: assigner.email,
          recipient_unit: user?.unit,
        });
      }
    }

    qc.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('Task marked as done!');
  };

  const tabs = [
    { key: 'mine', label: 'My Tasks', count: myTasks.length },
    ...(canManage ? [{ key: 'all', label: 'All Tasks', count: allOpen.length }] : []),
  ];

  const openCount = myTasks.filter(t => t.status !== 'Completed').length;

  return (
    <div className="pb-24">
      <PageHeader
        title="Tasks"
        subtitle={`${user?.unit} · ${openCount} pending`}
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

      {/* Tabs */}
      <div className="px-4 pt-3 flex gap-2 border-b border-border pb-3">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
              tab === t.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                'text-[10px] font-bold px-1 rounded-full',
                tab === t.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : tab === 'mine' ? (
          <>
            {myTasks.length === 0 ? (
              <div className="py-14 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-400/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">You're all caught up!</p>
                <p className="text-xs text-muted-foreground/60 mt-1">No pending tasks assigned to you</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map(task => (
                  <TaskCard key={task.id} task={task} user={user} canManage={canManage} onDone={handleDone} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* All tasks view for managers */
          <>
            {allOpen.length === 0 && allCompleted.length === 0 ? (
              <div className="py-14 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
                <Link to="/tasks/new">
                  <Button size="sm" variant="outline" className="mt-3 text-xs">Assign a task</Button>
                </Link>
              </div>
            ) : (
              <>
                {allOpen.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                      Open ({allOpen.length})
                    </p>
                    {allOpen.map(task => (
                      <TaskCard key={task.id} task={task} user={user} canManage={canManage} onDone={handleDone} />
                    ))}
                  </div>
                )}
                {allCompleted.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                      Completed ({allCompleted.length})
                    </p>
                    {allCompleted.map(task => (
                      <TaskCard key={task.id} task={task} user={user} canManage={canManage} onDone={handleDone} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}