import React, { useState } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import StepIndicator from '@/components/movement/StepIndicator';
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

const STEPS = ['Person', 'Details', 'Dates', 'Confirm'];

export default function StatusReport() {
  const { type } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    personnel_id: '',
    personnel_name: '',
    personnel_rank: '',
    symptoms: '',
    diagnosis: '',
    details: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-unit', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const handleSelectPerson = (userId) => {
    const person = users.find(u => u.id === userId);
    if (person) {
      setData({ ...data, personnel_id: person.id, personnel_name: person.full_name, personnel_rank: person.rank || '' });
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return data.personnel_name;
      case 1: return data.symptoms || data.diagnosis || data.details;
      case 2: return data.start_date;
      default: return true;
    }
  };

  const statusLabel = { RSO: 'Report Sick Out', MA: 'Medical Appointment', RSI: 'Report Sick In' };

  const handleSubmit = async () => {
    setSaving(true);
    const needsApproval = type === 'RSO';
    await base44.entities.StatusReport.create({
      type,
      personnel_name: data.personnel_name,
      personnel_rank: data.personnel_rank,
      personnel_id: data.personnel_id,
      symptoms: data.symptoms,
      diagnosis: data.diagnosis,
      details: data.details,
      start_date: data.start_date,
      end_date: data.end_date,
      status: needsApproval ? 'pending_approval' : 'active',
      unit: user?.unit,
      reported_by: user?.email,
    });

    await base44.entities.Notification.create({
      title: `${type} Reported`,
      message: `${formatRankName(data.personnel_rank, data.personnel_name)} — ${type} ${needsApproval ? '(Pending Approval)' : 'recorded'}`,
      type: needsApproval ? 'warning' : 'info',
      category: 'status',
      recipient_unit: user?.unit,
    });

    await base44.entities.AuditLog.create({
      action: `status_report_${type.toLowerCase()}`,
      category: 'status',
      details: `${type} for ${data.personnel_name}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setSaving(false);
    toast.success(needsApproval ? 'RSO submitted for approval' : `${type} reported`);
    navigate('/actions/status');
  };

  return (
    <div>
      <PageHeader title={statusLabel[type] || `Report ${type}`} backTo="/actions/status" />
      <StepIndicator steps={STEPS} currentStep={step} />
      <div className="px-4 py-3 space-y-4">
        {step === 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Person</Label>
            <Select value={data.personnel_id} onValueChange={handleSelectPerson}>
              <SelectTrigger><SelectValue placeholder="Choose person" /></SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{formatRankName(u.rank, u.full_name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Symptoms</Label>
              <Textarea
                placeholder="Describe symptoms..."
                value={data.symptoms}
                onChange={(e) => setData({ ...data, symptoms: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Diagnosis (if known)</Label>
              <Input
                placeholder="e.g. Fever, Sprain"
                value={data.diagnosis}
                onChange={(e) => setData({ ...data, diagnosis: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Details</Label>
              <Textarea
                placeholder="Any other relevant information..."
                value={data.details}
                onChange={(e) => setData({ ...data, details: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <Input type="date" value={data.start_date} onChange={(e) => setData({ ...data, start_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date (optional)</Label>
              <Input type="date" value={data.end_date} onChange={(e) => setData({ ...data, end_date: e.target.value })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
{`🏥 ${type} REPORT
${formatRankName(data.personnel_rank, data.personnel_name)}
Symptoms: ${data.symptoms || '—'}
Diagnosis: ${data.diagnosis || '—'}
Details: ${data.details || '—'}
From: ${data.start_date}${data.end_date ? `\nTo: ${data.end_date}` : ''}
Status: ${type === 'RSO' ? 'Pending Approval' : 'Active'}`}
              </pre>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 mt-6">
          {step > 0 && <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 3 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next<ArrowRight className="h-4 w-4 ml-1" />
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