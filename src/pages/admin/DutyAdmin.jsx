import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  isCadetAdmin, isInstructor, getDutyTypes, getDutyPoints,
  DUTY_COLORS, DUTY_POINTS, formatRankName
} from '@/lib/constants';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Check, X,
  Search, Shield, Trophy, Users, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isWeekend, parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';

// Wizard steps
const STEPS = ['Date', 'Duty Type', 'Personnel', 'Confirm'];

function DutyBadge({ type }) {
  const c = DUTY_COLORS[type] || DUTY_COLORS.CDO;
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0', c.bg, c.text, c.border)}>
      {type}
    </span>
  );
}

export default function DutyAdmin() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const canManage = isCadetAdmin(user) || isInstructor(user);

  const [tab, setTab] = useState('assign'); // 'assign' | 'roster'
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [step, setStep] = useState(0);
  const [dutyType, setDutyType] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState([]);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const dutyTypes = getDutyTypes(user?.unit);

  const { data: duties = [] } = useQuery({
    queryKey: ['duties', user?.unit],
    queryFn: () => base44.entities.DutyRoster.filter({ unit: user?.unit }, 'date', 300),
    enabled: !!user?.unit,
  });

  const { data: unitUsers = [] } = useQuery({
    queryKey: ['unit-users', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const eligiblePersonnel = unitUsers.filter(u => u.role === 'cadet' || u.role === 'cadet_admin');

  const filteredPersonnel = useMemo(() =>
    eligiblePersonnel.filter(u =>
      !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.rank?.toLowerCase().includes(search.toLowerCase())
    ),
    [eligiblePersonnel, search]
  );

  const monthDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const dutiesForDay = (day) =>
    duties.filter(d => d.date === format(day, 'yyyy-MM-dd'));

  const selectedDayDuties = dutiesForDay(selectedDay);

  // Check for duplicate
  const isDuplicate = (personnelId, type, date) =>
    duties.some(d =>
      d.personnel_id === personnelId &&
      d.duty_type === type &&
      d.date === date
    );

  const resetWizard = () => {
    setStep(0);
    setDutyType('');
    setSelectedPersonnel([]);
    setNotes('');
    setSearch('');
  };

  const handleConfirmAssign = async () => {
    if (!selectedDay || !dutyType || selectedPersonnel.length === 0) return;
    setSaving(true);

    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    const weekend = isWeekend(selectedDay);
    const pts = getDutyPoints(dutyType, weekend);

    let assigned = 0;
    let skipped = 0;

    for (const person of selectedPersonnel) {
      if (isDuplicate(person.id, dutyType, dateStr)) {
        skipped++;
        continue;
      }

      // Create duty record
      const duty = await base44.entities.DutyRoster.create({
        date: dateStr,
        duty_type: dutyType,
        personnel_name: person.full_name,
        personnel_rank: person.rank || '',
        personnel_id: person.id,
        unit: user?.unit,
        notes,
        is_weekend: weekend,
        points_awarded: pts,
        assigned_by: user?.email,
      });

      // Create point log
      const reason = `Duty: ${dutyType} on ${dateStr}${weekend ? ' (Weekend)' : ''}`;
      const pointLog = await base44.entities.PointLog.create({
        user_id: person.id,
        user_name: person.full_name,
        user_rank: person.rank || '',
        delta: pts,
        reason,
        unit: user?.unit,
        action_by: user?.email,
      });

      // Link point log to duty record
      if (duty?.id && pointLog?.id) {
        await base44.entities.DutyRoster.update(duty.id, { point_log_id: pointLog.id });
      }

      // Audit log
      await base44.entities.AuditLog.create({
        action: 'duty_assigned',
        category: 'admin',
        details: `${dutyType} on ${dateStr} assigned to ${formatRankName(person.rank, person.full_name)} (+${pts} pts)`,
        performed_by: user?.email,
        unit: user?.unit,
      });

      // Notify cadet
      await base44.entities.Notification.create({
        title: 'Duty Assigned',
        message: `You have been assigned ${dutyType} duty on ${dateStr}. Points awarded: +${pts}`,
        type: 'info',
        category: 'admin',
        recipient_email: person.email,
      });

      assigned++;
    }

    setSaving(false);
    qc.invalidateQueries({ queryKey: ['duties'] });
    qc.invalidateQueries({ queryKey: ['point-logs'] });
    qc.invalidateQueries({ queryKey: ['point-logs-all'] });

    if (assigned > 0) toast.success(`${assigned} duty assignment${assigned > 1 ? 's' : ''} saved (+${getDutyPoints(dutyType, weekend)} pts each)`);
    if (skipped > 0) toast.warning(`${skipped} skipped — duplicate assignment`);

    resetWizard();
    setTab('roster');
  };

  const handleDelete = async (duty) => {
    // Remove point log if linked
    if (duty.point_log_id) {
      try { await base44.entities.PointLog.delete(duty.point_log_id); } catch {}
    }
    await base44.entities.DutyRoster.delete(duty.id);
    qc.invalidateQueries({ queryKey: ['duties'] });
    qc.invalidateQueries({ queryKey: ['point-logs'] });
    qc.invalidateQueries({ queryKey: ['point-logs-all'] });
    toast.success('Duty removed and points voided');
  };

  const togglePerson = (person) => {
    setSelectedPersonnel(prev =>
      prev.find(p => p.id === person.id)
        ? prev.filter(p => p.id !== person.id)
        : [...prev, person]
    );
  };

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Duty Admin" backTo="/actions/duty" />
        <div className="px-4 py-16 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  const dateStr = format(selectedDay, 'yyyy-MM-dd');
  const weekend = isWeekend(selectedDay);
  const pts = dutyType ? getDutyPoints(dutyType, weekend) : 0;

  return (
    <div className="pb-24">
      <PageHeader title="Duty Admin" subtitle={user?.unit} backTo="/actions/duty" />

      {/* Tabs */}
      <div className="flex border-b border-border mx-4 mt-1">
        {['assign', 'roster'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'assign') resetWizard(); }}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            )}
          >
            {t === 'assign' ? 'Assign Duty' : 'View Roster'}
          </button>
        ))}
      </div>

      {/* ── ASSIGN TAB (Wizard) ── */}
      {tab === 'assign' && (
        <div className="px-4 pt-4 space-y-4">
          {/* Step indicator */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div key={s} className={cn(
                  'rounded-full transition-all',
                  i < step ? 'w-2 h-2 bg-primary' :
                  i === step ? 'w-3 h-3 bg-primary ring-2 ring-primary/30' :
                  'w-2 h-2 bg-border'
                )} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {STEPS.length} — <span className="font-semibold text-foreground">{STEPS[step]}</span>
            </p>
          </div>

          {/* Step 0: Date */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-semibold">{format(viewMonth, 'MMMM yyyy')}</p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: monthDays[0].getDay() }).map((_, i) => <div key={`e-${i}`} />)}
                {monthDays.map(day => {
                  const isSelected = isSameDay(day, selectedDay);
                  const isToday = isSameDay(day, new Date());
                  const count = dutiesForDay(day).length;
                  return (
                    <button
                      key={day.toString()}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        'relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all',
                        isSelected ? 'bg-primary text-primary-foreground' :
                        isToday ? 'bg-primary/15 text-primary' :
                        isWeekend(day) ? 'bg-muted/30 text-muted-foreground' :
                        'hover:bg-muted/40 text-foreground'
                      )}
                    >
                      <span>{format(day, 'd')}</span>
                      {count > 0 && (
                        <div className={cn('w-1.5 h-1.5 rounded-full mt-0.5', isSelected ? 'bg-primary-foreground/60' : 'bg-primary/40')} />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <p className="text-sm font-semibold">{format(selectedDay, 'EEEE, dd MMM yyyy')}</p>
                {weekend && <p className="text-xs text-amber-400 mt-0.5">Weekend — higher points apply</p>}
                {dutiesForDay(selectedDay).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{dutiesForDay(selectedDay).length} duties already assigned</p>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Duty Type */}
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Select duty type for <span className="font-semibold text-foreground">{format(selectedDay, 'dd MMM yyyy')}</span></p>
              {dutyTypes.map(type => {
                const c = DUTY_COLORS[type] || DUTY_COLORS.CDO;
                const { weekday, weekend: wknd } = DUTY_POINTS[type] || { weekday: 0, weekend: 0 };
                return (
                  <button
                    key={type}
                    onClick={() => setDutyType(type)}
                    className={cn(
                      'w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between',
                      dutyType === type ? `${c.bg} ${c.border} ring-1 ring-primary/30` : 'border-border bg-card hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <DutyBadge type={type} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{type}</p>
                        <p className="text-xs text-muted-foreground">
                          Weekday: +{weekday} pts · Weekend: +{wknd} pts
                        </p>
                      </div>
                    </div>
                    {dutyType === type && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Personnel */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Select cadets for <span className="font-semibold text-foreground">{dutyType}</span> on <span className="font-semibold text-foreground">{format(selectedDay, 'dd MMM')}</span>
              </p>

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

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search name or rank..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 text-sm" />
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredPersonnel.map(u => {
                  const sel = selectedPersonnel.find(p => p.id === u.id);
                  const dup = isDuplicate(u.id, dutyType, dateStr);
                  return (
                    <button
                      key={u.id}
                      onClick={() => !dup && togglePerson(u)}
                      disabled={dup}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all flex items-center justify-between',
                        dup ? 'opacity-40 cursor-not-allowed border-border bg-muted/20' :
                        sel ? 'border-primary bg-primary/5' :
                        'border-border bg-card hover:bg-muted/30'
                      )}
                    >
                      <div>
                        <p className="font-medium">{formatRankName(u.rank || '', u.full_name || '')}</p>
                        {dup && <p className="text-[10px] text-muted-foreground">Already assigned this duty</p>}
                      </div>
                      {sel && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{selectedPersonnel.length} selected</p>

              <Input
                placeholder="Notes (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="text-sm"
              />
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest">Assignment Preview</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-3">
                      <span className="text-muted-foreground w-20 shrink-0">Date</span>
                      <span className="font-semibold">{format(selectedDay, 'EEEE, dd MMM yyyy')}{weekend && <span className="ml-2 text-[10px] text-amber-400 font-bold">WEEKEND</span>}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-muted-foreground w-20 shrink-0">Duty</span>
                      <DutyBadge type={dutyType} />
                    </div>
                    <div className="flex gap-3 items-start">
                      <span className="text-muted-foreground w-20 shrink-0">Personnel</span>
                      <div className="space-y-0.5">
                        {selectedPersonnel.map(p => (
                          <p key={p.id} className="font-medium">{formatRankName(p.rank, p.full_name)}</p>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-muted-foreground w-20 shrink-0">Points</span>
                      <span className="font-bold text-amber-400">+{pts} pts each</span>
                    </div>
                    {notes && (
                      <div className="flex gap-3">
                        <span className="text-muted-foreground w-20 shrink-0">Notes</span>
                        <span>{notes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground text-center">
                This will assign duty and award {pts} points to each cadet selected.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-2">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            {step < 3 ? (
              <Button
                className="flex-1"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !dutyType) ||
                  (step === 2 && selectedPersonnel.length === 0)
                }
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleConfirmAssign} disabled={saving}>
                <Check className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Confirm & Assign'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── ROSTER TAB ── */}
      {tab === 'roster' && (
        <div className="px-4 pt-3 space-y-4">
          {/* Calendar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-semibold">{format(viewMonth, 'MMMM yyyy')}</p>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: monthDays[0].getDay() }).map((_, i) => <div key={`e-${i}`} />)}
              {monthDays.map(day => {
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, new Date());
                const count = dutiesForDay(day).length;
                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      'relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all',
                      isSelected ? 'bg-primary text-primary-foreground' :
                      isToday ? 'bg-primary/15 text-primary' :
                      isWeekend(day) ? 'bg-muted/30 text-muted-foreground' :
                      'hover:bg-muted/40 text-foreground'
                    )}
                  >
                    <span>{format(day, 'd')}</span>
                    {count > 0 && (
                      <div className={cn('w-1.5 h-1.5 rounded-full mt-0.5', isSelected ? 'bg-primary-foreground/60' : 'bg-primary/50')} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day roster */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {format(selectedDay, 'EEEE, dd MMM yyyy')}
                {isWeekend(selectedDay) && (
                  <span className="ml-2 text-[10px] font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-full">WEEKEND</span>
                )}
              </p>
              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => { setTab('assign'); setStep(1); }}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            {selectedDayDuties.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No duties assigned.</p>
            ) : (
              selectedDayDuties.map(d => {
                const c = DUTY_COLORS[d.duty_type] || DUTY_COLORS.CDO;
                return (
                  <div key={d.id} className={cn('flex items-center gap-3 p-3 rounded-xl border', c.bg, c.border)}>
                    <DutyBadge type={d.duty_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{formatRankName(d.personnel_rank, d.personnel_name)}</p>
                      {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.points_awarded > 0 && (
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-400">+{d.points_awarded}</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(d)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Points summary for this month */}
          {duties.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                Duty Points This Month
              </p>
              {(() => {
                const month = format(viewMonth, 'yyyy-MM');
                const monthDuties = duties.filter(d => d.date.startsWith(month));
                const byPerson = {};
                monthDuties.forEach(d => {
                  const k = d.personnel_id || d.personnel_name;
                  if (!byPerson[k]) byPerson[k] = { name: d.personnel_name, rank: d.personnel_rank || '', pts: 0, count: 0 };
                  byPerson[k].pts += (d.points_awarded || 0);
                  byPerson[k].count++;
                });
                const sorted = Object.values(byPerson).sort((a, b) => b.pts - a.pts);
                return sorted.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No duties this month.</p>
                ) : sorted.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 px-1">
                    <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <p className="text-sm font-medium flex-1 truncate">{formatRankName(entry.rank, entry.name)}</p>
                    <span className="text-xs text-muted-foreground">{entry.count}×</span>
                    <span className="text-sm font-bold text-amber-400">{entry.pts} pts</span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}