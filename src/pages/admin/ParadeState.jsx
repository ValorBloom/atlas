import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MobileSelect, MobileSelectItem } from '@/components/ui/MobileSelect';
import { isCadetAdmin, isInstructor, formatRankName } from '@/lib/constants';
import { Plus, X, Check, CheckSquare, Stethoscope, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter, parseISO, startOfDay } from 'date-fns';

// Format date as DDMMYY
function fmtDate(d) {
  if (!d) return '';
  return d.replace(/-/g, '').slice(2);
}

function isExpired(endDate) {
  if (!endDate) return false;
  const today = startOfDay(new Date());
  const end = startOfDay(parseISO(endDate));
  // Expired if today is AFTER end date
  return isAfter(today, end);
}

// Generate parade state line for a status report
function formatStatusLine(r) {
  const name = formatRankName(r.personnel_rank, r.personnel_name);
  if (r.type === 'PERM') {
    return `${name} PERMANENT STATUS: ${r.details || ''}`;
  }
  if (r.type === 'TEMP') {
    const dur = r.duration_text || '';
    const dates = r.start_date && r.end_date ? ` (${fmtDate(r.start_date)}-${fmtDate(r.end_date)})` : '';
    return `${name} ${dur}${dates}`;
  }
  if (r.status_category === 'MC') {
    const symptoms = r.symptoms ? `SYMPTOMS: ${r.symptoms.toUpperCase()} ` : '';
    const dx = r.diagnosis ? `DIAGNOSIS: ${r.diagnosis.toUpperCase()} ` : '';
    const dur = r.duration_text || '';
    const dates = r.start_date && r.end_date ? ` (${fmtDate(r.start_date)}-${fmtDate(r.end_date)})` : '';
    return `${name} ${symptoms}${dx}STATUS: ${dur} MC${dates}`;
  }
  // Light Duty / Others
  const dur = r.duration_text || '';
  const dates = r.start_date && r.end_date ? ` (${fmtDate(r.start_date)}-${fmtDate(r.end_date)})` : '';
  return `${name} ${dur} ${(r.status_category || 'LIGHT DUTY').toUpperCase()}${dates}`;
}

// Add Manual Status modal (cadet admin only)
function AddManualStatus({ unit, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    type: 'TEMP',
    personnel_name: '',
    personnel_rank: '',
    details: '',
    duration_text: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.personnel_name || !form.personnel_rank) return;
    setSaving(true);
    await base44.entities.StatusReport.create({
      type: form.type,
      personnel_name: form.personnel_name,
      personnel_rank: form.personnel_rank,
      details: form.details,
      duration_text: form.duration_text,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: 'active',
      unit,
      reported_by: user?.email,
    });
    setSaving(false);
    toast.success('Status added');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
      <div className="w-full bg-card rounded-t-2xl border-t border-border p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Add Manual Status</p>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {['TEMP', 'PERM'].map(t => (
            <button key={t} onClick={() => setForm({ ...form, type: t })}
              className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                form.type === t ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              }`}>{t === 'TEMP' ? 'Temporary' : 'Permanent'}</button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Rank</Label>
            <Input value={form.personnel_rank} onChange={e => setForm({ ...form, personnel_rank: e.target.value.toUpperCase() })} placeholder="ME4T" className="h-9 text-xs" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Name</Label>
            <Input value={form.personnel_name} onChange={e => setForm({ ...form, personnel_name: e.target.value.toUpperCase() })} placeholder="FULL NAME" className="h-9 text-xs" />
          </div>
        </div>

        {form.type === 'PERM' ? (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase">Details</Label>
            <Textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value.toUpperCase() })} placeholder="e.g. PES C — NO HIGH IMPACT ACTIVITIES" className="min-h-[70px] text-xs" />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase">Duration Text</Label>
              <Input value={form.duration_text} onChange={e => setForm({ ...form, duration_text: e.target.value.toUpperCase() })} placeholder="e.g. 30 DAYS LIGHT DUTY" className="h-9 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase">Start</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase">End</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="h-9 text-xs" />
              </div>
            </div>
          </>
        )}

        <Button className="w-full" onClick={handleSave} disabled={saving || !form.personnel_name || !form.personnel_rank}>
          <Check className="h-4 w-4 mr-1" />{saving ? 'Saving…' : 'Add Status'}
        </Button>
      </div>
    </div>
  );
}

export default function ParadeState() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const unit = user?.unit;
  const qc = useQueryClient();
  const [showAddManual, setShowAddManual] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: allReports = [], isLoading } = useQuery({
    queryKey: ['parade-state', unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit }, '-created_date', 100),
    enabled: !!unit,
    refetchInterval: 30000,
  });

  const { data: unitUsers = [] } = useQuery({
    queryKey: ['unit-users', unit],
    queryFn: () => base44.entities.User.filter({ unit }),
    enabled: !!unit,
  });

  // Auto-filter expired statuses (end_date in the past)
  const activeReports = allReports.filter(r => {
    if (r.status === 'rejected') return false;
    // PERM statuses never expire
    if (r.type === 'PERM') return r.status === 'active';
    // RSO pending approval — show in RSO section
    if (r.status === 'pending_approval') return true;
    // Active statuses — check expiry
    if (r.status === 'active' || r.status === 'approved') {
      if (r.end_date && isExpired(r.end_date)) return false;
      return true;
    }
    return false;
  });

  const pendingRSO = activeReports.filter(r => r.status === 'pending_approval');
  const rsoActive = activeReports.filter(r =>
    r.type === 'RSO' && (r.status === 'active' || r.status === 'approved') && !r.end_date
  );
  const mcStatuses = activeReports.filter(r =>
    (r.type === 'RSO' || r.type === 'RSI') &&
    r.status_category === 'MC' &&
    r.status === 'active' &&
    r.end_date
  );
  const tempStatuses = activeReports.filter(r => {
    if (r.type === 'PERM') return false;
    if (r.type === 'TEMP') return r.status === 'active';
    if ((r.type === 'RSO' || r.type === 'RSI') && r.status === 'active' && r.end_date && r.status_category !== 'MC') return true;
    if (r.type === 'MA') return r.status === 'active';
    return false;
  });
  const permStatuses = activeReports.filter(r => r.type === 'PERM' && r.status === 'active');

  const strength = unitUsers.filter(u => u.user_role !== 'instructor').length;
  const onStatus = new Set([...mcStatuses, ...tempStatuses, ...rsoActive].map(r => r.personnel_id)).size;

  const handleApprove = async (r) => {
    setApprovingId(r.id);
    await base44.entities.StatusReport.update(r.id, { status: 'approved' });
    // Notify cadet
    if (r.personnel_id) {
      await base44.entities.Notification.create({
        title: 'RSO Approved',
        message: 'Your RSO has been approved. Please see the doctor and then update your diagnosis and outcome.',
        type: 'success',
        category: 'status',
        recipient_email: r.reported_by,
        recipient_unit: unit,
      });
    }
    qc.invalidateQueries({ queryKey: ['parade-state', unit] });
    setApprovingId(null);
    toast.success('RSO approved — cadet notified');
  };

  const handleReject = async (r) => {
    setRejectingId(r.id);
    await base44.entities.StatusReport.update(r.id, { status: 'rejected' });
    qc.invalidateQueries({ queryKey: ['parade-state', unit] });
    setRejectingId(null);
    toast.success('RSO rejected');
  };

  const handleDelete = async (r) => {
    await base44.entities.StatusReport.delete(r.id);
    qc.invalidateQueries({ queryKey: ['parade-state', unit] });
    toast.success('Status removed');
  };

  const Section = ({ title, items, emptyText, children }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <span className="text-[10px] font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">{emptyText}</p>
      ) : (children || items.map(r => (
        <div key={r.id} className="p-3 rounded-xl border border-border bg-card flex items-start justify-between gap-2">
          <p className="text-xs font-mono leading-relaxed text-foreground flex-1">{formatStatusLine(r)}</p>
          {(instructor || cadetAdmin) && (
            <button onClick={() => handleDelete(r)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )))}
    </div>
  );

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Parade State" backTo="/admin" />
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Parade State"
        backTo="/admin"
        subtitle={`${unit} · ${today}`}
        rightAction={
          cadetAdmin && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setShowAddManual(true)}>
              <Plus className="h-3.5 w-3.5" />Add Status
            </Button>
          )
        }
      />

      <div className="px-4 py-4 space-y-5 pb-24">

        {/* Strength summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card><CardContent className="p-3 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Strength</p>
            <p className="text-xl font-bold">{strength}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">On Status</p>
            <p className="text-xl font-bold text-amber-400">{onStatus}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Available</p>
            <p className="text-xl font-bold text-green-400">{Math.max(0, strength - onStatus)}</p>
          </CardContent></Card>
        </div>

        {/* Pending RSO Approvals — instructors and cadet admins can approve */}
        {(instructor || cadetAdmin) && pendingRSO.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Pending RSO Approval</p>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">{pendingRSO.length}</span>
            </div>
            {pendingRSO.map(r => (
              <div key={r.id} className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/8 space-y-2">
                <div>
                  <p className="text-sm font-semibold">{formatRankName(r.personnel_rank, r.personnel_name)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.symptoms || 'No symptoms'}</p>
                  <p className="text-[10px] text-muted-foreground">{r.start_date} · Reported by {r.reported_by}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-destructive/30 text-destructive"
                    disabled={rejectingId === r.id} onClick={() => handleReject(r)}>
                    <X className="h-3 w-3 mr-1" />Reject
                  </Button>
                  <Button size="sm" className="flex-1 h-7 text-xs"
                    disabled={approvingId === r.id} onClick={() => handleApprove(r)}>
                    <Check className="h-3 w-3 mr-1" />{approvingId === r.id ? 'Approving…' : 'Approve'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RSO — awaiting post-consult update */}
        <Section title="RSO — Awaiting Update" items={rsoActive} emptyText="No pending RSO updates" />

        {/* MC */}
        <Section title="MC" items={mcStatuses} emptyText="No personnel on MC" />

        {/* Temporary Statuses */}
        <Section title="Temporary Statuses" items={tempStatuses} emptyText="No temporary statuses" />

        {/* Permanent Statuses — only cadet admin & instructor can add */}
        <Section title="Permanent Statuses" items={permStatuses} emptyText="No permanent statuses" />

      </div>

      {showAddManual && (
        <AddManualStatus
          unit={unit}
          user={user}
          onClose={() => setShowAddManual(false)}
          onSaved={() => {
            setShowAddManual(false);
            qc.invalidateQueries({ queryKey: ['parade-state', unit] });
          }}
        />
      )}
    </div>
  );
}