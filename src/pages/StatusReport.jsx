import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { formatRankName } from '@/lib/constants';
import { Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// RSO: self-only, symptoms + diagnosis + dates
// MA: appointment format
// RSI: self-only, details + dates

export default function StatusReport() {
  const { type } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const selfName = user?.full_name || '';
  const selfRank = user?.rank || '';

  const [data, setData] = useState({
    // RSO / RSI
    symptoms: '',
    diagnosis: '',
    details: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    // MA
    appointment_type: '',
    location: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    appointment_time: '',
    endorsed_by: '',
  });

  // Fetch instructors for MA endorsed_by
  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors-unit', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit, role: 'instructor' }),
    enabled: !!user?.unit && type === 'MA',
  });

  const statusLabel = { RSO: 'Report Sick Out', MA: 'Medical Appointment', RSI: 'Report Sick In' };

  // Steps per type
  const STEPS = type === 'MA'
    ? ['Appointment', 'Confirm']
    : ['Details', 'Dates', 'Confirm'];

  const totalSteps = STEPS.length;
  const confirmStep = totalSteps - 1;

  const canNext = () => {
    if (type === 'MA') {
      if (step === 0) return data.appointment_type && data.location && data.appointment_date && data.appointment_time;
    } else {
      if (step === 0) return data.symptoms || data.diagnosis || data.details;
      if (step === 1) return data.start_date;
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
    };

    if (type === 'MA') {
      reportData.details = [
        `${formatRankName(selfRank, selfName)}`,
        `APPOINTMENT TYPE: ${data.appointment_type}`,
        `LOCATION: ${data.location}`,
        `DATE: ${data.appointment_date.replace(/-/g, '').slice(2)}`,
        `TIME: ${data.appointment_time}H`,
        data.endorsed_by ? `ENDORSED BY: ${data.endorsed_by}` : '',
      ].filter(Boolean).join('\n');
      reportData.start_date = data.appointment_date;
    } else {
      reportData.symptoms = data.symptoms;
      reportData.diagnosis = data.diagnosis;
      reportData.details = data.details;
      reportData.start_date = data.start_date;
      reportData.end_date = data.end_date;
    }

    await base44.entities.StatusReport.create(reportData);

    await base44.entities.Notification.create({
      title: `${type} Reported`,
      message: `${formatRankName(selfRank, selfName)} — ${type} ${needsApproval ? '(Pending Approval)' : 'recorded'}`,
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
    toast.success(needsApproval ? 'RSO submitted for approval' : `${type} reported`);
    navigate('/actions/status');
  };

  const formatMADate = (d) => {
    if (!d) return '—';
    return d.replace(/-/g, '').slice(2); // DDMMYY
  };

  return (
    <div>
      <PageHeader title={statusLabel[type] || `Report ${type}`} backTo="/actions/status" />

      {/* Step Dots */}
      <div className="flex items-center justify-center gap-2 py-4">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 ${i === step ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-2 h-2 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted-foreground'}`} />
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 space-y-4">

        {/* MA Flow */}
        {type === 'MA' && step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Appointment Type</Label>
              <Input
                placeholder="e.g. DENTAL, MEDICAL, SPECIALIST"
                value={data.appointment_type}
                onChange={(e) => setData({ ...data, appointment_type: e.target.value.toUpperCase() })}
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location / Clinic</Label>
              <Input
                placeholder="e.g. ROYCE DENTAL CLINIC - YISHUN"
                value={data.location}
                onChange={(e) => setData({ ...data, location: e.target.value.toUpperCase() })}
                className="bg-card border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date</Label>
                <Input
                  type="date"
                  value={data.appointment_date}
                  onChange={(e) => setData({ ...data, appointment_date: e.target.value })}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Time (e.g. 1100)</Label>
                <Input
                  placeholder="1100"
                  value={data.appointment_time}
                  onChange={(e) => setData({ ...data, appointment_time: e.target.value })}
                  className="bg-card border-border"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Endorsed By (optional)</Label>
              {instructors.length > 0 ? (
                <Select value={data.endorsed_by} onValueChange={(v) => setData({ ...data, endorsed_by: v })}>
                  <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Select instructor" /></SelectTrigger>
                  <SelectContent>
                    {instructors.map(u => (
                      <SelectItem key={u.id} value={formatRankName(u.rank, u.full_name)}>
                        {formatRankName(u.rank, u.full_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Instructor name"
                  value={data.endorsed_by}
                  onChange={(e) => setData({ ...data, endorsed_by: e.target.value.toUpperCase() })}
                  className="bg-card border-border"
                />
              )}
            </div>
          </div>
        )}

        {/* MA Confirm */}
        {type === 'MA' && step === confirmStep && (
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
{`${formatRankName(selfRank, selfName)}
NAME: ${data.appointment_type || '—'}
LOCATION: ${data.location || '—'}
DATE: ${formatMADate(data.appointment_date)}
TIME OF APPOINTMENT: ${data.appointment_time || '—'}H${data.endorsed_by ? `\nENDORSED BY: ${data.endorsed_by}` : ''}`}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* RSO / RSI Step 0 — Details */}
        {type !== 'MA' && step === 0 && (
          <div className="space-y-4">
            {type === 'RSO' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Symptoms</Label>
                  <Textarea
                    placeholder="e.g. Fever, Cough, Sore Throat"
                    value={data.symptoms}
                    onChange={(e) => setData({ ...data, symptoms: e.target.value })}
                    className="min-h-[80px] bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Diagnosis</Label>
                  <Input
                    placeholder="e.g. Influenza, Sprained Ankle"
                    value={data.diagnosis}
                    onChange={(e) => setData({ ...data, diagnosis: e.target.value })}
                    className="bg-card border-border"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                {type === 'RSI' ? 'Details / Notes' : 'Additional Details'}
              </Label>
              <Textarea
                placeholder="Any other relevant information..."
                value={data.details}
                onChange={(e) => setData({ ...data, details: e.target.value })}
                className="min-h-[80px] bg-card border-border"
              />
            </div>
          </div>
        )}

        {/* RSO / RSI Step 1 — Dates */}
        {type !== 'MA' && step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start Date</Label>
              <Input
                type="date"
                value={data.start_date}
                onChange={(e) => setData({ ...data, start_date: e.target.value })}
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Date (optional)</Label>
              <Input
                type="date"
                value={data.end_date}
                onChange={(e) => setData({ ...data, end_date: e.target.value })}
                className="bg-card border-border"
              />
            </div>
          </div>
        )}

        {/* RSO / RSI Confirm */}
        {type !== 'MA' && step === confirmStep && (
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{type} Report</p>
                <p className="text-sm font-semibold text-foreground">{formatRankName(selfRank, selfName)}</p>
                {data.symptoms && (
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Symptoms</span>
                    <span className="text-xs text-foreground">{data.symptoms}</span>
                  </div>
                )}
                {data.diagnosis && (
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Diagnosis</span>
                    <span className="text-xs text-foreground">{data.diagnosis}</span>
                  </div>
                )}
                {data.details && (
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Details</span>
                    <span className="text-xs text-foreground">{data.details}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">From</span>
                  <span className="text-xs text-foreground">{data.start_date}</span>
                </div>
                {data.end_date && (
                  <div className="flex gap-2">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">To</span>
                    <span className="text-xs text-foreground">{data.end_date}</span>
                  </div>
                )}
                {type === 'RSO' && (
                  <p className="text-xs text-amber-400 mt-2">⚠ Pending instructor approval</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 mt-6">
          {step > 0 && (
            <Button variant="outline" className="flex-1 border-border" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < confirmStep ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
              <Check className="h-4 w-4" />{saving ? 'Submitting...' : 'Submit'}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}