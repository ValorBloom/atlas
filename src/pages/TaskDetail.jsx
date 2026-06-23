import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import { CheckCircle2, Clock, Circle, Trash2, AlertCircle, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, isAfter } from 'date-fns';
import { Drawer } from 'vaul';

const STATUS_CONFIG = {
  'Not Done': { icon: Circle, color: 'text-muted-foreground', label: 'Not Done' },
  'In Progress': { icon: Clock, color: 'text-amber-400', label: 'In Progress' },
  'Completed': { icon: CheckCircle2, color: 'text-green-400', label: 'Done' },
};

export default function TaskDetail() {
  const { id } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const canManage = instructor || cadetAdmin;
  const isNew = id === 'new';

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => base44.entities.Task.filter({ id }),
    enabled: !isNew,
    select: d => d?.[0],
  });

  const { data: unitUsers = [] } = useQuery({
    queryKey: ['unit-users-tasks', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const assignableUsers = unitUsers.filter(u => u.id !== user?.id);

  // 'all' = assign to everyone, otherwise user id
  const [assignMode, setAssignMode] = useState('single'); // single | all
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_datetime: '',  // YYYY-MM-DDTHH:mm
    assigned_to_id: '',
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (task) {
      // Reconstruct datetime from due_date (date only) — show in input
      setForm({
        title: task.title || '',
        description: task.description || '',
        due_datetime: task.due_date || '',
        assigned_to_id: task.assigned_to_id || '',
      });
      setNotes(task.notes || '');
    }
  }, [task]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (assignMode === 'single' && !form.assigned_to_id) {
      toast.error('Please select an assignee');
      return;
    }

    setSaving(true);
    const byName = `${user?.rank ? user.rank + ' ' : ''}${user?.display_name || user?.full_name || ''}`;

    const targets = assignMode === 'all' ? assignableUsers : [unitUsers.find(u => u.id === form.assigned_to_id)].filter(Boolean);

    for (const assignee of targets) {
      await base44.entities.Task.create({
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_datetime || undefined,
        assigned_to_id: assignee.id,
        assigned_to_name: assignee.display_name || assignee.full_name || '',
        assigned_to_rank: assignee.rank || '',
        assigned_by_id: user?.id,
        assigned_by_name: byName,
        unit: user?.unit,
        status: 'Not Done',
      });

      // Notify each assignee (via service-role function — cadets can't create Notifications directly)
      await base44.functions.invoke('broadcastNotification', {
        notification: {
          title: '📋 New Task Assigned',
          message: `You have been assigned: "${form.title}"${form.due_datetime ? ` · Due ${format(parseISO(form.due_datetime), "d MMM, h:mma").replace(':00', '')}` : ''}`,
          type: 'info',
          category: 'admin',
          recipient_email: assignee.email,
        },
      });
    }

    qc.invalidateQueries({ queryKey: ['tasks'] });
    toast.success(assignMode === 'all' ? `Task assigned to all ${targets.length} personnel` : 'Task assigned');
    navigate('/tasks');
    setSaving(false);
  };

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    await base44.entities.Task.update(task.id, { status: newStatus, notes });

    if (task.assigned_by_id && task.assigned_by_id !== user?.id) {
      const assigner = unitUsers.find(u => u.id === task.assigned_by_id)
        || (await base44.entities.User.filter({ unit: user?.unit })).find(u => u.id === task.assigned_by_id);
      if (assigner) {
        await base44.functions.invoke('broadcastNotification', {
          notification: {
            title: newStatus === 'Completed' ? '✅ Task Completed' : '📋 Task Updated',
            message: `"${task.title}" marked as "${newStatus}" by ${user?.rank ? user.rank + ' ' : ''}${user?.display_name || user?.full_name || ''}`,
            type: newStatus === 'Completed' ? 'success' : 'info',
            category: 'admin',
            recipient_email: assigner.email,
          },
        });
      }
    }

    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['task', id] });
    toast.success(newStatus === 'Completed' ? 'Task completed!' : `Status updated`);
    if (newStatus === 'Completed') navigate('/tasks');
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.Task.delete(task.id);
    qc.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('Task deleted');
    navigate('/tasks');
  };

  const isAssignee = task?.assigned_to_id === user?.id;
  const canChangeStatus = isAssignee || canManage;
  const isOverdue = task?.due_date && task?.status !== 'Completed' && isAfter(new Date(), parseISO(task.due_date));

  if (!isNew && isLoading) {
    return (
      <div>
        <PageHeader title="Task" backTo="/tasks" />
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── CREATE MODE ──
  if (isNew) {
    return (
      <div className="pb-24">
        <PageHeader title="Assign Task" backTo="/tasks" />
        <div className="px-4 py-4 space-y-5">

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title *</Label>
            <Input
              placeholder="e.g. Submit medical form, Clean bunk..."
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Details</Label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Additional instructions or context..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Due Date & Time</Label>
            <Input
              type="datetime-local"
              value={form.due_datetime}
              onChange={e => setForm({ ...form, due_datetime: e.target.value })}
              className="text-sm"
            />
          </div>

          {/* Assign to */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assign To *</Label>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignMode('single')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-colors',
                  assignMode === 'single'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <User className="h-3.5 w-3.5" /> Individual
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('all')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-colors',
                  assignMode === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Users className="h-3.5 w-3.5" /> Assign to All
              </button>
            </div>

            {assignMode === 'single' ? (
              /* Scrollable personnel list */
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border max-h-64 overflow-y-auto">
                {assignableUsers.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">No other personnel in your unit</p>
                ) : assignableUsers.map(u => {
                  const selected = form.assigned_to_id === u.id;
                  const displayName = `${u.rank ? u.rank + ' ' : ''}${u.display_name || u.full_name || u.email}`;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setForm({ ...form, assigned_to_id: u.id })}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left',
                        selected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/40 text-foreground'
                      )}
                    >
                      <span>{displayName}</span>
                      {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/20 bg-primary/8">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-primary font-semibold">
                  Task will be assigned to all {assignableUsers.length} personnel in {user?.unit}
                </p>
              </div>
            )}
          </div>

          <Button
            className="w-full h-10"
            onClick={handleCreate}
            disabled={saving || !form.title.trim() || (assignMode === 'single' && !form.assigned_to_id)}
          >
            {saving ? 'Assigning…' : assignMode === 'all' ? `Assign to All (${assignableUsers.length})` : 'Assign Task'}
          </Button>
        </div>
      </div>
    );
  }

  // ── DETAIL MODE ──
  if (!task) {
    return (
      <div>
        <PageHeader title="Task" backTo="/tasks" />
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">Task not found.</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['Not Done'];
  const StatusIcon = cfg.icon;
  const dueDateFormatted = task.due_date
    ? format(parseISO(task.due_date), "d MMM yyyy, h:mma").replace(':00', '')
    : null;

  return (
    <div className="pb-24">
      <PageHeader title="Task Detail" backTo="/tasks" />
      <div className="px-4 py-4 space-y-4">

        {/* Header card */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-start gap-3">
            <StatusIcon className={cn('h-5 w-5 mt-0.5 shrink-0', cfg.color)} />
            <div className="flex-1 min-w-0">
              <h2 className={cn('text-base font-bold leading-tight', task.status === 'Completed' && 'line-through text-muted-foreground')}>
                {task.title}
              </h2>
              {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-border">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assigned To</p>
              <p className="font-semibold">{task.assigned_to_rank ? `${task.assigned_to_rank} ` : ''}{task.assigned_to_name || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assigned By</p>
              <p className="font-semibold">{task.assigned_by_name || '—'}</p>
            </div>
            <div className="col-span-2 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Due</p>
              {dueDateFormatted ? (
                <p className={cn('font-semibold flex items-center gap-1', isOverdue && 'text-destructive')}>
                  {isOverdue && <AlertCircle className="h-3 w-3" />}
                  {dueDateFormatted}
                  {isOverdue && <span className="text-[10px] font-normal">(Overdue)</span>}
                </p>
              ) : <p className="text-muted-foreground">No due date</p>}
            </div>
          </div>
        </div>

        {/* Quick Done button — prominent for assignee */}
        {canChangeStatus && task.status !== 'Completed' && (
          <button
            onClick={() => handleStatusChange('Completed')}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-green-500/40 bg-green-500/10 text-green-400 text-sm font-bold hover:bg-green-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <CheckCircle2 className="h-5 w-5" />
            {saving ? 'Updating…' : 'Mark as Done'}
          </button>
        )}

        {/* In Progress toggle */}
        {canChangeStatus && task.status === 'Not Done' && (
          <button
            onClick={() => handleStatusChange('In Progress')}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 text-amber-400 text-xs font-semibold hover:bg-amber-500/15 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Clock className="h-4 w-4" />
            Mark as In Progress
          </button>
        )}

        {/* Completed state */}
        {task.status === 'Completed' && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl border border-green-500/25 bg-green-500/10">
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
            <p className="text-sm text-green-400 font-bold flex-1">Task Completed</p>
            {canManage && (
              <button className="text-[10px] text-muted-foreground underline" onClick={() => handleStatusChange('Not Done')}>
                Reopen
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        {canChangeStatus && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
            <textarea
              className="w-full min-h-[70px] px-3 py-2 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Add completion notes or comments..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await base44.entities.Task.update(task.id, { notes });
                qc.invalidateQueries({ queryKey: ['task', id] });
                toast.success('Notes saved');
                setSaving(false);
              }}
            >
              Save Notes
            </Button>
          </div>
        )}

        {/* Delete — bottom sheet confirmation */}
        {canManage && (
          <Drawer.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
            <Drawer.Trigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-destructive/40 hover:text-destructive transition-colors w-full justify-center pt-2">
                <Trash2 className="h-3 w-3" /> Delete Task
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
              <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card border-t border-border">
                <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border shrink-0" />
                <div className="px-6 py-6 space-y-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}>
                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <p className="text-base font-bold text-foreground">Delete this task?</p>
                    <p className="text-sm text-muted-foreground">"{task.title}"</p>
                    <p className="text-xs text-muted-foreground/70">This action cannot be undone.</p>
                  </div>
                  <Button variant="destructive" className="w-full h-11" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Yes, Delete Task'}
                  </Button>
                  <Button variant="outline" className="w-full h-10" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        )}
      </div>
    </div>
  );
}