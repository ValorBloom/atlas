import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isCadetAdmin, isInstructor } from '@/lib/constants';
import { Plus, Trash2, ChevronLeft, ChevronRight, Users, BarChart2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWeekend } from 'date-fns';

const DUTY_TYPES = ['CDO', 'CDS', 'CDG', 'Guard Duty'];
const DUTY_COLORS = {
  CDO: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/25' },
  CDS: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/25' },
  CDG: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/25' },
  'Guard Duty': { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/25' },
};

export default function Duty() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const canManage = isCadetAdmin(user) || isInstructor(user);

  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState('calendar'); // 'calendar' | 'stats'

  // New duty form
  const [dutyType, setDutyType] = useState('CDO');
  const [personnelId, setPersonnelId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: duties = [] } = useQuery({
    queryKey: ['duties', user?.unit],
    queryFn: () => base44.entities.DutyRoster.filter({ unit: user?.unit }, 'date', 100),
    enabled: !!user?.unit,
  });

  const { data: unitUsers = [] } = useQuery({
    queryKey: ['unit-users', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });
  const cadets = unitUsers.filter(u => u.role === 'cadet' || u.role === 'cadet_admin');

  const monthDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const dutiesForDay = (day) =>
    duties.filter(d => d.date === format(day, 'yyyy-MM-dd'));

  const selectedDayDuties = selectedDay ? dutiesForDay(selectedDay) : [];

  // Stats
  const stats = useMemo(() => {
    const map = {};
    cadets.forEach(c => {
      map[c.id] = { name: c.full_name, rank: c.rank, weekday: 0, weekend: 0, total: 0, byType: {} };
    });
    duties.forEach(d => {
      if (!map[d.personnel_id]) {
        map[d.personnel_id] = { name: d.personnel_name, rank: d.personnel_rank, weekday: 0, weekend: 0, total: 0, byType: {} };
      }
      const entry = map[d.personnel_id];
      entry.total++;
      entry.byType[d.duty_type] = (entry.byType[d.duty_type] || 0) + 1;
      const parsed = parseISO(d.date);
      if (isWeekend(parsed)) entry.weekend++;
      else entry.weekday++;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [duties, cadets]);

  const handleAddDuty = async () => {
    if (!selectedDay || !personnelId || !dutyType) return;
    setSaving(true);
    const selectedUser = unitUsers.find(u => u.id === personnelId);
    await base44.entities.DutyRoster.create({
      date: format(selectedDay, 'yyyy-MM-dd'),
      duty_type: dutyType,
      personnel_name: selectedUser?.full_name || '',
      personnel_rank: selectedUser?.rank || '',
      personnel_id: personnelId,
      unit: user?.unit,
      notes,
      created_by: user?.email,
    });
    setSaving(false);
    setPersonnelId('');
    setNotes('');
    setShowAdd(false);
    qc.invalidateQueries({ queryKey: ['duties'] });
    toast.success('Duty assigned');
  };

  const handleDelete = async (id) => {
    await base44.entities.DutyRoster.delete(id);
    qc.invalidateQueries({ queryKey: ['duties'] });
    toast.success('Duty removed');
  };

  return (
    <div className="pb-24">
      <PageHeader title="Duty Roster" backTo="/actions" subtitle="CDO / CDS / CDG / Guard" />

      {/* Tabs */}
      <div className="px-4 pt-3 flex gap-1 bg-background sticky top-14 z-10 pb-2">
        <button
          onClick={() => setTab('calendar')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'calendar' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
        >
          <Calendar className="h-3.5 w-3.5 inline mr-1.5" />Calendar
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'stats' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
        >
          <BarChart2 className="h-3.5 w-3.5 inline mr-1.5" />Statistics
        </button>
      </div>

      {tab === 'calendar' && (
        <div className="px-4 space-y-4 pt-2">
          {/* Month Nav */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-semibold">{format(viewMonth, 'MMMM yyyy')}</p>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-0.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Empty cells for first day offset */}
            {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {monthDays.map(day => {
              const dayDuties = dutiesForDay(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toString()}
                  onClick={() => { setSelectedDay(day); setShowAdd(false); }}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    isSelected ? 'bg-primary text-primary-foreground' :
                    isToday ? 'bg-primary/15 text-primary' :
                    isWeekend(day) ? 'bg-muted/30 text-muted-foreground' :
                    'hover:bg-muted/40 text-foreground'
                  }`}
                >
                  <span>{format(day, 'd')}</span>
                  {dayDuties.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayDuties.slice(0, 3).map((d, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-primary-foreground/70' : 'bg-primary'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{format(selectedDay, 'EEEE, dd MMM yyyy')}</p>
                {canManage && (
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={() => setShowAdd(!showAdd)}>
                    <Plus className="h-3.5 w-3.5" /> Add Duty
                  </Button>
                )}
              </div>

              {/* Add form */}
              {showAdd && canManage && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Duty Type</Label>
                        <Select value={dutyType} onValueChange={setDutyType}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DUTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Personnel</Label>
                        <Select value={personnelId} onValueChange={setPersonnelId}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {unitUsers.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.rank} {u.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="h-8 text-xs" />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleAddDuty} disabled={saving || !personnelId}>
                        {saving ? 'Saving...' : 'Assign Duty'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAdd(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedDayDuties.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No duties assigned for this day.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayDuties.map(d => {
                    const colors = DUTY_COLORS[d.duty_type] || DUTY_COLORS.CDO;
                    return (
                      <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${colors.bg} ${colors.border}`}>
                        <Badge className={`${colors.bg} ${colors.text} ${colors.border} text-[10px] shrink-0`}>{d.duty_type}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{d.personnel_rank} {d.personnel_name}</p>
                          {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                        </div>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(d.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="px-4 pt-2 space-y-3">
          <p className="text-xs text-muted-foreground">Duty counts per cadet — for fair allocation</p>
          {stats.filter(s => s.total > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No duty data yet.</p>
          ) : (
            stats.filter(s => s.total > 0).map(s => (
              <Card key={s.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.rank} {s.name}</p>
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground">Weekday: <span className="text-foreground font-medium">{s.weekday}</span></span>
                        <span className="text-xs text-muted-foreground">Weekend: <span className="text-amber-400 font-medium">{s.weekend}</span></span>
                        <span className="text-xs text-muted-foreground">Total: <span className="text-primary font-semibold">{s.total}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {Object.entries(s.byType).map(([type, count]) => {
                      const colors = DUTY_COLORS[type] || DUTY_COLORS.CDO;
                      return (
                        <span key={type} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                          {type}: {count}
                        </span>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}