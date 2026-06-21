import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
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

function fmtDate(d) {
  if (!d) return '';
  return d.replace(/-/g, '').slice(2);
}

export default function StatusUpdate() {
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

  const selfName = user?.display_name || user?.full_name || '';

  // Auto-select report if ?id= is in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedId = urlParams.get('id');

  // Load all my StatusReports (RLS ensures we only see our own or our unit's)
  const { data: myReports = [], isLoading } = useQuery({
    queryKey: ['my-medical-reports', user?.id],
    queryFn: async () => {
      const all = await base44.entities.StatusReport.filter(
        {},
        '-created_date',
        50
      );
      // Client-side filter to our own reports
      return all.filter(r => r.personnel_id === user?.id);
    },
    enabled: !!user?.id,
  });

  // Show RSO/RSI that are approved (by instructor) and not yet diagnosed
  const updatable = myReports.filter(r =>
    (r.type === 'RSO' || r.type === 'RSI') &&
    r.status === 'approved' &&
    !r.diagnosis
  );

  // Auto-select if navigated from a notification link with ?id=
  useEffect(() => {
    if (preselectedId && updatable.length > 0 && !selectedReport) {
      const match = updatable.find(r => r.id === preselectedId);
      if (match) setSelectedReport(match);
    }
  }, [preselectedId, updatable.length]);

  const handleCategoryChange = (cat) => {
    const start = form.start_date || format(new Date(), 'yyyy-MM-dd');
    const days = parseInt(form.duration_days) || 1;
    let endDate = days > 0 && start
      ? format(addDays(new Date(start), days - 1), 'yyyy-MM-dd')
      : '';
    setForm({ ...form, status_category: cat, end_date: endDate });
  };

  const handleDaysChange = (val) => {
    const days = parseInt(val) || 0;
    let endDate = days > 0 && form.start_date
      ? format(addDays(new Date(form.start_date), days - 1), 'yyyy-MM-dd')
      : '';
    setForm({ ...form, duration_days: val, end_date: endDate });
  };

  const handleStartChange = (val) => {
    const days = parseInt(form.duration_days) || 0;
    let endDate = days > 0 && val
      ? format(addDays(new Date(val), days - 1), 'yyyy-MM-dd')
      : '';
    setForm({ ...form, start_date: val, end_date: endDate });
  };

  const canSubmit = selectedReport && form.diagnosis && form.status_category && form.start_date && form.end_date;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    const days = parseInt(form.duration_days) || 1;
    const startFmt = fmtDate(form.start_date);
    const endFmt = fmtDate(form.end_date);
    const durationText = `${days} ${form.status_category === 'MC' ? 'DAY' : 'DAYS'}`;
    const rankName = formatRankName(user?.rank, selfName.toUpperCase());

    const outcomeMsg = form.status_category === 'MC'
      ? `${rankName} — ${selectedReport.type} — ${form.diagnosis.toUpperCase()} — ${durationText} MC (${startFmt}-${endFmt})`
      : `${rankName} — ${selectedReport.type} — ${form.diagnosis.toUpperCase()} — ${durationText} ${form.status_category.toUpperCase()} (${startFmt}-${endFmt})`;

    try {
      const res = await base44.functions.invoke('submitStatusUpdate', {
        reportId: selectedReport.id,
        diagnosis: form.diagnosis,
        status_category: form.status_category,
        start_date: form.start_date,
        end_date: form.end_date,
        duration_text: durationText,
        notes: form.notes || '',
        outcomeMsg,
      });

      if (res.data?.error) throw new Error(res.data.error);

      toast.success('Status updated successfully');
      navigate('/');
    } catch (err) {
      toast.error('Failed to update. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!user || isLoading) {
    return (
      <div>
        <PageHeader title="Update RSO / RSI" backTo="/actions/status" />
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // All my RSO/RSI reports (any status) for context
  const allMyMedical = myReports.filter(r => r.type === 'RSO' || r.type === 'RSI');
  const pendingMedical = allMyMedical.filter(r => r.status === 'pending_approval');
  const rejectedMedical = allMyMedical.filter(r => r.status === 'rejected');

  return (
    <div>
      <PageHeader title="Update RSO / RSI" backTo="/actions/status" subtitle="Post-consultation update" />
      <div className="px-4 py-4 space-y-4 pb-24">

        <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5">
          <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select your approved RSO or RSI, then fill in your diagnosis and outcome.
          </p>
        </div>

        {updatable.length === 0 ? (
          <div className="space-y-3">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No approved reports to update</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your RSO or RSI must be approved by an instructor before you can add a diagnosis.
                </p>
              </CardContent>
            </Card>
            {pendingMedical.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/10 space-y-1">
                <p className="text-xs font-semibold text-amber-400">Awaiting instructor approval</p>
                {pendingMedical.map(r => (
                  <p key={r.id} className="text-xs text-muted-foreground">{r.type} — {r.start_date} — {r.symptoms || 'No symptoms recorded'}</p>
                ))}
              </div>
            )}
            {rejectedMedical.length > 0 && (
              <div className="p-3 rounded-xl border border-destructive/25 bg-destructive/5 space-y-2">
                <p className="text-xs font-semibold text-destructive">Denied requests</p>
                {rejectedMedical.map(r => (
                  <div key={r.id} className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">{r.type} — {r.start_date} — {r.symptoms || 'No symptoms'}</p>
                    {r.instructor_notes ? (
                      <p className="text-xs text-destructive/80 italic">Reason: {r.instructor_notes}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No reason provided.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Select report */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Select Report</Label>
              <div className="space-y-2">
                {updatable.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedReport?.id === r.id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{r.type} — {r.start_date}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.symptoms || 'No symptoms recorded'}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block font-semibold bg-green-500/15 text-green-400">
                      Approved — ready to update
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedReport && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Diagnosis *</Label>
                  <Textarea
                    placeholder="e.g. VIRAL INFECTION, SPRAINED ANKLE"
                    value={form.diagnosis}
                    onChange={e => setForm({ ...form, diagnosis: e.target.value.toUpperCase() })}
                    className="min-h-[70px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Outcome *</Label>
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

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Duration (days) *</Label>
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
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start Date *</Label>
                    <Input type="date" value={form.start_date} onChange={e => handleStartChange(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Date *</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>

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
                        {formatRankName(user?.rank, selfName.toUpperCase())} SYMPTOMS: {selectedReport.symptoms?.toUpperCase() || '—'} DIAGNOSIS: {form.diagnosis} STATUS: {form.duration_days} DAY MC ({fmtDate(form.start_date)}-{fmtDate(form.end_date)})
                      </p>
                    ) : (
                      <p className="text-xs font-mono text-foreground leading-relaxed">
                        {formatRankName(user?.rank, selfName.toUpperCase())} {form.duration_days} DAYS {form.status_category.toUpperCase()} ({fmtDate(form.start_date)}-{fmtDate(form.end_date)})
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