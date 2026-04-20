import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TIME_REGEX, formatTime, formatRankName } from '@/lib/constants';
import { Activity, Clock, Check, XCircle, Copy, Send, AlertTriangle, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { isCadetAdmin, isInstructor } from '@/lib/constants';

// Convert HHmm to display
const fmt = (hhmm) => hhmm ? `${hhmm}H` : '';

export default function PTAdmin() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const cadetAdmin = isCadetAdmin(user);
  const instructor = isInstructor(user);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [instructor, setInstructor] = useState('');
  const [salutation, setSalutation] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const { data: activeWindows = [] } = useQuery({
    queryKey: ['sft-windows-active', user?.unit],
    queryFn: () => base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['sft-submissions', user?.unit, activeWindows[0]?.id],
    queryFn: () => base44.entities.SFTSubmission.filter({ window_id: activeWindows[0].id, status: 'active' }),
    enabled: activeWindows.length > 0,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit, role: 'instructor' }),
    enabled: !!user?.unit,
  });

  const activeWindow = activeWindows[0];

  const handleCreateWindow = async () => {
    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) return;
    setSaving(true);
    await base44.entities.SFTWindow.create({
      start_time: startTime,
      end_time: endTime,
      date: format(new Date(), 'yyyy-MM-dd'),
      is_active: true,
      unit: user?.unit,
      instructor_name: instructor,
      salutation: salutation,
    });
    setSaving(false);
    toast.success('SFT window opened');
    queryClient.invalidateQueries({ queryKey: ['sft-windows-active'] });
  };

  const handleCloseWindow = async () => {
    if (!activeWindow) return;
    await base44.entities.SFTWindow.update(activeWindow.id, { is_active: false });
    toast.success('SFT window closed');
    queryClient.invalidateQueries({ queryKey: ['sft-windows-active'] });
  };

  const handleRemoveSubmission = async (subId) => {
    await base44.entities.SFTSubmission.update(subId, { status: 'withdrawn' });
    toast.success('Submission removed');
    queryClient.invalidateQueries({ queryKey: ['sft-submissions'] });
  };

  // Group submissions by each individual activity
  // A submission can have multiple activities separated by ", "
  const groupedByActivity = {};
  let counter = 1;
  const submissionCounter = {};

  // First pass: assign global counter per submission, expand by activity
  const expandedRows = [];
  submissions.forEach(sub => {
    const acts = sub.activity ? sub.activity.split(', ') : ['Unknown'];
    acts.forEach(act => {
      if (!groupedByActivity[act]) groupedByActivity[act] = [];
      groupedByActivity[act].push(sub);
    });
  });

  const generateReport = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : 'Good Afternoon';
    const dateStr = format(new Date(), 'ddMMMyyyy').toUpperCase();
    const windowStr = activeWindow ? `${fmt(activeWindow.start_time)} to ${fmt(activeWindow.end_time)}` : '';
    const sal = salutation || (instructor ? 'Sir/Ma\'am' : 'Sir/Ma\'am');
    const instrName = instructor || (activeWindow?.instructor_name || '');

    let report = `${greeting} ${sal}${instrName ? ' ' + instrName.split(' ').slice(-1)[0] : ''}, `;
    report += `below are the cadets participating in SFT for ${dateStr} from ${windowStr}.\n\n`;
    report += `Submission of names\n`;

    let globalNum = 1;
    Object.entries(groupedByActivity).forEach(([activity, subs]) => {
      // Deduplicate by cadet_id for this activity
      const seen = new Set();
      const unique = subs.filter(s => {
        if (seen.has(s.cadet_id)) return false;
        seen.add(s.cadet_id);
        return true;
      });
      report += `${activity}\n`;
      unique.forEach(s => {
        const timeDisplay = s.time_range
          ? s.time_range.replace(/(\d{4})-(\d{4})/, (_, a, b) => `${a}H-${b}H`)
          : `${fmt(activeWindow?.start_time)}-${fmt(activeWindow?.end_time)}`;
        report += `${globalNum}. ${(s.cadet_name || '').toUpperCase()} ${timeDisplay}\n`;
        globalNum++;
      });
      report += '\n';
    });

    return report.trim();
  };

  const handleSendToInstructor = async () => {
    setSending(true);
    const report = generateReport();
    await base44.entities.AuditLog.create({
      action: 'sft_submitted_to_instructor',
      category: 'sft',
      details: report,
      performed_by: user?.email,
      unit: user?.unit,
    });
    // Notify instructors
    await base44.entities.Notification.create({
      title: '🏃 SFT Submitted for Approval',
      message: `${formatRankName(user?.rank, user?.full_name)} submitted SFT list (${submissions.length} cadets) for ${format(new Date(), 'dd MMM')}`,
      type: 'info',
      category: 'sft',
      recipient_unit: user?.unit,
    });
    setSending(false);
    setConfirming(false);
    toast.success('SFT submitted to instructor');
    queryClient.invalidateQueries({ queryKey: ['sft-submissions'] });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReport());
    toast.success('Copied to clipboard');
  };

  const report = activeWindow && submissions.length > 0 ? generateReport() : null;

  return (
    <div>
      <PageHeader title="PT Admin" backTo="/" subtitle={instructor ? 'SFT approval' : 'SFT session management'} />
      <div className="px-4 py-4 space-y-5">

        {/* Active or Create Window */}
        {activeWindow ? (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Active SFT Window
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xl font-mono font-bold">{fmt(activeWindow.start_time)} – {fmt(activeWindow.end_time)}</p>
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{submissions.length} cadets joined</p>
              </div>
              {cadetAdmin && (
                <Button variant="destructive" size="sm" onClick={handleCloseWindow}>
                  <XCircle className="h-3.5 w-3.5 mr-1" />Close Window
                </Button>
              )}
            </CardContent>
          </Card>
        ) : cadetAdmin ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Open SFT Window</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start Time (HHmm)</Label>
                  <Input placeholder="1530" maxLength={4} value={startTime}
                    onChange={(e) => setStartTime(e.target.value.replace(/\D/g, ''))}
                    className="font-mono text-center" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Time (HHmm)</Label>
                  <Input placeholder="1615" maxLength={4} value={endTime}
                    onChange={(e) => setEndTime(e.target.value.replace(/\D/g, ''))}
                    className="font-mono text-center" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Approving Instructor</Label>
                <Select value={instructor} onValueChange={setInstructor}>
                  <SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger>
                  <SelectContent>
                    {instructors.map(i => (
                      <SelectItem key={i.id} value={formatRankName(i.rank, i.full_name)}>
                        {formatRankName(i.rank, i.full_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Salutation</Label>
                <Input placeholder="e.g. Sir / Ma'am" value={salutation} onChange={(e) => setSalutation(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleCreateWindow}
                disabled={!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime) || saving}>
                <Check className="h-4 w-4 mr-1" />{saving ? 'Opening...' : 'Open SFT Window'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Shield className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No active SFT window</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Cadet admins open sessions for cadets to join</p>
          </div>
        )}

        {/* Submission list */}
        {activeWindow && submissions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Joined Cadets ({submissions.length})</h2>
            {Object.entries(groupedByActivity).map(([activity, subs]) => (
              <div key={activity} className="space-y-1">
                <p className="text-xs font-semibold text-foreground/70 pl-1 uppercase tracking-wide">{activity}</p>
                {subs.map((sub, idx) => (
                  <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{formatRankName(sub.cadet_rank, sub.cadet_name)}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {sub.time_range?.replace('-', ' – ').replace(/(\d{4})/g, '$1H') || '—'}
                        </p>
                      </div>
                    </div>
                    {cadetAdmin && (
                      <Button variant="ghost" size="sm" className="text-destructive/70 hover:text-destructive h-7 w-7 p-0 shrink-0" onClick={() => handleRemoveSubmission(sub.id)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Report preview + send */}
        {report && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SFT Report</h2>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{report}</pre>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-10" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              {!confirming ? (
                <Button className="flex-1 h-10" onClick={() => setConfirming(true)}>
                  <Send className="h-4 w-4 mr-1" /> Submit to Instructor
                </Button>
              ) : (
                <Button className="flex-1 h-10 bg-destructive hover:bg-destructive/90" onClick={handleSendToInstructor} disabled={sending}>
                  <Check className="h-4 w-4 mr-1" /> {sending ? 'Sending...' : 'Confirm Submit'}
                </Button>
              )}
            </div>
            {confirming && (
              <Alert className="py-2 border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-xs text-amber-300">
                  This will notify all instructors. Press <strong>Confirm Submit</strong> to proceed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}