import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  isCadetAdmin, isInstructor, DUTY_COLORS, DUTY_POINTS, getDutyPoints,
  formatRankName
} from '@/lib/constants';
import {
  CalendarDays, ChevronLeft, ChevronRight, Shield, Trophy, Star,
  ClipboardList, Info
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, isWeekend, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

function DutyBadge({ type }) {
  const c = DUTY_COLORS[type] || DUTY_COLORS.CDO;
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border', c.bg, c.text, c.border)}>
      {type}
    </span>
  );
}

export default function Duty() {
  const { user } = useOutletContext();
  const canManage = isCadetAdmin(user) || isInstructor(user);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [tab, setTab] = useState('roster'); // 'roster' | 'points' | 'info'

  const { data: duties = [] } = useQuery({
    queryKey: ['duties', user?.unit],
    queryFn: () => base44.entities.DutyRoster.filter({ unit: user?.unit }, 'date', 200),
    enabled: !!user?.unit,
  });

  const monthDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const dutiesForDay = (day) =>
    duties.filter(d => d.date === format(day, 'yyyy-MM-dd'));

  const selectedDayDuties = selectedDay ? dutiesForDay(selectedDay) : [];

  // My duties
  const myDuties = useMemo(() =>
    duties.filter(d => d.personnel_id === user?.id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [duties, user?.id]
  );

  // Points summary per cadet (from duty records themselves)
  const pointsSummary = useMemo(() => {
    const map = {};
    duties.forEach(d => {
      const key = d.personnel_id || d.personnel_name;
      if (!map[key]) map[key] = { name: d.personnel_name, rank: d.personnel_rank || '', pts: 0, count: 0 };
      map[key].pts += (d.points_awarded || 0);
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.pts - a.pts);
  }, [duties]);

  return (
    <div className="pb-24">
      <PageHeader
        title="Duty Roster"
        subtitle={user?.unit}
        backTo="/"
        rightAction={
          canManage && (
            <Link to="/admin/duty">
              <Button size="sm" className="h-8 text-xs gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Manage
              </Button>
            </Link>
          )
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border mx-4 mt-1">
        {['roster', 'points', 'info'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            )}
          >
            {t === 'roster' ? 'Roster' : t === 'points' ? 'Points' : 'How Points Work'}
          </button>
        ))}
      </div>

      {/* ── ROSTER TAB ── */}
      {tab === 'roster' && (
        <div className="px-4 pt-3 space-y-4">
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

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: monthDays[0].getDay() }).map((_, i) => <div key={`e-${i}`} />)}
            {monthDays.map(day => {
              const dayDuties = dutiesForDay(day);
              const isSelected = isSameDay(day, selectedDay);
              const isToday = isSameDay(day, new Date());
              const hasMyDuty = dayDuties.some(d => d.personnel_id === user?.id);
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
                  <div className="flex gap-0.5 mt-0.5">
                    {hasMyDuty && (
                      <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-amber-300' : 'bg-amber-400')} />
                    )}
                    {dayDuties.length > 0 && !hasMyDuty && (
                      <div className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-primary-foreground/60' : 'bg-primary/50')} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected day */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {format(selectedDay, 'EEEE, dd MMM yyyy')}
              {isWeekend(selectedDay) && (
                <span className="ml-2 text-[10px] font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded-full">WEEKEND</span>
              )}
            </p>
            {selectedDayDuties.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No duties assigned for this day.</p>
            ) : (
              selectedDayDuties.map(d => {
                const c = DUTY_COLORS[d.duty_type] || DUTY_COLORS.CDO;
                const isMe = d.personnel_id === user?.id;
                return (
                  <div key={d.id} className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border',
                    c.bg, c.border,
                    isMe && 'ring-1 ring-primary/40'
                  )}>
                    <DutyBadge type={d.duty_type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatRankName(d.personnel_rank, d.personnel_name)}
                        {isMe && <span className="ml-1.5 text-[9px] text-primary font-bold uppercase tracking-wider">You</span>}
                      </p>
                      {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                    </div>
                    {d.points_awarded > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Trophy className="h-3 w-3 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">+{d.points_awarded}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* My upcoming duties */}
          {myDuties.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">My Duties</p>
              {myDuties.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  <DutyBadge type={d.duty_type} />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{d.date}</p>
                    {d.is_weekend && <span className="text-[9px] text-amber-400">Weekend</span>}
                  </div>
                  {d.points_awarded > 0 && (
                    <span className="text-xs font-semibold text-amber-400">+{d.points_awarded} pts</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── POINTS TAB ── */}
      {tab === 'points' && (
        <div className="px-4 pt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Duty points accumulated by all cadets in {user?.unit} unit.</p>
          {pointsSummary.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No duty points recorded yet.</p>
            </div>
          ) : (
            pointsSummary.map((entry, i) => (
              <Card key={i} className={cn(entry.name === user?.full_name && 'border-primary/30 bg-primary/5')}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-slate-500/20 text-slate-400' :
                    i === 2 ? 'bg-orange-700/20 text-orange-600' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {formatRankName(entry.rank, entry.name)}
                      {entry.name === user?.full_name && (
                        <span className="ml-1.5 text-[9px] text-primary font-bold">You</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.count} duties</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-sm font-bold text-amber-400">{entry.pts}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── INFO TAB ── */}
      {tab === 'info' && (
        <div className="px-4 pt-3 space-y-4">
          <div className="p-3.5 rounded-xl border border-border bg-card">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              How Duty Points Are Calculated
            </p>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Points are awarded automatically when an admin assigns you to a duty. The points depend on the duty type and whether it falls on a weekday or weekend.
            </p>
            <div className="space-y-2">
              {Object.entries(DUTY_POINTS).map(([type, pts]) => {
                const c = DUTY_COLORS[type] || DUTY_COLORS.CDO;
                return (
                  <div key={type} className={cn('flex items-center gap-3 p-2.5 rounded-lg border', c.bg, c.border)}>
                    <DutyBadge type={type} />
                    <div className="flex-1 text-xs text-muted-foreground">
                      Weekday: <span className={cn('font-semibold', c.text)}>+{pts.weekday} pts</span>
                      <span className="mx-2">·</span>
                      Weekend: <span className="font-semibold text-amber-400">+{pts.weekend} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <p className="text-sm font-semibold">Rules</p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2"><Star className="h-3 w-3 text-primary mt-0.5 shrink-0" />No duplicate points for same cadet, duty type, and date.</li>
              <li className="flex items-start gap-2"><Star className="h-3 w-3 text-primary mt-0.5 shrink-0" />If a duty assignment is changed, the points update automatically.</li>
              <li className="flex items-start gap-2"><Star className="h-3 w-3 text-primary mt-0.5 shrink-0" />If a duty is removed, the associated points are voided.</li>
              <li className="flex items-start gap-2"><Star className="h-3 w-3 text-primary mt-0.5 shrink-0" />Duty points count toward the main leaderboard alongside other points.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/8">
            <p className="text-xs font-semibold text-amber-300 mb-1">Weekend Bonus</p>
            <p className="text-xs text-amber-400/80 leading-relaxed">
              Duties on Saturday or Sunday earn higher points to recognise the impact on personal time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}