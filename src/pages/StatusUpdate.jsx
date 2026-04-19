import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRankName } from '@/lib/constants';
import { RefreshCw, Check, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StatusUpdate() {
  const { type } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['status-reports', type, user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ type, unit: user?.unit, status: 'active' }, '-created_date', 50),
    enabled: !!user?.unit,
  });

  const pendingApprovals = useQuery({
    queryKey: ['status-pending', type, user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ type, unit: user?.unit, status: 'pending_approval' }, '-created_date', 50),
    enabled: !!user?.unit && type === 'RSO',
  });

  const handleUpdate = async () => {
    if (!selected || !newStatus) return;
    setSaving(true);
    await base44.entities.StatusReport.update(selected.id, {
      status: newStatus,
      details: (selected.details || '') + `\n[${format(new Date(), 'dd MMM HH:mm')}] Updated to ${newStatus}${notes ? ': ' + notes : ''}`,
      ...(newStatus === 'approved' ? { approved_by: user?.email, approval_date: new Date().toISOString() } : {}),
    });

    await base44.entities.AuditLog.create({
      action: `status_update_${type.toLowerCase()}`,
      category: newStatus === 'approved' || newStatus === 'rejected' ? 'approval' : 'status',
      details: `${type} for ${selected.personnel_name} → ${newStatus}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setSaving(false);
    toast.success(`${type} status updated`);
    queryClient.invalidateQueries({ queryKey: ['status-reports'] });
    queryClient.invalidateQueries({ queryKey: ['status-pending'] });
    setSelected(null);
    setNewStatus('');
    setNotes('');
  };

  const allReports = [...reports, ...(pendingApprovals.data || [])];
  const statusColors = {
    active: 'bg-green-50 text-green-700',
    pending_approval: 'bg-amber-50 text-amber-700',
    approved: 'bg-primary/10 text-primary',
    rejected: 'bg-red-50 text-red-700',
    resolved: 'bg-muted text-muted-foreground',
  };

  return (
    <div>
      <PageHeader title={`Update ${type}`} backTo="/actions/status" />
      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : allReports.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active {type} records found.</p>
          </div>
        ) : (
          <>
            <Label className="text-sm font-medium">Select Record</Label>
            {allReports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                  selected?.id === r.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{formatRankName(r.personnel_rank, r.personnel_name)}</p>
                  <Badge className={`text-[10px] ${statusColors[r.status] || ''}`}>{r.status?.replace('_', ' ')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.symptoms || r.diagnosis || '—'} • {r.start_date}
                </p>
              </button>
            ))}

            {selected && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">New Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {selected.status === 'pending_approval' && (
                        <>
                          <SelectItem value="approved">Approve</SelectItem>
                          <SelectItem value="rejected">Reject</SelectItem>
                        </>
                      )}
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notes (optional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." />
                </div>
                <Button className="w-full" onClick={handleUpdate} disabled={!newStatus || saving}>
                  <Check className="h-4 w-4 mr-1" />{saving ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}