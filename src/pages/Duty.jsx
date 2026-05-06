import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { isCadetAdmin, isInstructor, formatRankName } from '@/lib/constants';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';

// Color map for duty badges
const COLOR_CLASSES = {
  blue:   { bg: 'bg-primary/10',      text: 'text-primary',     border: 'border-primary/25'      },
  green:  { bg: 'bg-green-500/10',    text: 'text-green-400',   border: 'border-green-500/25'    },
  amber:  { bg: 'bg-amber-500/10',    text: 'text-amber-400',   border: 'border-amber-500/25'    },
  red:    { bg: 'bg-destructive/10',  text: 'text-destructive', border: 'border-destructive/25'  },
  violet: { bg: 'bg-violet-500/10',   text: 'text-violet-400',  border: 'border-violet-500/25'   },
  orange: { bg: 'bg-orange-500/10',   text: 'text-orange-400',  border: 'border-orange-500/25'   },
};
const DEFAULT_COLOR = COLOR_CLASSES.blue;

function DutyBadge({ type, color }) {
  const c = COLOR_CLASSES[color] || DEFAULT_COLOR;
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0', c.bg, c.text, c.border)}>
      {type}
    </span>
  );
}

export default function Duty() {
  const { user } = useOutletContext();
  const canManage = isCadetAdmin(user) || isInstructor(user);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const { data: duties = [] } = useQuery({
    queryKey: ['duties', user?.unit],
    queryFn: () => base44.entities.DutyRoster.filter({ unit: user?.unit }, 'date', 300),
    enabled: !!user?.unit,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['duty-config', user?.unit],
    queryFn: () => base44.entities.DutyConfig.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
    select: data => data?.[0]?.duty_types || [],
  });

  const colorForType = (type) => {
    const cfg = configs.find(c => c.name === type);
    return cfg?.color || 'blue';
  };

  const monthDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const dutiesForDay = (day) =>
    duties.filter(d => d.date === format(day, 'yyyy-MM-dd'));

  const selectedDayDuties = dutiesForDay(selectedDay);
  const myDuties = duties.filter(d => d.personnel_id === user?.id).sort((a, b) => b.date.localeCompare(a.date));

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

        {/* Calendar */}
        <div className="grid grid-cols-7 gap-0.5">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>
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
                  {hasMyDuty && <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-amber-300' : 'bg-amber-400')} />}
                  {dayDuties.length > 0 && !hasMyDuty && <div className={cn('w-1 h-1 rounded-full', isSelected ? 'bg-primary-foreground/60' : 'bg-primary/50')} />}
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
            <p className="text-sm text-muted-foreground py-4 text-center">No duties assigned for this day.</p>
          ) : (
            selectedDayDuties.map(d => {
              const isMe = d.personnel_id === user?.id;
              return (
                <div key={d.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border border-border bg-card',
                  isMe && 'border-primary/30 bg-primary/5'
                )}>
                  <DutyBadge type={d.duty_type} color={colorForType(d.duty_type)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatRankName(d.personnel_rank, d.personnel_name)}
                      {isMe && <span className="ml-1.5 text-[9px] text-primary font-bold uppercase tracking-wider">You</span>}
                    </p>
                    {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* My duties */}
        {myDuties.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">My Duties</p>
            {myDuties.slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <DutyBadge type={d.duty_type} color={colorForType(d.duty_type)} />
                <p className="text-sm text-muted-foreground flex-1">{d.date}</p>
                {d.is_weekend && <span className="text-[10px] text-amber-400 font-semibold">WKD</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}