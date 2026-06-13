import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { formatRankName } from '@/lib/constants';
import { Check, ArrowRight, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Format yyyy-MM-dd → DDMMYY
function fmtDate(d) {
  if (!d) return '';
  return d.replace(/-/g, '').slice(2);
}

const TYPE_LABELS = {
  RSO: 'Report Sick Outside',
  RSI: 'Report Sick Inside',
  MA: 'Medical Appointment',
  OTHERS: 'Others',
};

const TYPE_DESC = {
  RSO: 'Report your symptoms. After seeing the doctor, use Update RSO/RSI to add your diagnosis and outcome.',
  RSI: 'Report sick at the Medical Centre. After seeing the MO, use Update RSO/RSI to add your diagnosis and outcome.',
  MA: 'Log your upcoming medical appointment. Instructor must approve before it appears on parade state.',
  OTHERS: 'Report another event or status. Instructor must approve before it appears on parade state.',
};

export default function StatusReport() {
  const { type } = useParams();
  const upperType = (type || '').toUpperCase();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const selfName = user?.display_name || user?.full_name || '';
  const selfRank = user?.rank || '';

  const [data, setData] = useState({
    // RSO / RSI
    symptoms: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    // MA
    appointment_name: '',
    location: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    appointment_time: '',
    ma_notes: '',
    // OTHERS
    event_name: '',
    others_date: format(new Date(), 'yyyy-MM-dd'),
    others_time: '',
    others_location: '',
    others_notes: '',
  });

  const isMedical = upperType === 'RSO' || upperType === 'RSI';
  const isMA = upperType === 'MA';
  const isOthers = upperType === 'OTHERS';

  // All types: Details → Confirm (2 steps)
  const STEPS = ['Details', 'Confirm'];
  const confirmStep = 1;

  const canNext = () => {
    if (step === 0) {
      if (isMedical) return !!(data.symptoms.trim()) && !!(data.date);
      if (isMA) return !!(data.appointment_name.trim()) && !!(data.location.trim()) && !!(data.appointment_date) && !!(data.appointment_time.trim());
      if (isOthers) return !!(data.event_name.trim()) && !!(data.others_date) && !!(data.others_time.trim());
    }
    return true;
  };

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);

    const displayName = selfName.toUpperCase();
    const rankName = formatRankName(selfRank, displayName);

    let reportData = {
      type: upperType,
      personnel_name: displayName,
      personnel_rank: selfRank,
      personnel_id: user?.id,
      status: 'pending_approval',
      unit: user?.unit,
      reported_by: user?.email,
    };

    let notifMessage = '';

    if (isMedical) {
      reportData.symptoms = data.symptoms.toUpperCase();
      reportData.details = data.notes || '';
      reportData.start_date = data.date;
      notifMessage = `${rankName} — ${upperType} — SYMPTOMS: ${data.symptoms.toUpperCase()}${data.notes ? ` — NOTES: ${data.notes}` : ''}`;
    } else if (isMA) {
      const dateFmt = fmtDate(data.appointment_date);
      reportData.start_date = data.appointment_date;
      reportData.details = [
        `NAME: ${data.appointment_name.toUpperCase()}`,
        `LOCATION: ${data.location.toUpperCase()}`,
        `DATE: ${dateFmt}`,
        `TIME OF APPOINTMENT: ${data.appointment_time}H`,
        data.ma_notes ? `NOTES: ${data.ma_notes.toUpperCase()}` : '',
      ].filter(Boolean).join('\n');
      notifMessage = `${rankName} — MA — ${data.appointment_name.toUpperCase()} @ ${data.location.toUpperCase()} on ${dateFmt} at ${data.appointment_time}H`;
    } else if (isOthers) {
      const dateFmt = fmtDate(data.others_date);
      reportData.start_date = data.others_date;
      reportData.details = [
        `NAME: ${data.event_name.toUpperCase()}`,
        data.others_location ? `LOCATION: ${data.others_location.toUpperCase()}` : '',
        `DATE: ${dateFmt}`,
        `TIME OF APPOINTMENT: ${data.others_time}H`,
        data.others_notes ? `NOTES: ${data.others_notes.toUpperCase()}` : '',
      ].filter(Boolean).join('\n');
      notifMessage = `${rankName} — OTHERS — ${data.event_name.toUpperCase()} on ${dateFmt} at ${data.others_time}H`;
    }

    try {
      await base44.entities.StatusReport.create(reportData);

      // Audit log (cadets can always create these)
      try {
        await base44.entities.AuditLog.create({
          action: `status_report_${upperType.toLowerCase()}`,
          category: 'status',
          details: notifMessage,
          performed_by: user?.email,
          unit: user?.unit,
        });
      } catch (_) { /* non-critical */ }

      toast.success(`${upperType} submitted — pending instructor approval`);
      navigate('/actions/status');
    } catch (err) {
      toast.error('Failed to submit. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Confirm cards ──────────────────────────────────────────────
  const rankName = formatRankName(selfRank, selfName.toUpperCase());

  const MedicalConfirm = () => (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{upperType} Report</p>
        {[
          ['Name', rankName],
          ['Symptoms', data.symptoms || '—'],
          ['Date', data.date],
          data.notes ? ['Notes', data.notes] : null,
        ].filter(Boolean).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{k}</span>
            <span className="text-xs font-medium text-foreground">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const MAConfirm = () => (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">MA Details</p>
        {[
          ['Name', rankName],
          ['Appointment', data.appointment_name.toUpperCase() || '—'],
          ['Location', data.location.toUpperCase() || '—'],
          ['Date', fmtDate(data.appointment_date)],
          ['Time', `${data.appointment_time}H`],
          data.ma_notes ? ['Notes', data.ma_notes] : null,
        ].filter(Boolean).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-24 shrink-0">{k}</span>
            <span className="text-xs font-medium text-foreground">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const OthersConfirm = () => (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Others Details</p>
        {[
          ['Name', rankName],
          ['Event', data.event_name.toUpperCase() || '—'],
          data.others_location ? ['Location', data.others_location.toUpperCase()] : null,
          ['Date', fmtDate(data.others_date)],
          ['Time', `${data.others_time}H`],
          data.others_notes ? ['Notes', data.others_notes] : null,
        ].filter(Boolean).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2">
            <span className="text-xs text-muted-foreground w-24 shrink-0">{k}</span>
            <span className="text-xs font-medium text-foreground">{v}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div>
      <PageHeader title={TYPE_LABELS[upperType] || `Report ${upperType}`} backTo="/actions/status" />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 py-4 px-4">
        {STEPS.map((label, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-1.5 transition-all ${i === step ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                i < step ? 'bg-primary text-white' :
                i === step ? 'bg-primary text-white' :
                'bg-muted text-muted-foreground'
              }`}>{i < step ? '✓' : i + 1}</div>
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border max-w-[40px]" />}
          </React.Fragment>
        ))}
      </div>

      <div className="px-4 py-3 space-y-4 pb-24">

        {/* Info banner */}
        {step === 0 && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5">
            <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{TYPE_DESC[upperType]}</p>
          </div>
        )}

        {/* ── RSO / RSI Form ── */}
        {isMedical && step === 0 && (
          <div className="space-y-3">
            <Textarea
              placeholder={upperType === 'RSI' ? 'Symptoms — e.g. Fever, Headache, Bodyache *' : 'Symptoms — e.g. Knee pain, Swollen ankle *'}
              value={data.symptoms}
              onChange={(e) => setData({ ...data, symptoms: e.target.value })}
              className="min-h-[90px]"
            />
            <Input type="date" value={data.date}
              onChange={(e) => setData({ ...data, date: e.target.value })} />
            <Textarea
              placeholder="Additional notes (optional)"
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
              className="min-h-[60px]"
            />
          </div>
        )}
        {isMedical && step === confirmStep && (
          <div className="space-y-3">
            <MedicalConfirm />
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <p className="text-xs text-amber-400 font-medium">⚠ Pending instructor approval</p>
              <p className="text-xs text-amber-400/70 mt-0.5">After seeing the {upperType === 'RSI' ? 'MO' : 'doctor'}, use <strong>Update RSO / RSI</strong> to add your diagnosis and outcome.</p>
            </div>
          </div>
        )}

        {/* ── MA Form ── */}
        {isMA && step === 0 && (
          <div className="space-y-3">
            <Input
              placeholder="Appointment name — e.g. DENTAL APPOINTMENT *"
              value={data.appointment_name}
              onChange={(e) => setData({ ...data, appointment_name: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder="Location *"
              value={data.location}
              onChange={(e) => setData({ ...data, location: e.target.value.toUpperCase() })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={data.appointment_date}
                onChange={(e) => setData({ ...data, appointment_date: e.target.value })} />
              <Input placeholder="Time HHmm *" value={data.appointment_time} maxLength={4}
                onChange={(e) => setData({ ...data, appointment_time: e.target.value.replace(/\D/g, '') })} />
            </div>
            <Textarea
              placeholder="Additional notes (optional)"
              value={data.ma_notes}
              onChange={(e) => setData({ ...data, ma_notes: e.target.value })}
              className="min-h-[60px]"
            />
          </div>
        )}
        {isMA && step === confirmStep && (
          <div className="space-y-3">
            <MAConfirm />
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <p className="text-xs text-amber-400 font-medium">⚠ Pending instructor approval</p>
              <p className="text-xs text-amber-400/70 mt-0.5">The endorsing instructor will be shown on the parade state once approved.</p>
            </div>
          </div>
        )}

        {/* ── OTHERS Form ── */}
        {isOthers && step === 0 && (
          <div className="space-y-3">
            <Input
              placeholder="Event / status name — e.g. AWARD CEREMONY *"
              value={data.event_name}
              onChange={(e) => setData({ ...data, event_name: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder="Location (optional)"
              value={data.others_location}
              onChange={(e) => setData({ ...data, others_location: e.target.value.toUpperCase() })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={data.others_date}
                onChange={(e) => setData({ ...data, others_date: e.target.value })} />
              <Input placeholder="Time HHmm *" value={data.others_time} maxLength={4}
                onChange={(e) => setData({ ...data, others_time: e.target.value.replace(/\D/g, '') })} />
            </div>
            <Textarea
              placeholder="Additional notes (optional)"
              value={data.others_notes}
              onChange={(e) => setData({ ...data, others_notes: e.target.value })}
              className="min-h-[60px]"
            />
          </div>
        )}
        {isOthers && step === confirmStep && (
          <div className="space-y-3">
            <OthersConfirm />
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <p className="text-xs text-amber-400 font-medium">⚠ Pending instructor approval</p>
              <p className="text-xs text-amber-400/70 mt-0.5">The endorsing instructor will be shown on the parade state once approved.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Back</Button>
          )}
          {step < confirmStep ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
              <Check className="h-4 w-4 mr-1" />{saving ? 'Submitting…' : 'Submit'}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}