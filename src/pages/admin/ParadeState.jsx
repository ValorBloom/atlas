import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatRankName, isInstructor } from '@/lib/constants';
import { ClipboardList, Check, AlertTriangle, Copy, Send, Clock, Users, UserX, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

// ── Instructor read-only view ─────────────────────────────────────────────────
function InstructorParadeState({ user }) {
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
    queryFn: () => base44.entities.AuditLog.filter({ unit: user?.unit, category: 'parade' }, '-created_date', 1),
    enabled: !!user?.unit,
  });

  const lastParadeLog = auditLogs[0] || null;
  const allStatuses = [...activeStatuses, ...approvedStatuses];
  // Parade state is cadets-only strength
  const cadets = allUsers.filter(u => u.role === 'cadet' || u.role === 'cadet_admin');
  const totalStrength = cadets.length;
  const rsoList = allStatuses.filter(s => s.type === 'RSO');
  const maList = allStatuses.filter(s => s.type === 'MA');
  const rsiList = allStatuses.filter(s => s.type === 'RSI');
  const outOfCamp = rsoList.length; // RSO are out of camp
  const inCamp = Math.max(totalStrength - outOfCamp, 0);
  const statusTotal = allStatuses.length;

  const fmtDate = (d) => {
    try { return format(parseISO(d), 'ddMMyyyy'); } catch { return d; }
  };

  return (
    <div className="px-4 py-4 space-y-5 pb-24">

      {/* Last updated banner */}
      {lastParadeLog && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">Last parade state sent</p>
            <p className="text-xs text-muted-foreground">
              By {lastParadeLog.performed_by?.split('@')[0]} · {format(parseISO(lastParadeLog.created_date), 'dd MMM, HHmm')}H
            </p>
          </div>
        </div>
      )}

      {/* Strength overview */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Strength</p>
            <p className="text-2xl font-bold">{inCamp}<span className="text-base font-normal text-muted-foreground">/{totalStrength}</span></p>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: totalStrength > 0 ? `${(inCamp / totalStrength) * 100}%` : '0%' }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/8 border border-green-500/20">
              <Users className="h-4 w-4 text-green-400 shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">In Camp</p>
                <p className="text-lg font-bold text-green-400">{inCamp}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/8 border border-destructive/20">
              <UserX className="h-4 w-4 text-destructive shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Out of Camp</p>
                <p className="text-lg font-bold text-destructive">{outOfCamp}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'RSO', list: rsoList, color: 'text-destructive', bg: 'bg-destructive/8 border-destructive/20' },
          { label: 'RSI', list: rsiList, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20' },
          { label: 'MA', list: maList, color: 'text-primary', bg: 'bg-primary/8 border-primary/20' },
        ].map(({ label, list, color, bg }) => (
          <Card key={label} className={`border ${bg}`}>
            <CardContent className="p-3 text-center">
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>{label}</p>
              <p className="text-2xl font-bold mt-0.5">{list.length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active statuses list */}
      {allStatuses.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Active Statuses</p>
          {allStatuses.map((s, i) => (
            <div key={s.id} className="p-3 rounded-xl border border-border bg-card space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={
                  s.type === 'RSO' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                  s.type === 'MA' ? 'bg-primary/10 text-primary border-primary/20' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }>{s.type}</Badge>
                <p className="text-sm font-semibold text-foreground">{formatRankName(s.personnel_rank, s.personnel_name)}</p>
              </div>
              {s.symptoms && <p className="text-xs text-muted-foreground">{s.symptoms}</p>}
              {s.diagnosis && <p className="text-xs text-primary font-mono">DX: {s.diagnosis}</p>}
              {(s.start_date || s.end_date) && (
                <p className="text-xs text-muted-foreground">{s.start_date ? fmtDate(s.start_date) : '—'} – {s.end_date ? fmtDate(s.end_date) : '—'}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Latest parade state report */}
      {lastParadeLog?.details && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Latest Parade State</p>
            <button
              onClick={() => { navigator.clipboard.writeText(lastParadeLog.details); toast.success('Copied'); }}
              className="text-xs text-primary flex items-center gap-1 hover:opacity-70 transition-opacity"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <Card className="bg-muted/20 border-border">
            <CardContent className="p-4">
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">{lastParadeLog.details}</pre>
            </CardContent>
          </Card>
        </div>
      )}

      {!lastParadeLog && allStatuses.length === 0 && (
        <div className="py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">No parade state sent yet.</p>
          <p className="text-xs text-muted-foreground">Cadet admin will send it when ready.</p>
        </div>
      )}
    </div>
  );
}

// ── Cadet Admin send view ─────────────────────────────────────────────────────
function AdminParadeState({ user }) {
  const qc = useQueryClient();
  const [outOfCamp, setOutOfCamp] = useState('');
  const [othersCount, setOthersCount] = useState('');
  const [permanentStatusCount, setPermanentStatusCount] = useState('');
  const [temporaryStatusCount, setTemporaryStatusCount] = useState('');
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
    queryFn: () => base44.entities.AuditLog.filter({ unit: user?.unit, category: 'parade' }, '-created_date', 1),
    enabled: !!user?.unit,
  });

  const lastParadeLog = auditLogs[0] || null;
  const allStatuses = [...activeStatuses, ...approvedStatuses];
  // Parade state uses cadets-only strength
  const cadets = allUsers.filter(u => u.role === 'cadet' || u.role === 'cadet_admin');
  const totalStrength = cadets.length;
  const outOfCampNum = parseInt(outOfCamp) || 0;
  const othersNum = parseInt(othersCount) || 0;
  const permanentNum = parseInt(permanentStatusCount) || 0;
  const temporaryNum = parseInt(temporaryStatusCount) || 0;
  const rsoList = allStatuses.filter(s => s.type === 'RSO');
  const maList = allStatuses.filter(s => s.type === 'MA');
  const rsiList = allStatuses.filter(s => s.type === 'RSI');
  const rsoCount = rsoList.length;
  const maCount = maList.length;
  const rsiCount = rsiList.length;
  const statusTotal = allStatuses.length;
  const validOutOfCamp = outOfCampNum >= 0 && outOfCampNum <= totalStrength;
  const inCamp = Math.max(totalStrength - outOfCampNum - rsoCount, 0);

  const fmtDate = (d) => {
    try { return format(parseISO(d), 'ddMMyyyy'); } catch { return d || '—'; }
  };
  const nowDate = () => format(new Date(), 'ddMMyyyy').toUpperCase();
  const nowTime = () => format(new Date(), 'HHmm') + 'H';

  const formatEntry = (s, idx) => {
    const name = formatRankName(s.personnel_rank, s.personnel_name);
    let line = `${idx + 1}. ${name}`;
    if (s.type === 'MA') {
      line += `\nNAME: ${s.personnel_name || '—'}`;
      line += `\nLOCATION: ${s.symptoms || '—'}`;
      if (s.start_date) line += `\nDATE: ${fmtDate(s.start_date)}`;
      line += `\nTIME OF APPOINTMENT: ${s.details?.match(/TIME:\s*([^\n]+)/i)?.[1] || '—'}`;
      line += `\nENDORSED BY: ${s.approved_by || '—'}`;
    } else if (s.type === 'RSO') {
      if (s.diagnosis) line += `\nDIAGNOSIS: ${s.diagnosis}`;
      const mcMatch = s.details?.match(/STATUS:\s*([^\n]+)/i);
      if (mcMatch) line += `\nSTATUS: ${mcMatch[1]}`;
      if (s.start_date && s.end_date) line += `\n${fmtDate(s.start_date)}-${fmtDate(s.end_date)}`;
    } else {
      if (s.diagnosis) line += `\nDIAGNOSIS: ${s.diagnosis}`;
      if (s.start_date && s.end_date) line += `\n${fmtDate(s.start_date)}-${fmtDate(s.end_date)}`;
    }
    return line;
  };

  const mcList = rsoList.filter(s => s.details?.toLowerCase().includes('mc') || s.diagnosis);
  const permanentList = allStatuses.filter(s => !s.end_date);
  const temporaryList = allStatuses.filter(s => s.end_date);

  const generateReport = () => {
    const unit = (user?.unit || 'UNIT').toUpperCase();
    const sep = '--------------------------------------------------------';
    let r = '';
    r += `PARADE STATE - ${unit}\n`;
    r += `Date: ${nowDate()} Time: ${nowTime()}\n`;
    r += sep + '\n\n';
    r += `TOTAL STRENGTH: ${totalStrength}\n`;
    r += `CURRENT STRENGTH: ${inCamp} (In Camp)\n`;
    r += `OUT OF CAMP: ${outOfCampNum} (Out of Camp)\n\n`;
    r += sep + '\n';

    // MA
    r += `\nMA: ${String(maCount).padStart(2, '0')}\n`;
    if (maList.length > 0) r += maList.map((s, i) => formatEntry(s, i)).join('\n\n') + '\n';
    r += '\n' + sep + '\n';

    // RSI
    r += `\nRSI : ${String(rsiCount).padStart(2, '0')}\n`;
    if (rsiList.length > 0) r += rsiList.map((s, i) => formatEntry(s, i)).join('\n\n') + '\n';

    // RSO
    r += `\n\nRSO : ${String(rsoCount).padStart(2, '0')}\n`;
    if (rsoList.length > 0) r += rsoList.map((s, i) => formatEntry(s, i)).join('\n\n') + '\n';
    r += '\n' + sep + '\n';

    // MC
    r += `\n*MC : ${String(mcList.length).padStart(2, '0')}\n`;
    if (mcList.length > 0) r += mcList.map((s, i) => formatEntry(s, i)).join('\n\n') + '\n';
    r += '\n' + sep + '\n';

    // Others
    r += `\nOTHERS: ${String(othersNum).padStart(2, '0')}\n`;
    r += '\n' + sep + '\n';

    // Statuses
    r += `\nSTATUSES: ${String(statusTotal).padStart(2, '0')}\n\n`;
    r += `PERMANENT STATUS: ${String(permanentNum).padStart(2, '0')}\n`;
    if (permanentList.length > 0) {
      r += permanentList.map((s, i) => {
        let line = `${i + 1}. ${formatRankName(s.personnel_rank, s.personnel_name)}`;
        const statusMatch = s.details?.match(/STATUS:\s*([^\n]+)/i);
        if (statusMatch) line += `\nSTATUS: ${statusMatch[1]}`;
        else if (s.symptoms) line += `\nSTATUS: ${s.symptoms}`;
        return line;
      }).join('\n\n') + '\n';
    }

    r += `\nTEMPORARY STATUS: ${String(temporaryNum).padStart(2, '0')}\n`;
    if (temporaryList.length > 0) {
      r += temporaryList.map((s, i) => {
        let line = `${i + 1}. ${formatRankName(s.personnel_rank, s.personnel_name)}`;
        const statusMatch = s.details?.match(/STATUS:\s*([^\n]+)/i);
        if (statusMatch) line += `\nSTATUS: ${statusMatch[1]}`;
        else if (s.symptoms) line += `\nSTATUS: ${s.symptoms}`;
        if (s.start_date && s.end_date) line += `\n${fmtDate(s.start_date)}-${fmtDate(s.end_date)}`;
        return line;
      }).join('\n\n') + '\n';
    }

    return r.trim();
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
    setPreviewing(false);
    toast.success('Parade state sent');
  };

  return (
    <div className="px-4 py-4 space-y-5 pb-24">
      {/* Last sent */}
      {lastParadeLog && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">Last sent</p>
            <p className="text-xs text-muted-foreground">
              By {lastParadeLog.performed_by?.split('@')[0]} · {format(parseISO(lastParadeLog.created_date), 'dd MMM, HHmm')}H
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
          {allStatuses.map((s) => (
            <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
              <Badge className={
                s.type === 'RSO' ? 'bg-destructive/10 text-destructive border-destructive/20 shrink-0' :
                s.type === 'MA' ? 'bg-primary/10 text-primary border-primary/20 shrink-0' :
                'bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0'
              }>{s.type}</Badge>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{formatRankName(s.personnel_rank, s.personnel_name)}</p>
                <p className="text-xs text-muted-foreground">{s.symptoms || '—'}</p>
                {s.diagnosis && <p className="text-xs text-primary font-mono mt-0.5">DX: {s.diagnosis}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual inputs */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Manual Counts</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Out of Camp', value: outOfCamp, set: setOutOfCamp },
            { label: 'Others', value: othersCount, set: setOthersCount },
            { label: 'Permanent Status', value: permanentStatusCount, set: setPermanentStatusCount },
            { label: 'Temporary Status', value: temporaryStatusCount, set: setTemporaryStatusCount },
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
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ParadeState() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const backPath = instructor ? '/admin' : '/';

  return (
    <div>
      <PageHeader
        title="Parade State"
        backTo={backPath}
        subtitle={instructor ? 'Unit status overview' : 'Generate & send'}
      />
      {instructor
        ? <InstructorParadeState user={user} />
        : <AdminParadeState user={user} />
      }
    </div>
  );
}