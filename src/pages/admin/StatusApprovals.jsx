import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { isInstructor, isCadetAdmin, formatRankName } from '@/lib/constants';
import { Check, X, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

function fmtDate(d) {
  if (!d) return '—';
  return d.replace(/-/g, '').slice(2);
}

const TYPE_LABELS = {
  RSO: 'Report Sick Outside',
  RSI: 'Report Sick Inside',
  MA: 'Medical Appointment',
  OTHERS: 'Others',
};

// ── Individual request card ────────────────────────────────────────
function RequestCard({ report, instructorDisplayName, unit, onResolved }) {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState(null); // 'approve' | 'reject'
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (action === 'approve') {
        const isMedical = report.type === 'RSO' || report.type === 'RSI';
        await base44.entities.StatusReport.update(report.id, {
          status: isMedical ? 'approved' : 'active',
          approved_by: instructorDisplayName,
          approval_date: new Date().toISOString(),
          instructor_notes: notes || '',
        });

        const approvedMsg = notes
          ? `Your ${report.type} request has been approved.\nInstructor notes: ${notes}`
          : `Your ${report.type} request has been approved. ${
              report.type === 'RSO'
                ? 'Please go see the doctor, then update your outcome under Update RSO/RSI.'
                : report.type === 'RSI'
                ? 'Please go see the MO, then update your outcome under Update RSO/RSI.'
                : 'Parade state has been updated.'
            }`;

        try {
          await base44.entities.Notification.create({
            title: `${report.type} Approved`,
            message: approvedMsg,
            type: 'success',
            category: 'approval',
            recipient_email: report.reported_by,
            recipient_unit: unit,
            ...(isMedical ? { link: `/actions/status/update/medical?id=${report.id}` } : {}),
          });
        } catch (_) { /* notification failure is non-blocking */ }

          // Audit log
        await base44.entities.AuditLog.create({
          action: `status_approved_${report.type}`,
          category: 'approval',
          details: `${instructorDisplayName} approved ${report.type} for ${report.personnel_name} (${report.unit})${notes ? `. Notes: ${notes}` : ''}`,
          target_entity: 'StatusReport',
          target_id: report.id,
          performed_by: instructorDisplayName,
          unit,
        });

        toast.success(`${report.type} approved — cadet notified`);
      } else {
        await base44.entities.StatusReport.update(report.id, {
          status: 'rejected',
          instructor_notes: notes || '',
        });

        const deniedMsg = notes
          ? `Your ${report.type} request has been denied.\nReason: ${notes}`
          : `Your ${report.type} request has been denied.`;

        try {
          await base44.entities.Notification.create({
            title: `${report.type} Denied`,
            message: deniedMsg,
            type: 'error',
            category: 'approval',
            recipient_email: report.reported_by,
            recipient_unit: unit,
          });
        } catch (_) { /* notification failure is non-blocking */ }

        // Audit log
        await base44.entities.AuditLog.create({
          action: `status_denied_${report.type}`,
          category: 'approval',
          details: `${instructorDisplayName} denied ${report.type} for ${report.personnel_name} (${report.unit}). Reason: ${notes}`,
          target_entity: 'StatusReport',
          target_id: report.id,
          performed_by: instructorDisplayName,
          unit,
        });

        toast.success(`${report.type} denied — cadet notified`);
      }

      onResolved();
    } catch (err) {
      toast.error('Action failed. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const rankName = formatRankName(report.personnel_rank, report.personnel_name);

  return (
    <Card className="border-amber-500/25 bg-amber-500/5">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
                {report.type}
              </span>
              <p className="text-sm font-bold text-foreground">{rankName}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {TYPE_LABELS[report.type] || report.type} · {report.start_date || '—'}
            </p>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Details (collapsible) */}
        {expanded && (
          <div className="space-y-1 border-t border-border pt-3">
            {report.symptoms && (
              <div className="flex gap-2">
                <span className="text-[10px] text-muted-foreground w-20 shrink-0 uppercase">Symptoms</span>
                <span className="text-xs text-foreground">{report.symptoms}</span>
              </div>
            )}
            {report.details && (
              <div className="flex gap-2">
                <span className="text-[10px] text-muted-foreground w-20 shrink-0 uppercase">Details</span>
                <pre className="text-xs text-foreground whitespace-pre-wrap font-sans">{report.details}</pre>
              </div>
            )}
          </div>
        )}

        {/* Action area */}
        {!action ? (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setAction('reject')}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Deny
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 text-xs"
              onClick={() => setAction('approve')}
            >
              <Check className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
          </div>
        ) : (
          <div className="space-y-3 pt-1 border-t border-border">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${action === 'approve' ? 'text-primary' : 'text-destructive'}`}>
                {action === 'approve' ? '✓ Approving' : '✗ Denying'} — {rankName}
              </span>
              <button
                className="ml-auto text-muted-foreground hover:text-foreground text-xs"
                onClick={() => setAction(null)}
              >
                Cancel
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {action === 'reject' ? 'Reason (shown to cadet) *' : 'Notes for cadet (optional)'}
              </Label>
              <Textarea
                placeholder={action === 'reject' ? 'Explain why the request is denied…' : 'Any instructions for the cadet…'}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="min-h-[70px] text-sm"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={saving || (action === 'reject' && !notes.trim())}
            >
              {saving ? 'Processing…' : `Confirm ${action === 'approve' ? 'Approval' : 'Denial'}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function StatusApprovals() {
  const { user } = useOutletContext();
  const unit = user?.unit;
  const qc = useQueryClient();

  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const canAccess = instructor || cadetAdmin;

  const instructorDisplayName = user
    ? formatRankName(user.rank || '', (user.display_name || user.full_name || '').toUpperCase())
    : '';

  const { data: pendingReports = [], isLoading } = useQuery({
    queryKey: ['status-approvals', unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit, status: 'pending_approval' }, '-created_date', 100),
    enabled: !!unit && canAccess,
    refetchInterval: 30000,
  });

  const handleResolved = () => {
    qc.invalidateQueries({ queryKey: ['status-approvals', unit] });
    qc.invalidateQueries({ queryKey: ['parade-state', unit] });
  };

  if (!canAccess) {
    return (
      <div>
        <PageHeader title="Status Approvals" backTo="/admin" />
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">
          You don't have access to this page.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Status Approvals"
        backTo="/admin/parade-state"
        subtitle={unit}
      />

      <div className="px-4 py-4 space-y-4 pb-24">

        {/* Summary banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <ClipboardList className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {isLoading ? '…' : pendingReports.length} Pending {pendingReports.length === 1 ? 'Request' : 'Requests'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Denied requests will notify the cadet with your note. Approved RSO/RSI cadets can update their diagnosis afterwards.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && pendingReports.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Check className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">All clear</p>
            <p className="text-xs text-muted-foreground">No pending requests at the moment.</p>
          </div>
        )}

        {!isLoading && pendingReports.map(report => (
          <RequestCard
            key={report.id}
            report={report}
            instructorDisplayName={instructorDisplayName}
            unit={unit}
            onResolved={handleResolved}
          />
        ))}

      </div>
    </div>
  );
}