import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MobileSelect, MobileSelectItem } from '@/components/ui/MobileSelect';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import { CheckCircle2, Clock, Circle, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, isAfter } from 'date-fns';

const STATUS_OPTIONS = ['Not Done', 'In Progress', 'Completed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

const STATUS_CONFIG = {
  'Not Done': { icon: Circle, color: 'text-muted-foreground' },
  'In Progress': { icon: Clock, color: 'text-amber-400' },
  'Completed': { icon: CheckCircle2, color: 'text-green-400' },
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
    enabled: !!user?.unit && canManage,
  });

  const assignableUsers = unitUsers.filter(u => u.id !== user?.id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    due_date: '',
    assigned_to_id: '',
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'Medium',
        due_date: task.due_date || '',
        assigned_to_id: task.assigned_to_id || '',
      });
      setNotes(task.notes || '');
    }
  }, [task]);

  const selectedUser = unitUsers.find(u => u.id === form.assigned_to_id);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.assigned_to_id) {
      toast.error('Title and assignee are required');
      return;
    }
    setSaving(true);
    const assignee = unitUsers.find(u => u.id === form.assigned_to_id);
    await base44.entities.Task.create({
      ...form,
      assigned_to_name: assignee?.display_name || assignee?.full_name || '',
      assigned_to_rank: assignee?.rank || '',
      assigned_by_id: user?.id,
      assigned_by_name: `${user?.rank ? user.rank + ' ' : ''}${user?.display_name || user?.full_name || ''}`,
      unit: user?.unit,
      status: 'Not Done',
    });

    // Notify the assignee
    await base44.entities.Notification.create({
      title: '📋 New Task Assigned',
      message: `You have been assigned a new task: "${form.title}"${form.due_date ? ` · Due ${format(parseISO(form.due_date), 'd MMM yyyy')}` : ''}`,
      type: 'info',
      category: 'admin',
      recipient_email: assignee?.email,
      recipient_unit: user?.unit,
    });

    qc.invalidateQueries({ queryKey: ['tasks'] });
    toast.success('Task assigned');
    navigate('/tasks');
    setSaving(false);
  };

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    await base44.entities.Task.update(task.id, { status: newStatus, notes });

    // Notify assigner if assignee updated the status
    if (task.assigned_by_id && task.assigned_by_id !== user?.id) {
      const assignerUser = unitUsers.find(u => u.id === task.assigned_by_id);
      if (assignerUser) {
        await base44.entities.Notification.create({
          title: `📋 Task ${newStatus === 'Completed' ? 'Completed ✅' : 'Updated'}`,
          message: `"${task.title}" has been marked as "${newStatus}" by ${user?.rank ? user.rank + ' ' : ''}${user?.display_name || user?.full_name || ''}`,
          type: newStatus === 'Completed' ? 'success' : 'info',
          category: 'admin',
          recipient_email: assignerUser?.email,
          recipient_unit: user?.unit,
        });
      }
    }

    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['task', id] });
    toast.success(`Status updated to "${newStatus}"`);
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
  const isAssigner = task?.assigned_by_id === user?.id;
  const canChangeStatus = isAssignee || canManage;
  const canDelete = canManage;

  const isOverdue = task?.due_date && task?.status !== 'Completed' && isAfter(new Date(), parseISO(task.due_date));

  if (!isNew && isLoading) {
    return (
      <div>
        <PageHeader title="Task" backTo="/tasks" />
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      </div>
    );
  }

  // ── CREATE MODE ──
  if (isNew) {
    return (
      <div className="pb-24">
        <PageHeader title="Assign Task" backTo="/tasks" />
        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Title *</Label>
            <Input placeholder="e.g. Clean bunk, Submit form..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Additional details..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priority</Label>
              <MobileSelect value={form.priority} onValueChange={v => setForm({ ...form, priority: v })} placeholder="Priority">
                {PRIORITY_OPTIONS.map(p => <MobileSelectItem key={p} value={p}>{p}</MobileSelectItem>)}
              </MobileSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assign To *</Label>
            <MobileSelect value={form.assigned_to_id} onValueChange={v => setForm({ ...form, assigned_to_id: v })} placeholder="Select personnel">
              {assignableUsers.map(u => (
                <MobileSelectItem key={u.id} value={u.id}>
                  {u.rank ? `${u.rank} ` : ''}{u.display_name || u.full_name}
                </MobileSelectItem>
              ))}
            </MobileSelect>
          </div>

          <Button className="w-full h-10" onClick={handleCreate} disabled={saving || !form.title.trim() || !form.assigned_to_id}>
            {saving ? 'Assigning…' : 'Assign Task'}
          </Button>
        </div>
      </div>
    );
  }

  // ── DETAIL MODE ──
  if (!task) return (
    <div>
      <PageHeader title="Task" backTo="/tasks" />
      <div className="px-4 py-12 text-center"><p className="text-sm text-muted-foreground">Task not found.</p></div>
    </div>
  );

  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG['Not Done'];
  const StatusIcon = cfg.icon;

  return (
    <div className="pb-24">
      <PageHeader title="Task Detail" backTo="/tasks" />
      <div className="px-4 py-4 space-y-4">

        {/* Header card */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-start gap-3">
            <StatusIcon className={cn('h-5 w-5 mt-0.5 shrink-0', cfg.color)} />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold leading-tight">{task.title}</h2>
              {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assigned To</p>
              <p className="font-semibold">{task.assigned_to_rank ? `${task.assigned_to_rank} ` : ''}{task.assigned_to_name}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Assigned By</p>
              <p className="font-semibold">{task.assigned_by_name || '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Priority</p>
              <Badge className={cn('text-[9px] px-1.5 py-0 border', {
                'text-destructive bg-destructive/10 border-destructive/20': task.priority === 'High',
                'text-amber-400 bg-amber-500/10 border-amber-500/20': task.priority === 'Medium',
                'text-muted-foreground bg-muted/50 border-border': task.priority === 'Low',
              })}>{task.priority}</Badge>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Due Date</p>
              {task.due_date ? (
                <p className={cn('font-semibold', isOverdue && 'text-destructive flex items-center gap-1')}>
                  {isOverdue && <AlertCircle className="h-3 w-3" />}
                  {format(parseISO(task.due_date), 'd MMM yyyy')}
                  {isOverdue && ' (Overdue)'}
                </p>
              ) : <p className="text-muted-foreground">—</p>}
            </div>
          </div>
        </div>

        {/* Status update */}
        {canChangeStatus && task.status !== 'Completed' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Update Status</Label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(s => {
                const c = STATUS_CONFIG[s];
                const SIcon = c.icon;
                const active = task.status === s;
                return (
                  <button
                    key={s}
                    disabled={saving || active}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all',
                      active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20',
                      saving && 'opacity-50'
                    )}
                  >
                    <SIcon className={cn('h-4 w-4', active ? 'text-primary' : c.color)} />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed state */}
        {task.status === 'Completed' && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-green-500/25 bg-green-500/8">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            <p className="text-sm text-green-400 font-semibold">Task Completed</p>
            {canManage && (
              <button className="ml-auto text-[10px] text-muted-foreground underline" onClick={() => handleStatusChange('Not Done')}>Reopen</button>
            )}
          </div>
        )}

        {/* Completion notes */}
        {canChangeStatus && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes (optional)</Label>
            <textarea
              className="w-full min-h-[70px] px-3 py-2 rounded-md border border-input bg-transparent text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Add completion notes or comments..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <Button size="sm" variant="outline" className="w-full h-8 text-xs" disabled={saving}
              onClick={async () => {
                setSaving(true);
                await base44.entities.Task.update(task.id, { notes });
                qc.invalidateQueries({ queryKey: ['task', id] });
                toast.success('Notes saved');
                setSaving(false);
              }}>
              Save Notes
            </Button>
          </div>
        )}

        {/* Delete */}
        {canDelete && (
          !confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs text-destructive/40 hover:text-destructive transition-colors w-full justify-center pt-2">
              <Trash2 className="h-3 w-3" /> Delete Task
            </button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1 h-8 text-xs" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}