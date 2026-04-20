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
import { ClipboardList, Check, AlertTriangle, Copy, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function ParadeState() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [outOfCamp, setOutOfCamp] = useState('');
  const [othersCount, setOthersCount] = useState('');
  const [permanentStatusCount, setPermanentStatusCount] = useState('');
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
  const othersNum = parseInt(othersCount) || 0;
  const permanentNum = parseInt(permanentStatusCount) || 0;
  const rsoList = allStatuses.filter(s => s.type === 'RSO');
  const maList = allStatuses.filter(s => s.type === 'MA');
  const rsiList = allStatuses.filter(s => s.type === 'RSI');
  const rsoCount = rsoList.length;
  const maCount = maList.length;
  const rsiCount = rsiList.length;
  const statusTotal = rsoCount + maCount + rsiCount;
  const validOutOfCamp = outOfCampNum >= 0 && outOfCampNum <= totalStrength;
  const inCamp = Math.max(totalStrength - outOfCampNum - rsoCount, 0);

  // Format a status entry with diagnosis/MC if available
  const formatStatusEntry = (s, idx) => {
    let line = `${idx + 1}. ${formatRankName(s.personnel_rank, s.personnel_name)}`;
    if (s.diagnosis) line += `\n   DIAGNOSIS: ${s.diagnosis}`;
    // Parse MC/status from details if present
    const detailsMatch = s.details?.match(/STATUS:\s*([^\n]+)/i);
    if (detailsMatch) line += `\n   STATUS: ${detailsMatch[1]}`;
    else if (s.end_date) line += `\n   END DATE: ${s.end_date}`;
    return line;
  };

  const generateReport = () => {
    const date = format(new Date(), 'dd MMM yyyy').toUpperCase();
    const time = format(new Date(), 'HHmm');

    const rsoLines = rsoList.map(formatStatusEntry).join('\n');
    const maLines = maList.map(formatStatusEntry).join('\n');
    const rsiLines = rsiList.map(formatStatusEntry).join('\n');

    let report = `📊 PARADE STATE — ${user?.unit || 'UNIT'}
Date: ${date}  Time: ${time}H
────────────────────
Total Strength : ${totalStrength}
In Camp        : ${inCamp}
Out of Camp    : ${outOfCampNum}
────────────────────
RSO              : ${rsoCount.toString().padStart(2, '0')}
MA               : ${maCount.toString().padStart(2, '0')}
RSI              : ${rsiCount.toString().padStart(2, '0')}
────────────────────
OTHERS           : ${othersNum.toString().padStart(2, '0')}
STATUSES         : ${statusTotal.toString().padStart(2, '0')}
PERMANENT STATUS : ${permanentNum.toString().padStart(2, '0')}
────────────────────`;

    if (rsoCount > 0) report += `\nRSO\n${rsoLines}`;
    if (maCount > 0) report += `\n\nMA\n${maLines}`;
    if (rsiCount > 0) report += `\n\nRSI\n${rsiLines}`;
    if (statusTotal === 0) report += '\nNIL';

    report += `\n────────────────────\nUpdated by: ${formatRankName(user?.rank, user?.full_name)}`;
    return report;
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
      <PageHeader title="Parade State" backTo={backPath} subtitle="Generate & send" />
      <div className="px-4 py-4 space-y-5">

        {/* Last sent */}
        {lastParadeLog && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Last sent</p>
              <p className="text-xs text-muted-foreground">
                By {lastParadeLog.performed_by?.split('@')[0]} · {format(parseISO(lastParadeLog.created_date), 'dd MMM, HH:mm')}
              </p>
            </div>
          </div>
        )}

        {/* Status overview tiles */}
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

        {/* Status detail list */}
        {allStatuses.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Active Statuses</p>
            {allStatuses.map((s, i) => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 mt-0.5">{i + 1}.</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{formatRankName(s.personnel_rank, s.personnel_name)}</p>
                  <p className="text-xs text-muted-foreground">{s.type} · {s.symptoms || '—'}</p>
                  {s.diagnosis && <p className="text-xs text-primary font-mono mt-0.5">DX: {s.diagnosis}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual inputs */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Manual Counts</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Out of Camp', value: outOfCamp, set: setOutOfCamp },
              { label: 'Others', value: othersCount, set: setOthersCount },
              { label: 'Perm Status', value: permanentStatusCount, set: setPermanentStatusCount },
            ].map(({ label, value, set }) => (
              <div key={label} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground text-center block">{label}</Label>
                <Input
                  type="number" min="0" placeholder="0"
                  value={value}
                  onChange={(e) => { set(e.target.value); setPreviewing(false); setConfirming(false); }}
                  className="text-center font-mono h-11"
                />
              </div>
            ))}
          </div>
        </div>

        {!validOutOfCamp && outOfCamp !== '' && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">Out of camp exceeds total strength ({totalStrength}).</AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full h-10"
          variant="outline"
          onClick={() => setPreviewing(true)}
          disabled={!validOutOfCamp && outOfCamp !== ''}
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
                <Copy className="h-4 w-4 mr-1.5" /> Copy
              </Button>
              {!confirming ? (
                <Button className="flex-1 h-10" onClick={() => setConfirming(true)}>
                  <Send className="h-4 w-4 mr-1.5" /> Send
                </Button>
              ) : (
                <Button className="flex-1 h-10" variant="destructive" onClick={handleSend} disabled={sending}>
                  <Check className="h-4 w-4 mr-1.5" />{sending ? 'Sending...' : 'Confirm Send'}
                </Button>
              )}
            </div>
            {confirming && (
              <Alert className="py-2 border-amber-500/25 bg-amber-500/8">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-xs text-amber-300">
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