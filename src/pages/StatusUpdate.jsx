import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { formatRankName } from '@/lib/constants';
import { Check, Stethoscope, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import OutcomeRow from '@/components/status/OutcomeRow';

function fmtDate(d) {
  if (!d) return '';
  return d.replace(/-/g, '').slice(2);
}

const today = () => format(new Date(), 'yyyy-MM-dd');
const newOutcome = () => ({ category: '', custom_label: '', duration_days: '', start_date: today(), end_date: '' });

// Resolve the display label for an outcome category
function outcomeLabel(o) {
  if (o.category === 'Others') return (o.custom_label || 'OTHERS').toUpperCase();
  if (o.category === 'MC') return 'MC';
  return o.category.toUpperCase();
}

// Build the parade-state style text for a single outcome
function outcomeText(o) {
  const dur = o.duration_text || '';
  const dates = o.start_date && o.end_date ? ` (${fmtDate(o.start_date)}-${fmtDate(o.end_date)})` : '';
  return `${dur} ${outcomeLabel(o)}${dates}`.trim();
}

export default function StatusUpdate() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [outcomes, setOutcomes] = useState([newOutcome()]);

  const selfName = user?.display_name || user?.full_name || '';

  // Auto-select report if ?id= is in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedId = urlParams.get('id');

  // Load all my StatusReports (RLS ensures we only see our own or our unit's)
  const { data: myReports = [], isLoading } = useQuery({
    queryKey: ['my-medical-reports', user?.id],
    queryFn: async () => {
      const all = await base44.entities.StatusReport.filter({}, '-created_date', 50);
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

  // Recompute an outcome's end date from start + duration
  const updateOutcome = (index, next) => {
    const days = parseInt(next.duration_days) || 0;
    const endDate = days > 0 && next.start_date
      ? format(addDays(new Date(next.start_date), days - 1), 'yyyy-MM-dd')
      : '';
    setOutcomes(prev => prev.map((o, i) => (i === index ? { ...next, end_date: endDate } : o)));
  };

  const addOutcome = () => setOutcomes(prev => [...prev, newOutcome()]);
  const removeOutcome = (index) => setOutcomes(prev => prev.filter((_, i) => i !== index));

  const outcomeValid = (o) =>
    o.category &&
    (o.category !== 'Others' || (o.custom_label && o.custom_label.trim())) &&
    o.duration_days && parseInt(o.duration_days) > 0 &&
    o.start_date && o.end_date;

  const allOutcomesValid = outcomes.length > 0 && outcomes.every(outcomeValid);
  const canSubmit = selectedReport && diagnosis.trim() && allOutcomesValid;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    const rankName = formatRankName(user?.rank, selfName.toUpperCase());

    // Normalize outcomes with duration_text for storage + display
    const builtOutcomes = outcomes.map(o => {
      const days = parseInt(o.duration_days) || 1;
      const isMC = o.category === 'MC';
      return {
        category: o.category,
        custom_label: o.category === 'Others' ? (o.custom_label || '').toUpperCase() : '',
        duration_text: `${days} ${isMC ? 'DAY' : 'DAYS'}`,
        start_date: o.start_date,
        end_date: o.end_date,
      };
    });

    const outcomeLines = builtOutcomes.map(o => outcomeText(o)).join(' · ');
    const outcomeMsg = `${rankName} — ${selectedReport.type} — ${diagnosis.toUpperCase()} — ${outcomeLines}`;

    const primary = builtOutcomes[0];

    try {
      const res = await base44.functions.invoke('submitStatusUpdate', {
        reportId: selectedReport.id,
        diagnosis: diagnosis.toUpperCase(),
        outcomes: builtOutcomes,
        status_category: primary.category,
        start_date: primary.start_date,
        end_date: primary.end_date,
        duration_text: primary.duration_text,
        notes: notes || '',
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

  const allMyMedical = myReports.filter(r => r.type === 'RSO' || r.type === 'RSI');
  const pendingMedical = allMyMedical.filter(r => r.status === 'pending_approval');
  const rejectedMedical = allMyMedical.filter(r => r.status === 'rejected');

  // Build a preview using the normalized outcomes
  const previewOutcomes = outcomes
    .filter(outcomeValid)
    .map(o => {
      const days = parseInt(o.duration_days) || 1;
      const isMC = o.category === 'MC';
      return outcomeText({ ...o, duration_text: `${days} ${isMC ? 'DAY' : 'DAYS'}` });
    });

  return (
    <div>
      <PageHeader title="Update RSO / RSI" backTo="/actions/status" subtitle="Post-consultation update" />
      <div className="px-4 py-4 space-y-4 pb-24">

        <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5">
          <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select your approved RSO or RSI, then add one or more outcomes — each can have its own dates (e.g. Light Duty 7 days, Excused RMJ 3 days).
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
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value.toUpperCase())}
                    className="min-h-[70px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Outcomes *</Label>
                  {outcomes.map((o, i) => (
                    <OutcomeRow
                      key={i}
                      outcome={o}
                      index={i}
                      canRemove={outcomes.length > 1}
                      onChange={updateOutcome}
                      onRemove={removeOutcome}
                    />
                  ))}
                  <Button variant="outline" className="w-full h-9 text-xs gap-1.5" onClick={addOutcome}>
                    <Plus className="h-3.5 w-3.5" /> Add Another Outcome
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes (optional)</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>

                {/* Preview */}
                {diagnosis && previewOutcomes.length > 0 && (
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Preview</p>
                    <p className="text-xs font-mono text-foreground leading-relaxed">
                      {formatRankName(user?.rank, selfName.toUpperCase())} {selectedReport.type} — DIAGNOSIS: {diagnosis}
                      {previewOutcomes.map((line, i) => (
                        <span key={i} className="block mt-0.5">{line}</span>
                      ))}
                    </p>
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