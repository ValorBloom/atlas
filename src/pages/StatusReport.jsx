import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { formatRankName } from '@/lib/constants';
import { Check, ArrowRight, Stethoscope, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StatusReport() {
  const { type } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const selfName = user?.full_name || '';
  const selfRank = user?.rank || '';

  const [data, setData] = useState({
    symptoms: '',
    details: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    // MA fields
    appointment_type: '',
    location: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    appointment_time: '',
  });

  const statusLabel = { RSO: 'Report Sick Outside', MA: 'Medical Appointment', RSI: 'Report Sick In' };
  const statusDesc = {
    RSO: 'Report your symptoms. Diagnosis will be updated after seeing the doctor.',
    MA: 'Log your upcoming medical appointment.',
    RSI: 'Report sick at the Medical Centre.',
  };

  // RSO/RSI: just symptoms + date. MA: appointment details.
  const STEPS = type === 'MA' ? ['Details', 'Confirm'] : ['Symptoms', 'Confirm'];
  const confirmStep = STEPS.length - 1;

  const canNext = () => {
    if (type === 'MA') {
      if (step === 0) return data.appointment_type && data.location && data.appointment_date && data.appointment_time;
    } else {
      if (step === 0) return !!(data.symptoms || data.details);
    }
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    const needsApproval = type === 'RSO';

    const reportData = {
      type,
      personnel_name: selfName,
      personnel_rank: selfRank,
      personnel_id: user?.id,
      status: needsApproval ? 'pending_approval' : 'active',
      unit: user?.unit,
      reported_by: user?.email,
      start_date: data.start_date,
    };

    if (type === 'MA') {
      reportData.details = [
        `APPOINTMENT TYPE: ${data.appointment_type}`,
        `LOCATION: ${data.location}`,
        `DATE: ${data.appointment_date.replace(/-/g, '').slice(2)}`,
        `TIME: ${data.appointment_time}H`,
      ].join('\n');
      reportData.start_date = data.appointment_date;
    } else {
      reportData.symptoms = data.symptoms;
      reportData.details = data.details;
      // diagnosis left blank — to be filled via Update Status after seeing doctor
    }

    await base44.entities.StatusReport.create(reportData);

    // Notify admin/instructors
    await base44.entities.Notification.create({
      title: `${type} Reported`,
      message: `${formatRankName(selfRank, selfName)} — ${type}${needsApproval ? ' (Pending Approval)' : ''}: ${data.symptoms || data.appointment_type || ''}`,
      type: needsApproval ? 'warning' : 'info',
      category: 'status',
      recipient_unit: user?.unit,
    });

    await base44.entities.AuditLog.create({
      action: `status_report_${type.toLowerCase()}`,
      category: 'status',
      details: `${type} for ${selfName}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setSaving(false);
    toast.success(needsApproval ? 'RSO submitted — pending approval' : `${type} reported`);
    navigate('/actions/status');
  };

  return (
    <div>
      <PageHeader title={statusLabel[type] || `Report ${type}`} backTo="/actions/status" />

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

      <div className="px-4 py-3 space-y-4">

        {/* Type info banner */}
        {step === 0 && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5">
            <Stethoscope className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{statusDesc[type]}</p>
          </div>
        )}

        {/* MA Step 0 */}
        {type === 'MA' && step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground uppercase tracking-wide">Appointment Type</Label>
              <Input
                placeholder="e.g. DENTAL, MEDICAL, SPECIALIST"
                value={data.appointment_type}
                onChange={(e) => setData({ ...data, appointment_type: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground uppercase tracking-wide">Location / Clinic</Label>
              <Input
                placeholder="e.g. ROYCE DENTAL CLINIC - YISHUN"
                value={data.location}
                onChange={(e) => setData({ ...data, location: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground uppercase tracking-wide">Date</Label>
                <Input type="date" value={data.appointment_date}
                  onChange={(e) => setData({ ...data, appointment_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground uppercase tracking-wide">Time (HHmm)</Label>
                <Input placeholder="1100" value={data.appointment_time} maxLength={4}
                  onChange={(e) => setData({ ...data, appointment_time: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* MA Confirm */}
        {type === 'MA' && step === confirmStep && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">MA Details</p>
              <div className="space-y-2">
                {[
                  ['Name', formatRankName(selfRank, selfName)],
                  ['Appt Type', data.appointment_type || '—'],
                  ['Location', data.location || '—'],
                  ['Date', data.appointment_date],
                  ['Time', `${data.appointment_time}H`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{k}</span>
                    <span className="text-xs font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* RSO / RSI Step 0 — Symptoms only */}
        {type !== 'MA' && step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground uppercase tracking-wide">Symptoms</Label>
              <Textarea
                placeholder={type === 'RSI' ? 'e.g. Fever, Headache, Bodyache' : 'e.g. Knee pain, Swollen ankle'}
                value={data.symptoms}
                onChange={(e) => setData({ ...data, symptoms: e.target.value })}
                className="min-h-[90px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground uppercase tracking-wide">Date</Label>
              <Input type="date" value={data.start_date}
                onChange={(e) => setData({ ...data, start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground uppercase tracking-wide">Additional Notes (optional)</Label>
              <Textarea
                placeholder="Any other relevant info..."
                value={data.details}
                onChange={(e) => setData({ ...data, details: e.target.value })}
                className="min-h-[60px]"
              />
            </div>
          </div>
        )}

        {/* RSO / RSI Confirm */}
        {type !== 'MA' && step === confirmStep && (
          <div className="space-y-3">
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{type} Report</p>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Name</span>
                  <span className="text-xs font-semibold text-foreground">{formatRankName(selfRank, selfName)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Symptoms</span>
                  <span className="text-xs text-foreground">{data.symptoms || '—'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">Date</span>
                  <span className="text-xs text-foreground">{data.start_date}</span>
                </div>
                {data.details && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Notes</span>
                    <span className="text-xs text-foreground">{data.details}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            {type === 'RSO' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <p className="text-xs text-amber-400 font-medium">⚠ Pending instructor approval</p>
                <p className="text-xs text-amber-400/70 mt-0.5">After seeing the doctor, use <strong>Update RSO</strong> to add your diagnosis and MC details.</p>
              </div>
            )}
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
              <Check className="h-4 w-4 mr-1" />{saving ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}