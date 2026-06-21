import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SFT_ACTIVITIES } from '@/lib/constants';
import { Activity, Check, ArrowRight, XCircle, Clock, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import SuccessDialog from '@/components/ui/SuccessDialog';

const toMinutes = (hhmm) => {
  if (!hhmm || hhmm.length !== 4) return 0;
  return parseInt(hhmm.slice(0, 2)) * 60 + parseInt(hhmm.slice(2));
};

const fromMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
};

const formatDisplay = (hhmm) => {
  if (!hhmm || hhmm.length !== 4) return hhmm;
  return `${hhmm.slice(0, 2)}${hhmm.slice(2)}H`;
};

// Generate time options at 5-min increments within window
const getTimeOptions = (windowStart, windowEnd) => {
  const options = [];
  for (let m = windowStart; m <= windowEnd; m += 5) {
    options.push(m);
  }
  return options;
};

function TimeSelector({ label, value, min, max, options, onChange }) {
  const adjust = (delta) => {
    const idx = options.indexOf(value);
    const next = options[Math.max(0, Math.min(options.length - 1, idx + delta))];
    if (next >= min && next <= max) onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
      <button
        onClick={() => adjust(-1)}
        className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted/40 active:scale-95 transition-all"
      >
        <Minus className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="w-24 h-16 rounded-2xl border-2 border-primary/40 bg-primary/8 flex items-center justify-center">
        <span className="text-2xl font-bold font-mono text-primary">{formatDisplay(fromMinutes(value))}</span>
      </div>
      <button
        onClick={() => adjust(1)}
        className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted/40 active:scale-95 transition-all"
      >
        <Plus className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

const STEPS = ['Activity', 'Time', 'Confirm'];

export default function SFTSubmission() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState([]);
  const [startMins, setStartMins] = useState(null);
  const [endMins, setEndMins] = useState(null);
  const [submitted, setSubmitted] = useState(false);

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

  const windowStartMins = activeWindow ? toMinutes(activeWindow.start_time) : 0;
  const windowEndMins = activeWindow ? toMinutes(activeWindow.end_time) : 60;
  const timeOptions = activeWindow ? getTimeOptions(windowStartMins, windowEndMins) : [];

  useEffect(() => {
    if (step === 1 && startMins === null && activeWindow) {
      setStartMins(windowStartMins);
      setEndMins(windowEndMins);
    }
  }, [step, activeWindow]);

  const toggleActivity = (a) => {
    setActivities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const canNext = () => {
    if (step === 0) return activities.length > 0;
    if (step === 1) return startMins !== null && endMins !== null && endMins > startMins;
    return true;
  };

  const timeRange = `${fromMinutes(startMins ?? windowStartMins)}-${fromMinutes(endMins ?? windowEndMins)}`;

  const handleSubmit = async () => {
    setSaving(true);
    // Show confirmation dialog, then persist in background
    setSubmitted(true);
    base44.entities.SFTSubmission.create({
      cadet_name: user?.full_name,
      cadet_rank: user?.rank,
      cadet_id: user?.id,
      activity: activities.join(', '),
      time_range: timeRange,
      window_id: activeWindow.id,
      unit: user?.unit,
      status: 'active',
    }).then(() => base44.functions.invoke('broadcastNotification', {
      notification: {
        title: 'SFT Submitted',
        message: `${user?.rank || ''} ${user?.full_name || ''} — ${activities.join(', ')} (${formatDisplay(fromMinutes(startMins))}–${formatDisplay(fromMinutes(endMins))})`,
        type: 'info',
        category: 'sft',
      },
    })).then(() => {
      queryClient.invalidateQueries({ queryKey: ['sft-my'] });
    }).finally(() => setSaving(false));
  };

  const handleQuit = async () => {
    if (!mySubmissions[0]) return;
    // Optimistic: update cache immediately
    queryClient.setQueryData(['sft-my', user?.email, user?.unit], []);
    toast.success('Your SFT submission has been withdrawn.');
    base44.entities.SFTSubmission.update(mySubmissions[0].id, { status: 'withdrawn' })
      .then(() => queryClient.invalidateQueries({ queryKey: ['sft-my'] }));
  };

  if (!activeWindow) {
    return (
      <div>
        <PageHeader title="SFT Submission" backTo="/" />
        <div className="px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Activity className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-foreground">No active SFT window</p>
          <p className="text-xs text-muted-foreground mt-1">An admin must open an SFT window first.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SuccessDialog
        open={submitted}
        onClose={() => { setSubmitted(false); navigate('/'); }}
        title="SFT Submitted"
        message={`${activities.join(', ')} from ${formatDisplay(fromMinutes(startMins))} to ${formatDisplay(fromMinutes(endMins))}.`}
      />
      <PageHeader
        title="SFT Submission"
        backTo="/"
        subtitle={`Window: ${formatDisplay(activeWindow.start_time)} – ${formatDisplay(activeWindow.end_time)}`}
      />

      {hasSubmission ? (
        <div className="px-4 py-5 space-y-4">
          <div className="p-4 rounded-2xl border border-primary/25 bg-primary/8 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Active Submission</p>
            </div>
            <p className="text-sm text-foreground font-medium">{mySubmissions[0].activity}</p>
            {mySubmissions[0].time_range && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono">
                  {mySubmissions[0].time_range.replace(/(\d{4})-(\d{4})/, (_, a, b) => `${formatDisplay(a)} – ${formatDisplay(b)}`)}
                </span>
              </div>
            )}
          </div>
          <Button variant="destructive" className="w-full" onClick={handleQuit}>
            <XCircle className="h-4 w-4 mr-1" />
            Withdraw Submission
          </Button>
        </div>
      ) : (
        <>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 px-4 pt-4 pb-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${
                    i < step ? 'bg-primary border-primary text-white' :
                    i === step ? 'border-primary text-primary bg-primary/10' :
                    'border-border text-muted-foreground/40'
                  }`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs transition-all ${i === step ? 'font-semibold text-foreground' : 'text-muted-foreground/40'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border max-w-8" />}
              </React.Fragment>
            ))}
          </div>

          <div className="px-4 py-4">

            {/* Step 0: Activity */}
            {step === 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground mb-3">Select your activities</p>
                {SFT_ACTIVITIES.map(a => {
                  const checked = activities.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => toggleActivity(a)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-sm transition-all ${
                        checked ? 'border-primary bg-primary/8 font-medium' : 'border-border bg-card hover:bg-muted/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        checked ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {checked && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-left leading-snug">{a}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 1: Time picker — tap friendly */}
            {step === 1 && startMins !== null && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">Set your time range</p>
                  <p className="text-xs text-muted-foreground">
                    Window: {formatDisplay(activeWindow.start_time)} – {formatDisplay(activeWindow.end_time)}
                  </p>
                </div>

                {/* Time display + controls */}
                <div className="flex items-center justify-center gap-6">
                  <TimeSelector
                    label="Start"
                    value={startMins}
                    min={windowStartMins}
                    max={endMins - 5}
                    options={timeOptions}
                    onChange={setStartMins}
                  />
                  <div className="flex flex-col items-center gap-1 mt-5">
                    <div className="h-[2px] w-8 bg-border" />
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {endMins - startMins}m
                    </p>
                  </div>
                  <TimeSelector
                    label="End"
                    value={endMins}
                    min={startMins + 5}
                    max={windowEndMins}
                    options={timeOptions}
                    onChange={setEndMins}
                  />
                </div>

                {/* Duration bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{formatDisplay(fromMinutes(windowStartMins))}</span>
                    <span>{formatDisplay(fromMinutes(windowEndMins))}</span>
                  </div>
                  <div className="relative h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-primary rounded-full transition-all"
                      style={{
                        left: `${((startMins - windowStartMins) / (windowEndMins - windowStartMins)) * 100}%`,
                        right: `${((windowEndMins - endMins) / (windowEndMins - windowStartMins)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Duration: <span className="font-semibold text-foreground">{endMins - startMins} min</span>
                  </p>
                </div>

                {/* Quick preset buttons */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quick Presets</p>
                  <div className="flex gap-2 flex-wrap">
                    {[30, 45, 60, 90].map(dur => {
                      const eMin = Math.min(windowStartMins + dur, windowEndMins);
                      return (
                        <button
                          key={dur}
                          disabled={windowStartMins + dur > windowEndMins}
                          onClick={() => { setStartMins(windowStartMins); setEndMins(eMin); }}
                          className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-30 transition-all"
                        >
                          {dur}m
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { setStartMins(windowStartMins); setEndMins(windowEndMins); }}
                      className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-all"
                    >
                      Full window
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Confirm */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Review your submission</p>
                <Card className="bg-muted/20 border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{user?.rank} {user?.full_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-mono font-medium">
                        {formatDisplay(fromMinutes(startMins))} – {formatDisplay(fromMinutes(endMins))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{endMins - startMins} min</span>
                    </div>
                    <div className="pt-2 border-t border-border space-y-1">
                      <p className="text-xs text-muted-foreground">Activities</p>
                      {activities.map((a, i) => (
                        <p key={a} className="text-sm font-medium">{i + 1}. {a}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              {step > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Back</Button>
              )}
              {step < 2 ? (
                <Button className="flex-1" onClick={() => setStep(step + 1)} disabled={!canNext()}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" />{saving ? 'Submitting...' : 'Submit SFT'}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}