import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MobileSelect, MobileSelectItem } from '@/components/ui/MobileSelect';
import { formatRankName } from '@/lib/constants';
import { Check, Stethoscope, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

const STATUS_CATEGORIES = ['MC', 'Light Duty', 'Others'];

export default function StatusUpdate() {
  const { type } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const [form, setForm] = useState({
    diagnosis: '',
    status_category: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    notes: '',
    duration_days: '',
  });

  // Load pending/active RSO reports for the current user
  const { data: myReports = [], isLoading } = useQuery({
    queryKey: ['my-rso-reports', user?.id],
    queryFn: () => base44.entities.StatusReport.filter(
      { personnel_id: user?.id, type: 'RSO' },
      '-created_date',
      10
    ),
    enabled: !!user?.id,
  });

  // Show only approved (ready to update) or active reports without diagnosis
  const updatable = myReports.filter(r =>
    r.status === 'approved' || (r.status === 'active' && !r.diagnosis)
  );

  const handleCategoryChange = (cat) => {
    const start = form.start_date || format(new Date(), 'yyyy-MM-dd');
    const days = parseInt(form.duration_days) || 1;
    // Auto-compute end date
    let endDate = '';
    if (days > 0 && start) {
      endDate = format(addDays(new Date(start), days - 1), 'yyyy-MM-dd');
    }
    setForm({ ...form, status_category: cat, end_date: endDate });
  };

  const handleDaysChange = (val) => {
    const days = parseInt(val) || 0;
    const start = form.start_date;
    let endDate = '';
    if (days > 0 && start) {
      endDate = format(addDays(new Date(start), days - 1), 'yyyy-MM-dd');
    }
    setForm({ ...form, duration_days: val, end_date: endDate });
  };

  const handleStartChange = (val) => {
    const days = parseInt(form.duration_days) || 0;
    let endDate = '';
    if (days > 0 && val) {
      endDate = format(addDays(new Date(val), days - 1), 'yyyy-MM-dd');
    }
    setForm({ ...form, start_date: val, end_date: endDate });
  };

  const canSubmit = selectedReport && form.diagnosis && form.status_category && form.start_date && form.end_date;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    const days = parseInt(form.duration_days) || 1;
    const startFmt = form.start_date.replace(/-/g, '').slice(2); // DDMMYY
    const endFmt = form.end_date.replace(/-/g, '').slice(2);
    const durationText = `${days} ${form.status_category === 'MC' ? 'DAY' : 'DAYS'}`;

    await base44.entities.StatusReport.update(selectedReport.id, {
      diagnosis: form.diagnosis,
      status_category: form.status_category,
      start_date: form.start_date,
      end_date: form.end_date,
      duration_text: durationText,
      details: form.notes || selectedReport.details || '',
      status: 'active',
    });

    // Notify unit
    await base44.entities.Notification.create({
      title: 'RSO Updated',
      message: `${formatRankName(user?.rank, user?.full_name)} — ${form.status_category}: ${durationText} (${startFmt}-${endFmt})`,
      type: 'info',
      category: 'status',
      recipient_unit: user?.unit,
    });

    await base44.entities.AuditLog.create({
      action: 'status_update_rso',
      category: 'status',
      details: `RSO updated for ${user?.full_name}: ${form.status_category} ${durationText}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setSaving(false);
    toast.success('Status updated');
    navigate('/actions/status');
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Update RSO" backTo="/actions/status" />
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Update RSO" backTo="/actions/status" subtitle="Post-consultation update" />
      <div className="px-4 py-4 space-y-4 pb-24">

        {/* Info banner */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5">
          <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select your approved RSO, then fill in your diagnosis and outcome from the doctor.
          </p>
        </div>

        {updatable.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No approved RSO to update</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your RSO must be approved by an instructor before you can update it.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select report */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Select RSO Report</Label>
              <div className="space-y-2">
                {updatable.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedReport?.id === r.id
                        ? 'border-primary/40 bg-primary/8'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">RSO — {r.start_date}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.symptoms || 'No symptoms recorded'}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block font-semibold ${
                      r.status === 'approved' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {r.status === 'approved' ? 'Approved — ready to update' : 'Active'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedReport && (
              <>
                {/* Diagnosis */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Diagnosis</Label>
                  <Textarea
                    placeholder="e.g. Viral Infection, Sprained Ankle"
                    value={form.diagnosis}
                    onChange={e => setForm({ ...form, diagnosis: e.target.value.toUpperCase() })}
                    className="min-h-[70px]"
                  />
                </div>

                {/* Status Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Outcome</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryChange(cat)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          form.status_category === cat
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted/30'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration & Dates */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Duration (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 2"
                    value={form.duration_days}
                    onChange={e => handleDaysChange(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start Date</Label>
                    <Input type="date" value={form.start_date} onChange={e => handleStartChange(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Date</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes (optional)</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="min-h-[60px]"
                  />
                </div>

                {/* Preview */}
                {form.status_category && form.diagnosis && form.duration_days && form.start_date && form.end_date && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Preview</p>
                    {form.status_category === 'MC' ? (
                      <p className="text-xs font-mono text-foreground leading-relaxed">
                        {formatRankName(user?.rank, user?.full_name)} SYMPTOMS: {selectedReport.symptoms?.toUpperCase() || '—'} DIAGNOSIS: {form.diagnosis} STATUS: {form.duration_days} DAY MC ({form.start_date.replace(/-/g,'').slice(2)}-{form.end_date.replace(/-/g,'').slice(2)})
                      </p>
                    ) : (
                      <p className="text-xs font-mono text-foreground leading-relaxed">
                        {formatRankName(user?.rank, user?.full_name)} {form.duration_days} DAYS {form.status_category.toUpperCase()} ({form.start_date.replace(/-/g,'').slice(2)}-{form.end_date.replace(/-/g,'').slice(2)})
                      </p>
                    )}
                  </div>
                )}

                <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || saving}>
                  <Check className="h-4 w-4 mr-1" />{saving ? 'Submitting…' : 'Submit Update'}
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}