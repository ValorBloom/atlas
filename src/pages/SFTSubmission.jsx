import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SFT_ACTIVITIES } from '@/lib/constants';
import { Activity, Check, ArrowRight, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// Convert HHmm string to total minutes
const toMinutes = (hhmm) => {
  if (!hhmm || hhmm.length !== 4) return 0;
  return parseInt(hhmm.slice(0, 2)) * 60 + parseInt(hhmm.slice(2));
};

// Convert minutes to HHmm string
const fromMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
};

const formatDisplay = (hhmm) => {
  if (!hhmm || hhmm.length !== 4) return hhmm;
  return `${hhmm.slice(0, 2)}${hhmm.slice(2)}H`;
};

// Simple two-handle range slider within a window
function TimeRangeSlider({ windowStart, windowEnd, startMins, endMins, onChange }) {
  const trackRef = useRef(null);
  const totalRange = windowEnd - windowStart;

  const getPercent = (val) => ((val - windowStart) / totalRange) * 100;

  const handleDrag = (which, e) => {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;

    const move = (clientX) => {
      const rect = track.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      // snap to 5-minute increments
      let val = Math.round((windowStart + pct * totalRange) / 5) * 5;
      val = Math.max(windowStart, Math.min(windowEnd, val));

      if (which === 'start') {
        onChange(Math.min(val, endMins - 5), endMins);
      } else {
        onChange(startMins, Math.max(val, startMins + 5));
      }
    };

    const onMouseMove = (ev) => move(ev.clientX);
    const onTouchMove = (ev) => move(ev.touches[0].clientX);
    const cleanup = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', cleanup);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', cleanup);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', cleanup);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', cleanup);
  };

  const startPct = getPercent(startMins);
  const endPct = getPercent(endMins);

  return (
    <div className="space-y-4">
      {/* Time labels */}
      <div className="flex justify-between items-center">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Start</p>
          <p className="text-lg font-bold font-mono text-primary">{formatDisplay(fromMinutes(startMins))}</p>
        </div>
        <div className="text-xs text-muted-foreground">to</div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">End</p>
          <p className="text-lg font-bold font-mono text-primary">{formatDisplay(fromMinutes(endMins))}</p>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative h-8 flex items-center px-3" ref={trackRef}>
        {/* Background track */}
        <div className="absolute inset-x-3 h-2 bg-border rounded-full" />
        {/* Active range */}
        <div
          className="absolute h-2 bg-primary rounded-full"
          style={{ left: `calc(12px + ${startPct}% * (100% - 24px) / 100)`, right: `calc(12px + ${100 - endPct}% * (100% - 24px) / 100)` }}
        />
        {/* Window boundary labels */}
        <span className="absolute left-0 -bottom-5 text-[10px] text-muted-foreground font-mono">{formatDisplay(fromMinutes(windowStart))}</span>
        <span className="absolute right-0 -bottom-5 text-[10px] text-muted-foreground font-mono">{formatDisplay(fromMinutes(windowEnd))}</span>

        {/* Start handle */}
        <div
          className="absolute w-6 h-6 bg-primary rounded-full shadow-lg border-2 border-white cursor-grab active:cursor-grabbing z-10 flex items-center justify-center"
          style={{ left: `calc(${startPct}% * (100% - 24px) / 100)` }}
          onMouseDown={(e) => handleDrag('start', e)}
          onTouchStart={(e) => handleDrag('start', e)}
        />
        {/* End handle */}
        <div
          className="absolute w-6 h-6 bg-primary rounded-full shadow-lg border-2 border-white cursor-grab active:cursor-grabbing z-10 flex items-center justify-center"
          style={{ left: `calc(24px + ${endPct}% * (100% - 24px) / 100 - 24px)` }}
          onMouseDown={(e) => handleDrag('end', e)}
          onTouchStart={(e) => handleDrag('end', e)}
        />
      </div>
      <div className="h-5" /> {/* spacer for bottom labels */}
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

  // Init slider when step changes to time
  useEffect(() => {
    if (step === 1 && startMins === null && activeWindow) {
      setStartMins(windowStartMins);
      setEndMins(windowEndMins);
    }
  }, [step, activeWindow]);

  const toggleActivity = (a) => {
    setActivities(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const canNext = () => {
    if (step === 0) return activities.length > 0;
    if (step === 1) return startMins !== null && endMins !== null && endMins > startMins;
    return true;
  };

  const timeRange = `${fromMinutes(startMins ?? windowStartMins)}-${fromMinutes(endMins ?? windowEndMins)}`;

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.SFTSubmission.create({
      cadet_name: user?.full_name,
      cadet_rank: user?.rank,
      cadet_id: user?.id,
      activity: activities.join(', '),
      location: '',
      time_range: timeRange,
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
      <PageHeader
        title="SFT Submission"
        backTo="/"
        subtitle={`Window: ${formatDisplay(activeWindow.start_time)} – ${formatDisplay(activeWindow.end_time)}`}
      />

      {hasSubmission ? (
        <div className="px-4 py-5 space-y-4">
          <Alert className="bg-primary/5 border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              Active submission: <strong>{mySubmissions[0].activity}</strong>
              {mySubmissions[0].time_range && ` · ${mySubmissions[0].time_range.replace('-', '–').replace(/(\d{4})/g, (m) => formatDisplay(m))}`}
            </AlertDescription>
          </Alert>
          <Button variant="destructive" className="w-full" onClick={handleQuit}>
            <XCircle className="h-4 w-4 mr-1" />
            Withdraw Submission
          </Button>
        </div>
      ) : (
        <>
          {/* Compact step indicator — no scrollbar */}
          <div className="flex items-center justify-center gap-2 px-4 pt-3 pb-1">
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
                  <span className={`text-xs transition-all ${i === step ? 'font-semibold text-foreground' : 'text-muted-foreground/50'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border max-w-8" />}
              </React.Fragment>
            ))}
          </div>

          <div className="px-4 py-4">
            {/* Step 0: Activity multi-select */}
            {step === 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Select Activities <span className="text-muted-foreground font-normal text-xs">(select all that apply)</span>
                </Label>
                {SFT_ACTIVITIES.map(a => {
                  const checked = activities.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => toggleActivity(a)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                        checked ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
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

            {/* Step 1: Time range slider */}
            {step === 1 && startMins !== null && (
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">Select Time Range</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Drag the handles within the SFT window</p>
                </div>
                <TimeRangeSlider
                  windowStart={windowStartMins}
                  windowEnd={windowEndMins}
                  startMins={startMins}
                  endMins={endMins}
                  onChange={(s, e) => { setStartMins(s); setEndMins(e); }}
                />
                {/* Duration */}
                <div className="mt-2 text-center">
                  <span className="text-xs text-muted-foreground">Duration: </span>
                  <span className="text-sm font-semibold text-foreground">{endMins - startMins} min</span>
                </div>
              </div>
            )}

            {/* Step 2: Confirm */}
            {step === 2 && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Preview Submission</Label>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{user?.rank} {user?.full_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-mono font-medium">{formatDisplay(fromMinutes(startMins))} – {formatDisplay(fromMinutes(endMins))}</span>
                    </div>
                    <div className="pt-1 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Activities</p>
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