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
import SuccessDialog from '@/components/ui/SuccessDialog';

const TYPE_LABELS = {
  RSO: 'Report Sick Outside',
  RSI: 'Report Sick Inside',
  MA: 'Medical Appointment',
  OTHERS: 'Others',
};

// ── Individual request card ────────────────────────────────────────
function RequestCard({ report, instructorDisplayName, unit, canApprove, onResolved }) {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('resolveStatusReport', {
        reportId: report.id,
        action: action === 'approve' ? 'approve' : 'deny',
        notes: notes || '',
        instructorDisplayName,
        unit,
      });

      if (res.data?.error) throw new Error(res.data.error);

      onResolved(
        action === 'approve'
          ? `${rankName}'s ${report.type} has been approved.`
          : `${rankName}'s ${report.type} request has been denied.`
      );
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
              {report.unit && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {report.unit}
                </span>
              )}
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

        {/* Action area — only instructors of the same unit can approve/deny */}
        {canApprove ? (
          !action ? (
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
          )
        ) : (
          <p className="text-[11px] text-muted-foreground pt-1 italic">
            View only — only instructors from {report.unit} can approve this request.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function StatusApprovals() {
  const { user } = useOutletContext();
  const qc = useQueryClient();

  const [successMsg, setSuccessMsg] = useState(null);

  const userUnit = user?.unit;
  const userRole = user?.user_role;
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const canAccess = instructor || cadetAdmin;

  const instructorDisplayName = user
    ? formatRankName(user.rank || '', (user.display_name || user.full_name || '').toUpperCase())
    : '';

  // Use backend function to bypass RLS and get pending reports for our unit
  const { data: fetchResult, isLoading, error } = useQuery({
    queryKey: ['status-approvals', userUnit, userRole],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPendingApprovals', {});
      return res.data;
    },
    enabled: canAccess,
    refetchInterval: 30000,
  });

  const pendingReports = fetchResult?.reports || [];

  const handleResolved = (message) => {
    qc.invalidateQueries({ queryKey: ['status-approvals'] });
    qc.invalidateQueries({ queryKey: ['parade-state'] });
    if (message) setSuccessMsg(message);
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
        subtitle={userUnit}
      />

      <div className="px-4 py-4 space-y-4 pb-24">

        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
          <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <ClipboardList className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {isLoading ? '…' : pendingReports.length} Pending {pendingReports.length === 1 ? 'Request' : 'Requests'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {instructor
                ? 'You can approve or deny requests from your unit.'
                : 'Viewing pending requests — only instructors can approve or deny.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive text-center py-4">
            Failed to load requests. Please refresh.
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && !error && pendingReports.length === 0 && (
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
            unit={userUnit}
            canApprove={instructor && report.unit === userUnit}
            onResolved={handleResolved}
          />
        ))}

      </div>

      <SuccessDialog
        open={!!successMsg}
        onClose={() => setSuccessMsg(null)}
        title="Request Resolved"
        message={successMsg || ''}
      />
    </div>
  );
}