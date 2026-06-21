import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isCadetAdmin, isInstructor, formatRankName } from '@/lib/constants';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Check, X,
  Search, Shield, Settings, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';

// Default duty types if none configured
const DEFAULT_DUTY_TYPES = [
  { name: 'Guard Duty',  weekday_pts: 0, weekend_pts: 0, color: 'red'    },
  { name: 'CDO',         weekday_pts: 0, weekend_pts: 0, color: 'blue'   },
  { name: 'CDS',         weekday_pts: 0, weekend_pts: 0, color: 'green'  },
  { name: 'Store Team',  weekday_pts: 0, weekend_pts: 0, color: 'violet' },
];

const COLOR_OPTIONS = ['blue','green','amber','red','violet','orange','cyan','pink','teal','indigo','rose','sky'];
const COLOR_CLASSES = {
  blue:   { bg: 'bg-primary/10',      text: 'text-primary',       border: 'border-primary/25'        },
  green:  { bg: 'bg-green-500/10',    text: 'text-green-400',     border: 'border-green-500/25'      },
  amber:  { bg: 'bg-amber-500/10',    text: 'text-amber-400',     border: 'border-amber-500/25'      },
  red:    { bg: 'bg-destructive/10',  text: 'text-destructive',   border: 'border-destructive/25'    },
  violet: { bg: 'bg-violet-500/10',   text: 'text-violet-400',    border: 'border-violet-500/25'     },
  orange: { bg: 'bg-orange-500/10',   text: 'text-orange-400',    border: 'border-orange-500/25'     },
  cyan:   { bg: 'bg-cyan-500/10',     text: 'text-cyan-400',      border: 'border-cyan-500/25'       },
  pink:   { bg: 'bg-pink-500/10',     text: 'text-pink-400',      border: 'border-pink-500/25'       },
  teal:   { bg: 'bg-teal-500/10',     text: 'text-teal-400',      border: 'border-teal-500/25'       },
  indigo: { bg: 'bg-indigo-500/10',   text: 'text-indigo-400',    border: 'border-indigo-500/25'     },
  rose:   { bg: 'bg-rose-500/10',     text: 'text-rose-400',      border: 'border-rose-500/25'       },
  sky:    { bg: 'bg-sky-500/10',      text: 'text-sky-400',       border: 'border-sky-500/25'        },
};

function DutyBadge({ type, color }) {
  const c = COLOR_CLASSES[color] || COLOR_CLASSES.blue;
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

  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  // Assign panel state
  const [showAssign, setShowAssign] = useState(false);
  const [assignDutyType, setAssignDutyType] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState([]);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [editingTypes, setEditingTypes] = useState(null); // local copy of duty_types being edited
  const [savingConfig, setSavingConfig] = useState(false);

  // Fetch duties
  const { data: duties = [] } = useQuery({
    queryKey: ['duties', user?.unit],
    queryFn: () => base44.entities.DutyRoster.filter({ unit: user?.unit }, 'date', 300),
    enabled: !!user?.unit,
  });

  // Fetch config
  const { data: configRecord } = useQuery({
    queryKey: ['duty-config', user?.unit],
    queryFn: () => base44.entities.DutyConfig.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
    select: data => data?.[0],
  });

  const dutyTypeConfigs = configRecord?.duty_types?.length ? configRecord.duty_types : DEFAULT_DUTY_TYPES;

  // Fetch unit users
  const { data: unitUsers = [] } = useQuery({
    queryKey: ['unit-users', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const eligiblePersonnel = unitUsers.filter(u => {
    const role = u.user_role || u.role;
    return role !== 'instructor';
  });
  const filteredPersonnel = useMemo(() =>
    eligiblePersonnel.filter(u =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
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

  const isDuplicate = (personnelId, type, date) =>
    duties.some(d => d.personnel_id === personnelId && d.duty_type === type && d.date === date);

  const togglePerson = (person) => {
    setSelectedPersonnel(prev =>
      prev.find(p => p.id === person.id) ? prev.filter(p => p.id !== person.id) : [...prev, person]
    );
  };

  const openAssign = () => {
    setAssignDutyType('');
    setSelectedPersonnel([]);
    setNotes('');
    setSearch('');
    setShowAssign(true);
  };

  const handleAssign = async () => {
    if (!assignDutyType || selectedPersonnel.length === 0) return;
    setSaving(true);
    const dateStr = format(selectedDay, 'yyyy-MM-dd');
    const weekend = isWeekend(selectedDay);
    let assigned = 0, skipped = 0;

    try {
      const toAssign = selectedPersonnel.filter(p => !isDuplicate(p.id, assignDutyType, dateStr));
      skipped = selectedPersonnel.length - toAssign.length;

      await Promise.all(toAssign.map(async (person) => {
        await base44.entities.DutyRoster.create({
          date: dateStr,
          duty_type: assignDutyType,
          personnel_name: person.full_name,
          personnel_rank: person.rank || '',
          personnel_id: person.id,
          unit: user?.unit,
          notes,
          is_weekend: weekend,
          assigned_by: user?.email,
        });
        try {
          await base44.entities.Notification.create({
            title: 'Duty Assigned',
            message: `You have been assigned ${assignDutyType} duty on ${dateStr}.`,
            type: 'info',
            category: 'admin',
            recipient_email: person.email,
            recipient_unit: user?.unit,
          });
        } catch (_) { /* notifications are best-effort */ }
        assigned++;
      }));

      qc.invalidateQueries({ queryKey: ['duties'] });
      if (assigned > 0) toast.success(`${assigned} duty assignment${assigned > 1 ? 's' : ''} saved`);
      if (skipped > 0) toast.warning(`${skipped} skipped — duplicate`);
      setShowAssign(false);
    } catch (err) {
      toast.error('Failed to save assignments. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (duty) => {
    await base44.entities.DutyRoster.delete(duty.id);
    qc.invalidateQueries({ queryKey: ['duties'] });
    toast.success('Duty removed');
  };

  // ── Settings handlers ──
  const openSettings = () => {
    setEditingTypes(dutyTypeConfigs.map(d => ({ ...d })));
    setShowSettings(true);
  };

  const saveSettings = async () => {
    setSavingConfig(true);
    if (configRecord?.id) {
      await base44.entities.DutyConfig.update(configRecord.id, { duty_types: editingTypes });
    } else {
      await base44.entities.DutyConfig.create({ unit: user?.unit, duty_types: editingTypes });
    }
    qc.invalidateQueries({ queryKey: ['duty-config'] });
    setSavingConfig(false);
    setShowSettings(false);
    toast.success('Duty settings saved');
  };

  const updateEditType = (i, field, value) => {
    setEditingTypes(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  const addEditType = () => {
    setEditingTypes(prev => [...prev, { name: '', weekday_pts: 0, weekend_pts: 0, color: 'blue' }]);
  };

  const removeEditType = (i) => {
    setEditingTypes(prev => prev.filter((_, idx) => idx !== i));
  };

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Duty Admin" backTo="/admin" />
        <div className="px-4 py-16 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  const dateStr = format(selectedDay, 'yyyy-MM-dd');
  const weekend = isWeekend(selectedDay);

  return (
    <div className="pb-24">
      <PageHeader
        title="Duty Admin"
        subtitle={user?.unit}
        backTo="/admin"
        rightAction={
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openSettings}>
            <Settings className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 pt-3 space-y-4">

        {/* ── Settings Panel (collapsible) ── */}
        {showSettings && editingTypes && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Duty Types & Points</p>
              <button onClick={() => setShowSettings(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Configure duty types and their point values for your unit.</p>

            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_50px_50px_60px_24px] gap-1.5 px-0.5">
                <p className="text-[10px] text-muted-foreground font-semibold">Duty Type</p>
                <p className="text-[10px] text-muted-foreground font-semibold text-center">WD pts</p>
                <p className="text-[10px] text-muted-foreground font-semibold text-center">WE pts</p>
                <p className="text-[10px] text-muted-foreground font-semibold text-center">Colour</p>
                <div />
              </div>

              {editingTypes.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_50px_50px_60px_24px] gap-1.5 items-center">
                  <Input
                    value={t.name}
                    onChange={e => updateEditType(i, 'name', e.target.value)}
                    placeholder="Name"
                    className="h-8 text-xs px-2"
                  />
                  <Input
                    type="number"
                    value={t.weekday_pts}
                    onChange={e => updateEditType(i, 'weekday_pts', Number(e.target.value))}
                    className="h-8 text-xs px-2 text-center"
                    min="0"
                  />
                  <Input
                    type="number"
                    value={t.weekend_pts}
                    onChange={e => updateEditType(i, 'weekend_pts', Number(e.target.value))}
                    className="h-8 text-xs px-2 text-center"
                    min="0"
                  />
                  <select
                    value={t.color}
                    onChange={e => updateEditType(i, 'color', e.target.value)}
                    className="h-8 rounded-md border border-input bg-background text-xs px-1 w-full"
                  >
                    {COLOR_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => removeEditType(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addEditType}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add duty type
            </button>

            <Button className="w-full h-8 text-xs" onClick={saveSettings} disabled={savingConfig}>
              <Check className="h-3.5 w-3.5 mr-1" />
              {savingConfig ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        )}

        {/* ── Calendar ── */}
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
                onClick={() => { setSelectedDay(day); setShowAssign(false); }}
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

        {/* ── Selected day roster ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {format(selectedDay, 'EEE, dd MMM')}
              {weekend && <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-full font-semibold">WKD</span>}
            </p>
            {!showAssign && (
              <Button size="sm" className="h-8 text-xs gap-1" onClick={openAssign}>
                <Plus className="h-3.5 w-3.5" /> Assign
              </Button>
            )}
          </div>

          {selectedDayDuties.length === 0 && !showAssign && (
            <p className="text-sm text-muted-foreground text-center py-4">No duties — tap Assign to add.</p>
          )}

          {selectedDayDuties.map(d => {
            const cfg = dutyTypeConfigs.find(c => c.name === d.duty_type);
            return (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <DutyBadge type={d.duty_type} color={cfg?.color} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{formatRankName(d.personnel_rank, d.personnel_name)}</p>
                  {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(d)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Inline Assign Panel ── */}
        {showAssign && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Assign Duty — {format(selectedDay, 'dd MMM')}</p>
              <button onClick={() => setShowAssign(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>

            {/* Duty type selector */}
            <div className="flex flex-wrap gap-1.5">
              {dutyTypeConfigs.map(dt => (
                <button
                  key={dt.name}
                  onClick={() => setAssignDutyType(dt.name)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                    assignDutyType === dt.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  {dt.name}
                </button>
              ))}
            </div>

            {/* Personnel search + list */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search personnel..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>

            {selectedPersonnel.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedPersonnel.map(p => (
                  <div key={p.id} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-lg text-xs font-medium text-primary">
                    {p.full_name?.split(' ').slice(-1)[0]}
                    <button onClick={() => togglePerson(p)}><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredPersonnel.map(u => {
                const sel = selectedPersonnel.find(p => p.id === u.id);
                const dup = assignDutyType ? isDuplicate(u.id, assignDutyType, dateStr) : false;
                return (
                  <button
                    key={u.id}
                    onClick={() => !dup && togglePerson(u)}
                    disabled={dup}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg border text-sm transition-all flex items-center justify-between',
                      dup ? 'opacity-40 cursor-not-allowed border-border bg-muted/20' :
                      sel ? 'border-primary bg-primary/5' :
                      'border-border bg-card hover:bg-muted/30'
                    )}
                  >
                    <span className="font-medium">{formatRankName(u.rank || '', u.full_name || '')}</span>
                    {sel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    {dup && <span className="text-[10px] text-muted-foreground">Already assigned</span>}
                  </button>
                );
              })}
            </div>

            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm h-9"
            />

            <Button
              className="w-full h-9"
              onClick={handleAssign}
              disabled={saving || !assignDutyType || selectedPersonnel.length === 0}
            >
              <Check className="h-4 w-4 mr-1.5" />
              {saving ? 'Saving...' : `Assign to ${selectedPersonnel.length || '...'} person${selectedPersonnel.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}