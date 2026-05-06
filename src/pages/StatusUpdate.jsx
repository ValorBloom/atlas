import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRankName, isInstructor, isCadetAdmin } from '@/lib/constants';
import { RefreshCw, Check, Stethoscope, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StatusUpdate() {
  const { type } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);

  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(''); // 'diagnosis' | 'approve' | 'cancel'
  const [diagnosis, setDiagnosis] = useState('');
  const [mcDetails, setMcDetails] = useState('');
  const [endDate, setEndDate] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [approvalDiagnosis, setApprovalDiagnosis] = useState('');
  const [approvalEndDate, setApprovalEndDate] = useState('');

  // For cadets: own records. For admins/instructors: all pending/active
  const { data: myReports = [], isLoading } = useQuery({
    queryKey: ['status-own', type, user?.id],
    queryFn: () => base44.entities.StatusReport.filter(
      { type, personnel_id: user?.id }, '-created_date', 20
    ),
    enabled: !!user?.id && !instructor && !cadetAdmin,
  });

  const { data: allReports = [], isLoading: allLoading } = useQuery({
    queryKey: ['status-all', type, user?.unit],
    queryFn: () => base44.entities.StatusReport.filter(
      { type, unit: user?.unit }, '-created_date', 50
    ),
    enabled: !!user?.unit && (instructor || cadetAdmin),
  });

  const displayReports = (instructor || cadetAdmin) ? allReports : myReports;
  const loading = isLoading || allLoading;

  const activeReports = displayReports.filter(r =>
    ['active', 'pending_approval', 'approved'].includes(r.status)
  );

  const statusBadge = (s) => {
    const map = {
      active: 'bg-green-500/15 text-green-400 border-green-500/25',
      pending_approval: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
      approved: 'bg-primary/15 text-primary border-primary/25',
      rejected: 'bg-destructive/15 text-destructive border-destructive/25',
      resolved: 'bg-muted text-muted-foreground border-border',
    };
    return map[s] || map.active;
  };

  const handleDiagnosisUpdate = async () => {
    if (!selected) return;
    setSaving(true);

    const diagStr = [
      diagnosis && `DIAGNOSIS: ${diagnosis.toUpperCase()}`,
      mcDetails && `STATUS: ${mcDetails.toUpperCase()}`,
      endDate && `END DATE: ${endDate}`,
    ].filter(Boolean).join('\n');

    await base44.entities.StatusReport.update(selected.id, {
      diagnosis,
      end_date: endDate,
      details: (selected.details || '') + `\n\n[Post-consult update — ${format(new Date(), 'dd MMM HH:mm')}]\n${diagStr}`,
    });

    // Notify cadet admins + instructors to update parade state
    await base44.entities.Notification.create({
      title: '📋 Status Updated — Update Parade State',
      message: `${formatRankName(selected.personnel_rank, selected.personnel_name)} ${type}: ${diagStr}`,
      type: 'info',
      category: 'admin',
      recipient_unit: user?.unit,
    });

    await base44.entities.AuditLog.create({
      action: `status_diagnosis_update_${type.toLowerCase()}`,
      category: 'status',
      details: `${type} diagnosis update for ${selected.personnel_name}: ${diagStr}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setSaving(false);
    toast.success('Diagnosis updated — parade state reminder sent');
    queryClient.invalidateQueries({ queryKey: ['status-own'] });
    queryClient.invalidateQueries({ queryKey: ['status-all'] });
    queryClient.invalidateQueries({ queryKey: ['active-statuses'] });
    queryClient.invalidateQueries({ queryKey: ['approved-statuses'] });
    setSelected(null);
    setMode('');
    setDiagnosis('');
    setMcDetails('');
    setEndDate('');
  };

  const handleApprovalUpdate = async () => {
    if (!selected || !newStatus) return;
    setSaving(true);

    const updateData = {
      status: newStatus,
      details: (selected.details || '') + `\n[${format(new Date(), 'dd MMM HH:mm')}] ${newStatus.toUpperCase()}${notes ? ': ' + notes : ''}`,
      ...(newStatus === 'approved' ? { approved_by: user?.email, approval_date: new Date().toISOString() } : {}),
    };
    if (approvalDiagnosis) updateData.diagnosis = approvalDiagnosis;
    if (approvalEndDate) updateData.end_date = approvalEndDate;

    await base44.entities.StatusReport.update(selected.id, updateData);

    // If approved, notify cadet to know & remind admin to update parade state
    if (newStatus === 'approved') {
      await base44.entities.Notification.create({
        title: `${type} Approved`,
        message: `${formatRankName(selected.personnel_rank, selected.personnel_name)} ${type} has been approved. Remember to update parade state.`,
        type: 'success',
        category: 'admin',
        recipient_unit: user?.unit,
      });
    } else if (newStatus === 'rejected') {
      await base44.entities.Notification.create({
        title: `${type} Rejected`,
        message: `${formatRankName(selected.personnel_rank, selected.personnel_name)} — ${type} was rejected${notes ? ': ' + notes : ''}.`,
        type: 'error',
        category: 'status',
        recipient_unit: user?.unit,
      });
    }

    await base44.entities.AuditLog.create({
      action: `status_update_${type.toLowerCase()}`,
      category: newStatus === 'approved' || newStatus === 'rejected' ? 'approval' : 'status',
      details: `${type} for ${selected.personnel_name} → ${newStatus}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setSaving(false);
    toast.success(`${type} status updated`);
    queryClient.invalidateQueries({ queryKey: ['status-all'] });
    queryClient.invalidateQueries({ queryKey: ['active-statuses'] });
    queryClient.invalidateQueries({ queryKey: ['approved-statuses'] });
    setSelected(null);
    setMode('');
    setNewStatus('');
    setNotes('');
  };

  const handleSelect = (r) => {
    setSelected(r);
    setMode('');
    setDiagnosis(r.diagnosis || '');
    setMcDetails('');
    setEndDate(r.end_date || '');
    setNewStatus('');
    setNotes('');
    setApprovalDiagnosis('');
    setApprovalEndDate('');
  };

  const pageTitle = instructor ? `${type} Approvals` : `Update ${type}`;

  return (
    <div>
      <PageHeader title={pageTitle} backTo="/actions/status" />
      <div className="px-4 py-4 space-y-4">

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : activeReports.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active {type} records.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Select a record to update</p>
            <div className="space-y-2">
              {activeReports.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(selected?.id === r.id ? null : r)}
                  className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all ${
                    selected?.id === r.id
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{formatRankName(r.personnel_rank, r.personnel_name)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.symptoms || r.diagnosis || '—'}
                      </p>
                      {r.diagnosis && (
                        <p className="text-xs text-primary mt-0.5 font-mono">DX: {r.diagnosis}</p>
                      )}
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${statusBadge(r.status)}`}>
                      {r.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">{r.start_date}</p>
                </button>
              ))}
            </div>

            {/* Action panel */}
            {selected && (
              <div className="space-y-4 pt-1 border-t border-border">

                {/* Mode selector */}
                {!mode && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What would you like to do?</p>
                    <div className="grid gap-2">
                      {/* Cadet: post-consult update */}
                      {!instructor && !cadetAdmin && (type === 'RSO' || type === 'RSI') && (
                        <button
                          onClick={() => setMode('diagnosis')}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Update Post-Consult</p>
                            <p className="text-xs text-muted-foreground">Add diagnosis and MC details after seeing the doctor</p>
                          </div>
                        </button>
                      )}
                      {/* Cadet: cancel own request */}
                      {!instructor && !cadetAdmin && (
                        <button
                          onClick={() => setMode('cancel')}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                            <Check className="h-4 w-4 text-destructive" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-destructive">Cancel Request</p>
                            <p className="text-xs text-muted-foreground">Withdraw this status report</p>
                          </div>
                        </button>
                      )}
                      {/* Instructor / Cadet Admin: approve or reject only */}
                      {(instructor || cadetAdmin) && (
                        <>
                          <button
                            onClick={() => { setMode('approve'); setNewStatus('approved'); }}
                            className="flex items-center gap-3 p-3.5 rounded-xl border border-green-500/25 bg-green-500/8 hover:bg-green-500/12 transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-4 w-4 text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-400">Approve</p>
                              <p className="text-xs text-muted-foreground">Approve this {type} request</p>
                            </div>
                          </button>
                          <button
                            onClick={() => { setMode('approve'); setNewStatus('rejected'); }}
                            className="flex items-center gap-3 p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                              <Check className="h-4 w-4 text-destructive" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-destructive">Reject</p>
                              <p className="text-xs text-muted-foreground">Reject this {type} request</p>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Diagnosis mode */}
                {mode === 'diagnosis' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post-Consult Update</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Diagnosis</Label>
                      <Input
                        placeholder="e.g. KNEE INFLAMMATION"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">MC / Status Details</Label>
                      <Input
                        placeholder="e.g. 2 DAY MC (120326-180326)"
                        value={mcDetails}
                        onChange={(e) => setMcDetails(e.target.value.toUpperCase())}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">End Date (optional)</Label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setMode('')}>Cancel</Button>
                      <Button className="flex-1" onClick={handleDiagnosisUpdate}
                        disabled={!diagnosis || saving}>
                        <Check className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Update'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cancel mode (cadet only) */}
                {mode === 'cancel' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Cancel Request</p>
                    <p className="text-xs text-muted-foreground">This will withdraw your {type} request. This cannot be undone.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setMode('')}>Go Back</Button>
                      <Button variant="destructive" className="flex-1" onClick={async () => {
                        setSaving(true);
                        await base44.entities.StatusReport.update(selected.id, { status: 'resolved' });
                        await base44.entities.AuditLog.create({
                          action: `status_cancelled_${type.toLowerCase()}`,
                          category: 'status',
                          details: `${type} cancelled by ${selected.personnel_name}`,
                          performed_by: user?.email,
                          unit: user?.unit,
                        });
                        setSaving(false);
                        toast.success('Request cancelled');
                        queryClient.invalidateQueries({ queryKey: ['status-own'] });
                        setSelected(null); setMode('');
                      }} disabled={saving}>
                        {saving ? 'Cancelling...' : 'Yes, Cancel'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Approval mode (instructor pre-selects approve or reject) */}
                {mode === 'approve' && (
                  <div className="space-y-3">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${newStatus === 'approved' ? 'text-green-400' : 'text-destructive'}`}>
                      {newStatus === 'approved' ? 'Approving' : 'Rejecting'} — {formatRankName(selected.personnel_rank, selected.personnel_name)}
                    </p>
                    {newStatus === 'approved' && type === 'RSO' && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Diagnosis <span className="text-muted-foreground">(optional)</span></Label>
                          <Input
                            placeholder="e.g. KNEE INFLAMMATION"
                            value={approvalDiagnosis}
                            onChange={(e) => setApprovalDiagnosis(e.target.value.toUpperCase())}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">End Date <span className="text-muted-foreground">(optional)</span></Label>
                          <Input type="date" value={approvalEndDate} onChange={(e) => setApprovalEndDate(e.target.value)} />
                        </div>
                      </>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes..." className="min-h-[60px]" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setMode('')}>Back</Button>
                      <Button
                        className={`flex-1 ${newStatus === 'rejected' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                        onClick={handleApprovalUpdate}
                        disabled={saving}
                      >
                        <Check className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Confirm'}
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}