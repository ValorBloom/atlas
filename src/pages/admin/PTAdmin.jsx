import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TIME_REGEX, formatTime, formatRankName } from '@/lib/constants';
import { Activity, Clock, Check, XCircle, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PTAdmin() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [instructor, setInstructor] = useState('');
  const [salutation, setSalutation] = useState('');

  const { data: activeWindows = [] } = useQuery({
    queryKey: ['sft-windows-active', user?.unit],
    queryFn: () => base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['sft-submissions', user?.unit],
    queryFn: async () => {
      if (activeWindows.length === 0) return [];
      return base44.entities.SFTSubmission.filter({ window_id: activeWindows[0].id, status: 'active' });
    },
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
    toast.success('SFT window created');
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

  // Group submissions by activity for report generation
  const groupedSubmissions = submissions.reduce((acc, sub) => {
    if (!acc[sub.activity]) acc[sub.activity] = [];
    acc[sub.activity].push(sub);
    return acc;
  }, {});

  const invalidGroups = Object.entries(groupedSubmissions).filter(([_, subs]) => subs.length < 2);

  const generateReport = () => {
    if (invalidGroups.length > 0) return null;
    let report = `📋 SFT SUMMARY REPORT\n`;
    report += `Date: ${format(new Date(), 'dd MMM yyyy').toUpperCase()}\n`;
    report += `Window: ${activeWindow?.start_time}h – ${activeWindow?.end_time}h\n`;
    if (instructor) report += `Instructor: ${instructor}\n`;
    if (salutation) report += `Salutation: ${salutation}\n`;
    report += `\n`;
    Object.entries(groupedSubmissions).forEach(([activity, subs]) => {
      report += `${activity} (${subs.length})\n`;
      subs.forEach(s => {
        report += `  - ${formatRankName(s.cadet_rank, s.cadet_name)} [${s.time_range}] @ ${s.location}\n`;
      });
      report += `\n`;
    });
    report += `Total: ${submissions.length} participants`;
    return report;
  };

  return (
    <div>
      <PageHeader title="PT Admin" backTo="/admin" subtitle="SFT controls" />
      <div className="px-4 py-4 space-y-5">
        {/* Active Window */}
        {activeWindow ? (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Active Window
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{formatTime(activeWindow.start_time)} – {formatTime(activeWindow.end_time)}</p>
              <p className="text-xs text-muted-foreground">{submissions.length} submissions</p>
              <Button variant="destructive" size="sm" onClick={handleCloseWindow}>
                <XCircle className="h-3.5 w-3.5 mr-1" />Close Window
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Set SFT Window</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Start Time</Label>
                  <Input placeholder="0600" maxLength={4} value={startTime}
                    onChange={(e) => setStartTime(e.target.value.replace(/\D/g, ''))}
                    className="font-mono text-center" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Time</Label>
                  <Input placeholder="0700" maxLength={4} value={endTime}
                    onChange={(e) => setEndTime(e.target.value.replace(/\D/g, ''))}
                    className="font-mono text-center" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Instructor</Label>
                <Select value={instructor} onValueChange={setInstructor}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <Check className="h-4 w-4 mr-1" />{saving ? 'Creating...' : 'Open SFT Window'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Submissions */}
        {activeWindow && submissions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submissions ({submissions.length})</h2>
            {invalidGroups.length > 0 && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {invalidGroups.map(([a]) => a).join(', ')} need at least 2 participants each.
                </AlertDescription>
              </Alert>
            )}
            {submissions.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-sm">
                <div>
                  <p className="font-medium">{formatRankName(sub.cadet_rank, sub.cadet_name)}</p>
                  <p className="text-xs text-muted-foreground">{sub.activity} • {sub.time_range}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveSubmission(sub.id)}>
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Generate Report */}
        {activeWindow && submissions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SFT Report</h2>
            {invalidGroups.length > 0 ? (
              <p className="text-xs text-destructive">Cannot generate report — some activity groups have fewer than 2 participants.</p>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{generateReport()}</pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}