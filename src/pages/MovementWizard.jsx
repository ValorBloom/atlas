import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LOCATIONS, PURPOSES, TIME_REGEX, formatTime, formatRankName, getCurrentTimeSG, getGroupLabel } from '@/lib/constants';
import { MapPin, ArrowRight, Clock, Check, X, Search, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STEPS = ['Personnel', 'From', 'To', 'Purpose', 'Time', 'Confirm'];

export default function MovementWizard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Tab: 'report' or 'reached'
  const [tab, setTab] = useState('report');
  const [showActiveWarning, setShowActiveWarning] = useState(false);

  // --- REPORT STATE ---
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState([]); // array of user objects
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('All');
  const [data, setData] = useState({
    from_location: '',
    to_location: '',
    purpose: '',
    leave_time: '',
    custom_from: '',
    custom_to: '',
    custom_purpose: '',
  });

  // --- REACHED STATE ---
  const [selectedLog, setSelectedLog] = useState(null);
  const [reachedTime, setReachedTime] = useState('');
  const [reachedSaving, setReachedSaving] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users-unit', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: pendingLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['movement-pending', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter(
      { unit: user?.unit, status: 'departed' }, '-created_date', 30
    ),
    enabled: !!user?.unit,
  });

  // Check if current user has an active movement
  const myActiveLogs = pendingLogs.filter(l => l.personnel_id === user?.id);

  // Auto-select self on mount
  useEffect(() => {
    if (user && selectedPersonnel.length === 0) {
      setSelectedPersonnel([user]);
    }
  }, [user]);

  const groupLabel = getGroupLabel(user?.unit);
  const groupOptions = useMemo(() => {
    const groups = new Set(users.map(u => u.platoon).filter(Boolean));
    return ['All', ...Array.from(groups).sort()];
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchGroup = groupFilter === 'All' || u.platoon === groupFilter;
      const matchSearch = !search || 
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.rank?.toLowerCase().includes(search.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [users, groupFilter, search]);

  const togglePerson = (person) => {
    setSelectedPersonnel(prev =>
      prev.find(p => p.id === person.id)
        ? prev.filter(p => p.id !== person.id)
        : [...prev, person]
    );
  };

  const fromLoc = data.from_location === 'Other' ? data.custom_from : data.from_location;
  const toLoc = data.to_location === 'Other' ? data.custom_to : data.to_location;
  const purpose = data.purpose === 'Other' ? data.custom_purpose : data.purpose;

  const canNext = () => {
    switch (step) {
      case 0: return selectedPersonnel.length > 0;
      case 1: return fromLoc;
      case 2: return toLoc && fromLoc !== toLoc;
      case 3: return purpose;
      case 4: return TIME_REGEX.test(data.leave_time);
      default: return true;
    }
  };

  const reportLines = () => {
    const date = format(new Date(), 'dd/MM/yy');
    const numberedNames = selectedPersonnel
      .map((p, i) => `${i + 1}. ${formatRankName(p.rank || '', p.full_name || '')}`)
      .join('\n');
    return `${numberedNames}\n\nMOVEMENT FROM ${fromLoc.toUpperCase()} TO ${toLoc.toUpperCase()} FOR ${purpose.toUpperCase()} @${formatTime(data.leave_time)}\nDate: ${date}`;
  };

  const instructorNotificationMessage = () => {
    const numberedNames = selectedPersonnel
      .map((p, i) => `${i + 1}. ${formatRankName(p.rank || '', p.full_name || '')}`)
      .join('\n');
    return `Dear Instructors,\n\n${numberedNames}\n\nMOVEMENT FROM ${fromLoc.toUpperCase()} TO ${toLoc.toUpperCase()} FOR ${purpose.toUpperCase()} @${formatTime(data.leave_time)}`;
  };

  const handleSubmit = async () => {
    setSaving(true);
    const date = format(new Date(), 'yyyy-MM-dd');

    // Optimistic: show success and switch tab immediately
    toast.success(
      selectedPersonnel.length > 1
        ? `Movement reported for ${selectedPersonnel.length} personnel from ${fromLoc} to ${toLoc}.`
        : `Movement reported — ${formatRankName(selectedPersonnel[0].rank || '', selectedPersonnel[0].full_name || '')} departing ${fromLoc} to ${toLoc}.`
    );
    // Build optimistic log entries to show in reached tab right away
    const optimisticLogs = selectedPersonnel.map((person, idx) => ({
      id: `optimistic-${idx}`,
      personnel_name: person.full_name,
      personnel_rank: person.rank || '',
      personnel_id: person.id,
      from_location: fromLoc,
      to_location: toLoc,
      purpose: purpose,
      leave_time: data.leave_time,
      status: 'departed',
      unit: user?.unit,
      reported_by: user?.email,
      movement_date: date,
    }));
    queryClient.setQueryData(['movement-pending', user?.unit], prev =>
      [...(prev || []), ...optimisticLogs]
    );

    // Switch UI immediately
    setTab('reached');
    setStep(0);
    setData({ from_location: '', to_location: '', purpose: '', leave_time: '', custom_from: '', custom_to: '', custom_purpose: '' });
    setSelectedPersonnel([user]);

    // Persist in background
    const persistAll = async () => {
      for (const person of selectedPersonnel) {
        await base44.entities.MovementLog.create({
          personnel_name: person.full_name,
          personnel_rank: person.rank || '',
          personnel_id: person.id,
          from_location: fromLoc,
          to_location: toLoc,
          purpose: purpose,
          leave_time: data.leave_time,
          status: 'departed',
          unit: user?.unit,
          reported_by: user?.email,
          movement_date: date,
        });
      }
      await base44.entities.Notification.create({
        title: 'Movement Reported',
        message: instructorNotificationMessage(),
        type: 'info',
        category: 'movement',
        recipient_unit: user?.unit,
      });
      await base44.entities.AuditLog.create({
        action: 'movement_report',
        category: 'movement',
        details: reportLines(),
        performed_by: user?.email,
        unit: user?.unit,
      });
      setTimeout(async () => {
        await base44.entities.Notification.create({
          title: '⏱ Report Reached Time',
          message: `Reminder: ${selectedPersonnel.map(p => p.full_name).join(', ')} departed 20 mins ago. Please update reached time.`,
          type: 'warning',
          category: 'movement',
          recipient_unit: user?.unit,
        });
      }, 20 * 60 * 1000);
    };
    persistAll()
      .then(() => queryClient.invalidateQueries({ queryKey: ['movement-pending'] }))
      .finally(() => setSaving(false));
  };

  const handleReached = async () => {
    if (!selectedLog || !TIME_REGEX.test(reachedTime)) return;
    setReachedSaving(true);
    await base44.entities.MovementLog.update(selectedLog.id, {
      reached_time: reachedTime,
      status: 'reached',
    });
    await base44.entities.Notification.create({
      title: 'Reached Confirmed',
      message: `${formatRankName(selectedLog.personnel_rank, selectedLog.personnel_name)} reached ${selectedLog.to_location} at ${formatTime(reachedTime)}`,
      type: 'success',
      category: 'movement',
      recipient_unit: user?.unit,
    });
    setReachedSaving(false);
    toast.success('Reached recorded');
    setSelectedLog(null);
    setReachedTime('');
    queryClient.invalidateQueries({ queryKey: ['movement-pending'] });
  };

  const locOptions = [...LOCATIONS, 'Other'];
  const purposeOptions = [...PURPOSES, 'Other'];

  return (
    <div>
      <PageHeader title="Movement" backTo="/" />

      {/* Tabs */}
      <div className="flex border-b border-border mx-4 mt-1">
        <button
          onClick={() => setTab('report')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === 'report' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          Report Departure
        </button>
        <button
          onClick={() => { setTab('reached'); queryClient.invalidateQueries({ queryKey: ['movement-pending'] }); }}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
            tab === 'reached' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
          }`}
        >
          Update Reached
          {pendingLogs.length > 0 && tab !== 'reached' && (
            <span className="absolute top-1.5 right-3 w-4 h-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center">
              {pendingLogs.length}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 py-3">

        {/* ===== REPORT TAB ===== */}
        {tab === 'report' && (
          <>
            {/* Active movement warning banner */}
            {myActiveLogs.length > 0 && (
              <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-300">Active movement pending!</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    {myActiveLogs.map(l => `${l.to_location} (left ${formatTime(l.leave_time)})`).join(', ')} — remember to report reached time.
                  </p>
                  <button
                    onClick={() => setTab('reached')}
                    className="text-xs text-amber-300 underline underline-offset-2 mt-1"
                  >
                    Update reached →
                  </button>
                </div>
              </div>
            )}
            {/* Step indicator — compact dots + current label */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`rounded-full transition-all ${
                      i < step ? 'w-2 h-2 bg-primary' :
                      i === step ? 'w-3 h-3 bg-primary ring-2 ring-primary/30' :
                      'w-2 h-2 bg-border'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Step {step + 1} of {STEPS.length} — <span className="font-semibold text-foreground">{STEPS[step]}</span>
              </p>
            </div>

            {/* Step 0: Personnel (multi-select) */}
            {step === 0 && (
              <div className="space-y-3">
                {/* Selected chips */}
                {selectedPersonnel.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPersonnel.map(p => (
                      <div key={p.id} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium text-primary">
                        {formatRankName(p.rank || '', p.full_name || '')}
                        <button onClick={() => togglePerson(p)}><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name or rank..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>

                {/* Group filter */}
                {groupOptions.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {groupOptions.map(g => (
                      <button
                        key={g}
                        onClick={() => setGroupFilter(g)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                          groupFilter === g ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground bg-card'
                        }`}
                      >
                        {g === 'All' ? 'All' : `${groupLabel} ${g}`}
                      </button>
                    ))}
                  </div>
                )}

                {/* User list */}
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredUsers.map(u => {
                    const selected = selectedPersonnel.find(p => p.id === u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => togglePerson(u)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all flex items-center justify-between ${
                          selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/30'
                        }`}
                      >
                        <div>
                          <span className="font-medium">{formatRankName(u.rank || '', u.full_name || '')}</span>
                          {u.platoon && <span className="text-xs text-muted-foreground ml-2">{u.platoon}</span>}
                        </div>
                        {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{selectedPersonnel.length} selected</p>
              </div>
            )}

            {/* Step 1: From Location */}
            {step === 1 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">From Location</Label>
                <div className="space-y-1.5">
                  {locOptions.map(loc => (
                    <button
                      key={loc}
                      onClick={() => setData({ ...data, from_location: loc })}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                        data.from_location === loc
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                {data.from_location === 'Other' && (
                  <Input placeholder="Enter location" value={data.custom_from}
                    onChange={(e) => setData({ ...data, custom_from: e.target.value })} />
                )}
              </div>
            )}

            {/* Step 2: To Location */}
            {step === 2 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">To Location</Label>
                <div className="space-y-1.5">
                  {locOptions.filter(l => l !== data.from_location || l === 'Other').map(loc => (
                    <button
                      key={loc}
                      onClick={() => setData({ ...data, to_location: loc })}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                        data.to_location === loc
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
                {data.to_location === 'Other' && (
                  <Input placeholder="Enter location" value={data.custom_to}
                    onChange={(e) => setData({ ...data, custom_to: e.target.value })} />
                )}
              </div>
            )}

            {/* Step 3: Purpose */}
            {step === 3 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Purpose</Label>
                <div className="space-y-1.5">
                  {purposeOptions.map(p => (
                    <button
                      key={p}
                      onClick={() => setData({ ...data, purpose: p })}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                        data.purpose === p
                          ? 'border-primary bg-primary/5 font-medium'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {data.purpose === 'Other' && (
                  <Input placeholder="Enter purpose" value={data.custom_purpose}
                    onChange={(e) => setData({ ...data, custom_purpose: e.target.value })} />
                )}
              </div>
            )}

            {/* Step 4: Time */}
            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Leave Time (HHmm)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="e.g. 0830"
                    maxLength={4}
                    value={data.leave_time}
                    onChange={(e) => setData({ ...data, leave_time: e.target.value.replace(/\D/g, '') })}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                  <Button variant="outline" size="sm"
                    onClick={() => setData({ ...data, leave_time: getCurrentTimeSG() })}>
                    <Clock className="h-3.5 w-3.5 mr-1" />Now
                  </Button>
                </div>
                {data.leave_time && !TIME_REGEX.test(data.leave_time) && (
                  <p className="text-xs text-destructive">Enter a valid time (e.g. 0830)</p>
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
                      {reportLines()}
                    </pre>
                  </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground text-center">Verify all details before submitting.</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-5">
              {step > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Back</Button>
              )}
              {step < 5 ? (
                <Button className="flex-1" onClick={() => setStep(step + 1)} disabled={!canNext()}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
                  <Check className="h-4 w-4 mr-1" />
                  {saving ? 'Submitting...' : 'Submit'}
                </Button>
              )}
            </div>
          </>
        )}

        {/* ===== REACHED TAB ===== */}
        {tab === 'reached' && (
          <div className="space-y-4">
            {logsLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : pendingLogs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No pending movements.</p>
              </div>
            ) : (() => {
              // Group logs by same trip (from → to, same leave_time, same reported_by)
              const groups = [];
              const assigned = new Set();
              pendingLogs.forEach(log => {
                if (assigned.has(log.id)) return;
                const group = pendingLogs.filter(l =>
                  l.from_location === log.from_location &&
                  l.to_location === log.to_location &&
                  l.leave_time === log.leave_time &&
                  l.reported_by === log.reported_by
                );
                group.forEach(l => assigned.add(l.id));
                groups.push(group);
              });

              return (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Pending Movements <span className="text-muted-foreground font-normal">({pendingLogs.length} personnel)</span>
                  </p>
                  <div className="space-y-2">
                    {groups.map((group, gi) => {
                      const rep = group[0];
                      const isGroupSelected = selectedLog?.id === rep.id;
                      return (
                        <div key={gi} className="border border-border rounded-xl overflow-hidden">
                          <button
                            onClick={() => {
                              setSelectedLog(isGroupSelected ? null : rep);
                              setReachedTime('');
                            }}
                            className={`w-full text-left p-3 text-sm transition-all flex items-center justify-between ${
                              isGroupSelected ? 'bg-primary/5' : 'bg-card hover:bg-muted/30'
                            }`}
                          >
                            <div className="min-w-0">
                              {group.length === 1 ? (
                                <p className="font-medium">{formatRankName(rep.personnel_rank, rep.personnel_name)}</p>
                              ) : (
                                <div>
                                  <p className="font-medium">{group.length} personnel</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {group.map(l => l.personnel_name?.split(' ').slice(-1)[0]).join(', ')}
                                  </p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {rep.from_location} → {rep.to_location} · Left {formatTime(rep.leave_time)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {group.length > 1 && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 rounded-full px-2 py-0.5">
                                  {group.length}
                                </span>
                              )}
                              {isGroupSelected ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </button>

                          {isGroupSelected && (
                            <div className="px-3 pb-3 pt-2 border-t border-border space-y-3 bg-card">
                              {group.length > 1 && (
                                <div className="space-y-1">
                                  {group.map(l => (
                                    <p key={l.id} className="text-xs text-muted-foreground">· {formatRankName(l.personnel_rank, l.personnel_name)}</p>
                                  ))}
                                </div>
                              )}
                              <Label className="text-xs font-medium text-muted-foreground">Reached Time (HHmm)</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="e.g. 0900"
                                  maxLength={4}
                                  value={reachedTime}
                                  onChange={e => setReachedTime(e.target.value.replace(/\D/g, ''))}
                                  className="text-center font-mono tracking-wider"
                                />
                                <Button variant="outline" size="sm" onClick={() => setReachedTime(getCurrentTimeSG())}>
                                  <Clock className="h-3.5 w-3.5 mr-1" />Now
                                </Button>
                              </div>
                              <Button
                                className="w-full"
                                size="sm"
                                onClick={() => {
                                  if (!TIME_REGEX.test(reachedTime)) return;
                                  setReachedSaving(true);
                                  // Optimistic: remove group from displayed list immediately
                                  const groupIds = new Set(group.map(l => l.id));
                                  queryClient.setQueryData(['movement-pending', user?.unit], prev =>
                                    (prev || []).filter(l => !groupIds.has(l.id))
                                  );
                                  toast.success(
                                   group.length > 1
                                     ? `${group.length} personnel confirmed reached ${rep.to_location} at ${formatTime(reachedTime)}.`
                                     : `${formatRankName(rep.personnel_rank, rep.personnel_name)} confirmed reached ${rep.to_location} at ${formatTime(reachedTime)}.`
                                  );
                                  setSelectedLog(null);
                                  setReachedTime('');
                                  // Persist in background
                                  Promise.all(group.map(l =>
                                    base44.entities.MovementLog.update(l.id, { reached_time: reachedTime, status: 'reached' })
                                  )).then(() => base44.entities.Notification.create({
                                    title: 'Reached Confirmed',
                                    message: group.length === 1
                                      ? `${formatRankName(rep.personnel_rank, rep.personnel_name)} reached ${rep.to_location} at ${formatTime(reachedTime)}`
                                      : `${group.length} personnel reached ${rep.to_location} at ${formatTime(reachedTime)}`,
                                    type: 'success',
                                    category: 'movement',
                                    recipient_unit: user?.unit,
                                  })).then(() =>
                                    queryClient.invalidateQueries({ queryKey: ['movement-pending'] })
                                  ).finally(() => setReachedSaving(false));
                                }}
                                disabled={!TIME_REGEX.test(reachedTime) || reachedSaving}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                {reachedSaving ? 'Saving...' : group.length > 1 ? `Confirm All ${group.length} Reached` : 'Confirm Reached'}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}