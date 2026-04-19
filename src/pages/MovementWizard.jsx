import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import StepIndicator from '@/components/movement/StepIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LOCATIONS, PURPOSES, TIME_REGEX, formatTime, formatRankName, getCurrentTimeSG } from '@/lib/constants';
import { MapPin, ArrowRight, Clock, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STEPS = ['Personnel', 'From', 'To', 'Purpose', 'Time', 'Confirm'];

export default function MovementWizard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    personnel_name: '',
    personnel_rank: '',
    personnel_id: '',
    from_location: '',
    to_location: '',
    purpose: '',
    leave_time: '',
    custom_from: '',
    custom_to: '',
    custom_purpose: '',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-unit', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  // Auto-fill self
  useEffect(() => {
    if (user) {
      setData(d => ({
        ...d,
        personnel_name: user.full_name || '',
        personnel_rank: user.rank || '',
        personnel_id: user.id || '',
      }));
    }
  }, [user]);

  const fromLoc = data.from_location === 'Other' ? data.custom_from : data.from_location;
  const toLoc = data.to_location === 'Other' ? data.custom_to : data.to_location;
  const purpose = data.purpose === 'Other' ? data.custom_purpose : data.purpose;

  const canNext = () => {
    switch (step) {
      case 0: return data.personnel_name;
      case 1: return fromLoc;
      case 2: return toLoc && fromLoc !== toLoc;
      case 3: return purpose;
      case 4: return TIME_REGEX.test(data.leave_time);
      default: return true;
    }
  };

  const handleSelectPerson = (userId) => {
    const person = users.find(u => u.id === userId);
    if (person) {
      setData({
        ...data,
        personnel_name: person.full_name,
        personnel_rank: person.rank || '',
        personnel_id: person.id,
      });
    }
  };

  const reportMessage = () => {
    const name = formatRankName(data.personnel_rank, data.personnel_name);
    const date = format(new Date(), 'ddMMMMyyyy').toUpperCase();
    return `📍 MOVEMENT REPORT\n${name}\nFrom: ${fromLoc}\nTo: ${toLoc}\nPurpose: ${purpose}\nLeave Time: ${formatTime(data.leave_time)}\nDate: ${date}`;
  };

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.MovementLog.create({
      personnel_name: data.personnel_name,
      personnel_rank: data.personnel_rank,
      personnel_id: data.personnel_id,
      from_location: fromLoc,
      to_location: toLoc,
      purpose: purpose,
      leave_time: data.leave_time,
      status: 'departed',
      unit: user?.unit,
      reported_by: user?.email,
      movement_date: format(new Date(), 'yyyy-MM-dd'),
    });

    await base44.entities.Notification.create({
      title: 'Movement Reported',
      message: `${formatRankName(data.personnel_rank, data.personnel_name)} departed from ${fromLoc} to ${toLoc}`,
      type: 'info',
      category: 'movement',
      recipient_unit: user?.unit,
    });

    await base44.entities.AuditLog.create({
      action: 'movement_report',
      category: 'movement',
      details: reportMessage(),
      performed_by: user?.email,
      unit: user?.unit,
    });

    setSaving(false);
    toast.success('Movement reported');
    navigate('/actions/movement/reached');
  };

  const locOptions = [...LOCATIONS, 'Other'];
  const purposeOptions = [...PURPOSES, 'Other'];

  return (
    <div>
      <PageHeader title="Movement Report" backTo="/" />
      <StepIndicator steps={STEPS} currentStep={step} />

      <div className="px-4 py-3">
        {/* Step 0: Personnel */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Personnel</Label>
              <Select 
                value={data.personnel_id} 
                onValueChange={handleSelectPerson}
              >
                <SelectTrigger><SelectValue placeholder="Choose person" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {formatRankName(u.rank, u.full_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data.personnel_name && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">
                    {formatRankName(data.personnel_rank, data.personnel_name)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 1: From Location */}
        {step === 1 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">From Location</Label>
            <div className="space-y-1.5">
              {locOptions.map(loc => (
                <button
                  key={loc}
                  onClick={() => setData({ ...data, from_location: loc })}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    data.from_location === loc 
                      ? 'border-primary bg-primary/5 font-medium' 
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            {data.from_location === 'Other' && (
              <Input
                placeholder="Enter location"
                value={data.custom_from}
                onChange={(e) => setData({ ...data, custom_from: e.target.value })}
              />
            )}
          </div>
        )}

        {/* Step 2: To Location */}
        {step === 2 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">To Location</Label>
            {fromLoc === toLoc && toLoc && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">From and To cannot be the same.</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              {locOptions.filter(l => {
                const from = data.from_location === 'Other' ? data.custom_from : data.from_location;
                return l !== from || l === 'Other';
              }).map(loc => (
                <button
                  key={loc}
                  onClick={() => setData({ ...data, to_location: loc })}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    data.to_location === loc 
                      ? 'border-primary bg-primary/5 font-medium' 
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            {data.to_location === 'Other' && (
              <Input
                placeholder="Enter location"
                value={data.custom_to}
                onChange={(e) => setData({ ...data, custom_to: e.target.value })}
              />
            )}
          </div>
        )}

        {/* Step 3: Purpose */}
        {step === 3 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Purpose</Label>
            <div className="space-y-1.5">
              {purposeOptions.map(p => (
                <button
                  key={p}
                  onClick={() => setData({ ...data, purpose: p })}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    data.purpose === p 
                      ? 'border-primary bg-primary/5 font-medium' 
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {data.purpose === 'Other' && (
              <Input
                placeholder="Enter purpose"
                value={data.custom_purpose}
                onChange={(e) => setData({ ...data, custom_purpose: e.target.value })}
              />
            )}
          </div>
        )}

        {/* Step 4: Time */}
        {step === 4 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Leave Time (24hr format)</Label>
            <div className="flex items-center gap-3">
              <Input
                placeholder="e.g. 0830"
                maxLength={4}
                value={data.leave_time}
                onChange={(e) => setData({ ...data, leave_time: e.target.value.replace(/\D/g, '') })}
                className="text-center text-lg font-mono tracking-wider"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setData({ ...data, leave_time: getCurrentTimeSG() })}
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                Now
              </Button>
            </div>
            {data.leave_time && !TIME_REGEX.test(data.leave_time) && (
              <p className="text-xs text-destructive">Enter a valid time in HHmm format (e.g. 0830)</p>
            )}
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            <Label className="text-sm font-medium">Preview</Label>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
                  {reportMessage()}
                </pre>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-center">
              Please verify all details before submitting.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-6">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 5 ? (
            <Button 
              className="flex-1" 
              onClick={() => setStep(step + 1)} 
              disabled={!canNext()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button 
              className="flex-1" 
              onClick={handleSubmit} 
              disabled={saving}
            >
              <Check className="h-4 w-4 mr-1" />
              {saving ? 'Submitting...' : 'Submit Report'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}