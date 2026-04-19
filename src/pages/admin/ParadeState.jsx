import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatRankName, isInstructor } from '@/lib/constants';
import { ClipboardList, Check, AlertTriangle, Copy, Send, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function ParadeState() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [outOfCamp, setOutOfCamp] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: activeStatuses = [] } = useQuery({
    queryKey: ['active-statuses', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit: user?.unit, status: 'active' }),
    enabled: !!user?.unit,
  });

  const { data: approvedStatuses = [] } = useQuery({
    queryKey: ['approved-statuses', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit: user?.unit, status: 'approved' }),
    enabled: !!user?.unit,
  });

  // Get last parade state audit log
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['parade-audit', user?.unit],
    queryFn: () => base44.entities.AuditLog.filter(
      { unit: user?.unit, category: 'parade' }, '-created_date', 1
    ),
    enabled: !!user?.unit,
  });

  const lastParadeLog = auditLogs[0] || null;

  const allStatuses = [...activeStatuses, ...approvedStatuses];
  const totalStrength = allUsers.length;
  const outOfCampNum = parseInt(outOfCamp) || 0;
  const rsoList = allStatuses.filter(s => s.type === 'RSO');
  const maList = allStatuses.filter(s => s.type === 'MA');
  const rsiList = allStatuses.filter(s => s.type === 'RSI');
  const rsoCount = rsoList.length;
  const maCount = maList.length;
  const rsiCount = rsiList.length;
  const validOutOfCamp = outOfCampNum >= 0 && outOfCampNum <= totalStrength;
  const inCamp = Math.max(totalStrength - outOfCampNum - rsoCount, 0);

  const generateReport = () => {
    const date = format(new Date(), 'dd MMM yyyy').toUpperCase();
    const time = format(new Date(), 'HHmm');
    const details = allStatuses.map(s =>
      `${s.type}: ${formatRankName(s.personnel_rank, s.personnel_name)}${s.diagnosis ? ' (' + s.diagnosis + ')' : ''}`
    ).join('\n');
    return `📊 PARADE STATE — ${user?.unit || 'UNIT'}
Date: ${date}  Time: ${time}H
────────────────────
Total Strength : ${totalStrength}
In Camp        : ${inCamp}
Out of Camp    : ${outOfCampNum}
────────────────────
RSO : ${rsoCount}
MA  : ${maCount}
RSI : ${rsiCount}
────────────────────
${details || 'NIL'}
────────────────────
Updated by: ${formatRankName(user?.rank, user?.full_name)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReport());
    toast.success('Copied to clipboard');
  };

  const handleSend = async () => {
    setSending(true);
    const report = generateReport();
    await base44.entities.AuditLog.create({
      action: 'parade_state_sent',
      category: 'parade',
      details: report,
      performed_by: user?.email,
      unit: user?.unit,
    });
    await base44.entities.Notification.create({
      title: '📊 Parade State Updated',
      message: `${formatRankName(user?.rank, user?.full_name)} sent the parade state for ${format(new Date(), 'dd MMM')}`,
      type: 'info',
      category: 'admin',
      recipient_unit: user?.unit,
    });
    qc.invalidateQueries({ queryKey: ['parade-audit', user?.unit] });
    setSending(false);
    setConfirming(false);
    toast.success('Parade state sent');
  };

  const backPath = isInstructor(user) ? '/admin' : '/';

  return (
    <div>
      <PageHeader title="Parade State" backTo={backPath} subtitle="Generate & send parade state" />
      <div className="px-4 py-4 space-y-5">

        {/* Last Updated */}
        {lastParadeLog && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary">Last Sent</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By {lastParadeLog.performed_by} · {format(parseISO(lastParadeLog.created_date), 'dd MMM, HH:mm')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status counts */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Strength', value: totalStrength },
            { label: 'RSO', value: rsoCount },
            { label: 'MA', value: maCount },
            { label: 'RSI', value: rsiCount },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold mt-0.5">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Out of camp input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Out of Camp Count</Label>
          <Input
            type="number"
            min="0"
            placeholder="Enter number"
            value={outOfCamp}
            onChange={(e) => { setOutOfCamp(e.target.value); setPreviewing(false); setConfirming(false); }}
            className="text-center text-lg font-mono h-12"
          />
          {!validOutOfCamp && outOfCamp !== '' && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Cannot exceed total strength ({totalStrength}).
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Button
          className="w-full h-10"
          onClick={() => setPreviewing(true)}
          disabled={!validOutOfCamp || outOfCamp === ''}
          variant="outline"
        >
          <ClipboardList className="h-4 w-4 mr-1.5" /> Preview Report
        </Button>

        {previewing && (
          <div className="space-y-3">
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{generateReport()}</pre>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-10" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              {!confirming ? (
                <Button className="flex-1 h-10" onClick={() => setConfirming(true)}>
                  <Send className="h-4 w-4 mr-1" /> Send
                </Button>
              ) : (
                <Button
                  className="flex-1 h-10 bg-destructive hover:bg-destructive/90"
                  onClick={handleSend}
                  disabled={sending}
                >
                  <Check className="h-4 w-4 mr-1" /> {sending ? 'Sending...' : 'Confirm Send'}
                </Button>
              )}
            </div>

            {confirming && (
              <Alert className="py-2 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  This will notify the unit. Press <strong>Confirm Send</strong> to proceed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}