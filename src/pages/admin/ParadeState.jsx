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
import { isCadetAdmin, isInstructor, formatRankName } from '@/lib/constants';
import { Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter, parseISO, startOfDay } from 'date-fns';

function fmtDate(d) {
  if (!d) return '';
  return d.replace(/-/g, '').slice(2);
}

function isExpired(endDate) {
  if (!endDate) return false;
  return isAfter(startOfDay(new Date()), startOfDay(parseISO(endDate)));
}

// Generate the parade state text line for a record
function formatStatusLine(r) {
  const name = formatRankName(r.personnel_rank, r.personnel_name);

  if (r.type === 'PERM') {
    return `${name}\nPERMANENT STATUS: ${r.details || ''}`;
  }

  if (r.type === 'TEMP') {
    const dur = r.duration_text || '';
    const dates = r.start_date && r.end_date ? ` (${fmtDate(r.start_date)}-${fmtDate(r.end_date)})` : '';
    return `${name}\n${dur}${dates}`;
  }

  if (r.type === 'MA') {
    // Parse stored details block
    const lines = (r.details || '').split('\n').filter(Boolean);
    const endorsed = r.approved_by ? `ENDORSED BY: ${r.approved_by}` : '';
    return [name, ...lines, endorsed].filter(Boolean).join('\n');
  }

  if (r.type === 'OTHERS') {
    const lines = (r.details || '').split('\n').filter(Boolean);
    const endorsed = r.approved_by ? `ENDORSED BY: ${r.approved_by}` : '';
    return [name, ...lines, endorsed].filter(Boolean).join('\n');
  }

  // RSO / RSI
  if (r.status_category === 'MC') {
    const symptoms = r.symptoms ? `SYMPTOMS: ${r.symptoms.toUpperCase()} ` : '';
    const dx = r.diagnosis ? `DIAGNOSIS: ${r.diagnosis.toUpperCase()} ` : '';
    const dur = r.duration_text || '';
    const dates = r.start_date && r.end_date ? ` (${fmtDate(r.start_date)}-${fmtDate(r.end_date)})` : '';
    return `${name}\n${symptoms}${dx}STATUS: ${dur} MC${dates}`;
  }

  // RSO/RSI awaiting post-consult update — show in RSO/RSI section
  if ((r.type === 'RSO' || r.type === 'RSI') && !r.diagnosis) {
    return `${name}\n${r.type} — SYMPTOMS: ${r.symptoms?.toUpperCase() || '—'} — AWAITING POST-CONSULT UPDATE`;
  }

  // Light Duty / Others outcome
  const dur = r.duration_text || '';
  const dates = r.start_date && r.end_date ? ` (${fmtDate(r.start_date)}-${fmtDate(r.end_date)})` : '';
  return `${name}\n${dur} ${(r.status_category || 'LIGHT DUTY').toUpperCase()}${dates}`;
}

// ── Approve / Deny modal with optional notes ──────────────────────
function ApprovalModal({ report, instructorName, onConfirm, onCancel }) {
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState(null); // 'approve' | 'reject'
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm(action, notes);
    setSaving(false);
  };

  if (!action) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
        <div className="w-full bg-card rounded-t-2xl border-t border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">
              {report.type} — {formatRankName(report.personnel_rank, report.personnel_name)}
            </p>
            <button onClick={onCancel}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          {report.symptoms && (
            <p className="text-xs text-muted-foreground">Symptoms: {report.symptoms}</p>
          )}
          {report.details && (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{report.details}</pre>
          )}
          <p className="text-xs text-muted-foreground">Date: {report.start_date} · By: {report.reported_by}</p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 border-destructive/30 text-destructive"
              onClick={() => setAction('reject')}>
              <X className="h-3.5 w-3.5 mr-1" />Deny
            </Button>
            <Button className="flex-1" onClick={() => setAction('approve')}>
              <Check className="h-3.5 w-3.5 mr-1" />Approve
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
      <div className="w-full bg-card rounded-t-2xl border-t border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">
            {action === 'approve' ? '✓ Approve' : '✗ Deny'} — {report.type}
          </p>
          <button onClick={() => setAction(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes (optional)</Label>
          <Textarea
            placeholder="Add any remarks or instructions..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="min-h-[80px] text-sm"
          />
        </div>
        <Button className="w-full" onClick={handleConfirm} disabled={saving}>
          {saving ? 'Processing…' : `Confirm ${action === 'approve' ? 'Approval' : 'Denial'}`}
        </Button>
      </div>
    </div>
  );
}

// ── Add Manual Status ──────────────────────────────────────────────
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

// ── Section component ─────────────────────────────────────────────
function Section({ title, items, emptyText, canAdmin, onDelete }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <span className="text-[10px] font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">{emptyText}</p>
      ) : (
        items.map(r => (
          <div key={r.id} className="p-3 rounded-xl border border-border bg-card flex items-start justify-between gap-2">
            <pre className="text-xs font-mono leading-relaxed text-foreground flex-1 whitespace-pre-wrap">{formatStatusLine(r)}</pre>
            {canAdmin && (
              <button onClick={() => onDelete(r)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function ParadeState() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const canAdmin = instructor || cadetAdmin;
  const unit = user?.unit;
  const qc = useQueryClient();
  const [showAddManual, setShowAddManual] = useState(false);
  const [selectedPending, setSelectedPending] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Instructor display name for endorsement
  const instructorDisplayName = user
    ? formatRankName(user.rank || '', (user.display_name || user.full_name || '').toUpperCase())
    : '';

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

  // Filter expired
  const activeReports = allReports.filter(r => {
    if (r.status === 'rejected') return false;
    if (r.type === 'PERM') return r.status === 'active';
    if (r.status === 'pending_approval') return true;
    if (r.status === 'active' || r.status === 'approved') {
      if (r.end_date && isExpired(r.end_date)) return false;
      return true;
    }
    return false;
  });

  // Sections
  const pendingApproval = activeReports.filter(r => r.status === 'pending_approval');

  // RSO/RSI approved but awaiting post-consult update (no diagnosis yet)
  const awaitingUpdate = activeReports.filter(r =>
    (r.type === 'RSO' || r.type === 'RSI') &&
    r.status === 'approved' &&
    !r.diagnosis
  );

  // MC — RSO/RSI with MC outcome
  const mcStatuses = activeReports.filter(r =>
    (r.type === 'RSO' || r.type === 'RSI') &&
    r.status_category === 'MC' &&
    r.status === 'active' &&
    r.end_date
  );

  // MA statuses — approved
  const maStatuses = activeReports.filter(r =>
    r.type === 'MA' && r.status === 'active'
  );

  // Others statuses — approved
  const othersStatuses = activeReports.filter(r =>
    r.type === 'OTHERS' && r.status === 'active'
  );

  // Temporary — non-MC RSO/RSI outcomes + manual TEMP entries
  const tempStatuses = activeReports.filter(r => {
    if (r.type === 'PERM') return false;
    if (r.type === 'TEMP') return r.status === 'active';
    if ((r.type === 'RSO' || r.type === 'RSI') && r.status === 'active' && r.end_date && r.status_category !== 'MC') return true;
    return false;
  });

  const permStatuses = activeReports.filter(r => r.type === 'PERM' && r.status === 'active');

  const strength = unitUsers.filter(u => u.user_role !== 'instructor').length;
  const onStatus = new Set([
    ...mcStatuses,
    ...tempStatuses,
    ...maStatuses,
    ...othersStatuses,
    ...awaitingUpdate,
  ].map(r => r.personnel_id).filter(Boolean)).size;

  // Approve / deny handler
  const handleDecision = async (action, notes) => {
    const r = selectedPending;
    if (!r) return;

    try {
      if (action === 'approve') {
        const isMedicalReport = r.type === 'RSO' || r.type === 'RSI';
        await base44.entities.StatusReport.update(r.id, {
          status: isMedicalReport ? 'approved' : 'active',
          approved_by: instructorDisplayName,
          approval_date: new Date().toISOString(),
          instructor_notes: notes || '',
        });

        const approvedMsg = notes
          ? `Your ${r.type} request has been approved.\nInstructor notes: ${notes}`
          : `Your ${r.type} request has been approved. ${r.type === 'RSO' ? 'Please go see the doctor.' : r.type === 'RSI' ? 'Please go see the MO.' : 'Parade state has been updated.'}`;

        await base44.entities.Notification.create({
          title: `${r.type} Approved`,
          message: approvedMsg,
          type: 'success',
          category: 'approval',
          recipient_email: r.reported_by,
          recipient_unit: unit,
        });

        toast.success(`${r.type} approved — cadet notified`);
      } else {
        await base44.entities.StatusReport.update(r.id, {
          status: 'rejected',
          instructor_notes: notes || '',
        });

        const deniedMsg = notes
          ? `Your ${r.type} request has been denied.\nInstructor notes: ${notes}`
          : `Your ${r.type} request has been denied.`;

        await base44.entities.Notification.create({
          title: `${r.type} Denied`,
          message: deniedMsg,
          type: 'error',
          category: 'approval',
          recipient_email: r.reported_by,
          recipient_unit: unit,
        });

        toast.success(`${r.type} denied — cadet notified`);
      }
    } catch (err) {
      toast.error('Action failed. Please try again.');
      console.error(err);
    }

    qc.invalidateQueries({ queryKey: ['parade-state', unit] });
    setSelectedPending(null);
  };

  const handleDelete = async (r) => {
    await base44.entities.StatusReport.delete(r.id);
    qc.invalidateQueries({ queryKey: ['parade-state', unit] });
    toast.success('Status removed');
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Parade State" backTo="/admin" />
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
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
          canAdmin && (
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

        {/* Pending Approvals — visible to instructors and cadet admins */}
        {canAdmin && pendingApproval.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Pending Approval</p>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">{pendingApproval.length}</span>
            </div>
            {pendingApproval.map(r => (
              <div key={r.id} className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/8 space-y-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">{r.type}</span>
                    <p className="text-sm font-semibold">{formatRankName(r.personnel_rank, r.personnel_name)}</p>
                  </div>
                  {r.symptoms && <p className="text-xs text-muted-foreground mt-1">Symptoms: {r.symptoms}</p>}
                  {r.details && <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap font-sans">{r.details}</pre>}
                  <p className="text-[10px] text-muted-foreground mt-1">{r.start_date} · {r.reported_by}</p>
                </div>
                <Button size="sm" className="w-full h-8 text-xs" onClick={() => setSelectedPending(r)}>
                  Review Request
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* RSO/RSI — awaiting post-consult update */}
        <Section
          title="RSO / RSI — Awaiting Update"
          items={awaitingUpdate}
          emptyText="No pending post-consult updates"
          canAdmin={canAdmin}
          onDelete={handleDelete}
        />

        {/* MC */}
        <Section
          title="MC"
          items={mcStatuses}
          emptyText="No personnel on MC"
          canAdmin={canAdmin}
          onDelete={handleDelete}
        />

        {/* MA */}
        <Section
          title="Medical Appointments"
          items={maStatuses}
          emptyText="No medical appointments"
          canAdmin={canAdmin}
          onDelete={handleDelete}
        />

        {/* Others */}
        <Section
          title="Others"
          items={othersStatuses}
          emptyText="No others statuses"
          canAdmin={canAdmin}
          onDelete={handleDelete}
        />

        {/* Temporary Statuses */}
        <Section
          title="Temporary Statuses"
          items={tempStatuses}
          emptyText="No temporary statuses"
          canAdmin={canAdmin}
          onDelete={handleDelete}
        />

        {/* Permanent Statuses */}
        <Section
          title="Permanent Statuses"
          items={permStatuses}
          emptyText="No permanent statuses"
          canAdmin={canAdmin}
          onDelete={handleDelete}
        />

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

      {selectedPending && (
        <ApprovalModal
          report={selectedPending}
          instructorName={instructorDisplayName}
          onConfirm={handleDecision}
          onCancel={() => setSelectedPending(null)}
        />
      )}
    </div>
  );
}