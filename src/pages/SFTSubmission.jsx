import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import StepIndicator from '@/components/movement/StepIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SFT_ACTIVITIES, SFT_LOCATIONS, TIME_REGEX, formatTime } from '@/lib/constants';
import { Activity, Check, ArrowRight, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['Activity', 'Location', 'Time', 'Confirm'];

export default function SFTSubmission() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    activities: [],
    location: '',
    start_time: '',
    end_time: '',
  });

  const { data: activeWindows = [] } = useQuery({
    queryKey: ['sft-windows-active', user?.unit],
    queryFn: () => base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: mySubmissions = [] } = useQuery({
    queryKey: ['sft-my', user?.email, user?.unit],
    queryFn: async () => {
      const windows = await base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit });
      if (windows.length === 0) return [];
      return base44.entities.SFTSubmission.filter({
        cadet_id: user?.id, window_id: windows[0].id, status: 'active'
      });
    },
    enabled: !!user?.email,
  });

  const activeWindow = activeWindows[0];
  const hasSubmission = mySubmissions.length > 0;

  const toggleActivity = (a) => {
    setData(prev => ({
      ...prev,
      activities: prev.activities.includes(a)
        ? prev.activities.filter(x => x !== a)
        : [...prev.activities, a]
    }));
  };

  const canNext = () => {
    switch (step) {
      case 0: return data.activities.length > 0;
      case 1: return data.location;
      case 2: return TIME_REGEX.test(data.start_time) && TIME_REGEX.test(data.end_time);
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.SFTSubmission.create({
      cadet_name: user?.full_name,
      cadet_rank: user?.rank,
      cadet_id: user?.id,
      activity: data.activities.join(', '),
      location: data.location,
      time_range: `${data.start_time}-${data.end_time}`,
      window_id: activeWindow.id,
      unit: user?.unit,
      status: 'active',
    });
    setSaving(false);
    toast.success('SFT submitted');
    queryClient.invalidateQueries({ queryKey: ['sft-my'] });
    navigate('/');
  };

  const handleQuit = async () => {
    if (!mySubmissions[0]) return;
    await base44.entities.SFTSubmission.update(mySubmissions[0].id, { status: 'withdrawn' });
    toast.success('SFT submission withdrawn');
    queryClient.invalidateQueries({ queryKey: ['sft-my'] });
  };

  if (!activeWindow) {
    return (
      <div>
        <PageHeader title="SFT Submission" backTo="/" />
        <div className="px-4 py-16 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No active SFT window.</p>
          <p className="text-xs text-muted-foreground mt-1">An instructor must open an SFT window first.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="SFT Submission" backTo="/" subtitle={`Window: ${activeWindow.start_time}h – ${activeWindow.end_time}h`} />

      {hasSubmission ? (
        <div className="px-4 py-5 space-y-4">
          <Alert className="bg-primary/5 border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              Active submission: <strong>{mySubmissions[0].activity}</strong> at {mySubmissions[0].location}
            </AlertDescription>
          </Alert>
          <Button variant="destructive" className="w-full" onClick={handleQuit}>
            <XCircle className="h-4 w-4 mr-1" />
            Withdraw Submission
          </Button>
        </div>
      ) : (
        <>
          <StepIndicator steps={STEPS} currentStep={step} />
          <div className="px-4 py-3">
            {step === 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Activities <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
                {SFT_ACTIVITIES.map(a => {
                  const checked = data.activities.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => toggleActivity(a)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                        checked ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-card'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {checked && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-left">{a}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Location</Label>
                {SFT_LOCATIONS.map(l => (
                  <button
                    key={l}
                    onClick={() => setData({ ...data, location: l })}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                      data.location === l ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-card'
                    }`}
                  >{l}</button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Time (HHmm)</Label>
                  <Input
                    placeholder="e.g. 0600"
                    maxLength={4}
                    value={data.start_time}
                    onChange={(e) => setData({ ...data, start_time: e.target.value.replace(/\D/g, '') })}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Time (HHmm)</Label>
                  <Input
                    placeholder="e.g. 0700"
                    maxLength={4}
                    value={data.end_time}
                    onChange={(e) => setData({ ...data, end_time: e.target.value.replace(/\D/g, '') })}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Preview Submission</Label>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                    {`🏃 SFT SUBMISSION
                    ${user?.rank} ${user?.full_name}
                    Activities: ${data.activities.join(', ')}
                    Location: ${data.location}
                    Time: ${formatTime(data.start_time)} – ${formatTime(data.end_time)}`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              {step > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Back</Button>
              )}
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
        </>
      )}
    </div>
  );
}