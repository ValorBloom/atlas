import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODAY = format(new Date(), 'yyyy-MM-dd');

function getSlots(centerDate) {
  const center = centerDate ? new Date(centerDate + 'T00:00:00') : new Date();
  return [-1, 0, 1].map(offset => {
    const d = addDays(center, offset);
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: format(d, 'd'),
      month: format(d, 'MMM'),
      day: DAY_NAMES[d.getDay()],
      isToday: format(d, 'yyyy-MM-dd') === TODAY,
    };
  });
}

export default function ViewCET() {
  const { user } = useOutletContext();
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const slots = getSlots(selectedDate);

  const { data: cetRecords = [], isLoading } = useQuery({
    queryKey: ['cet-records-view', user?.unit],
    queryFn: () => base44.entities.CETRecord.filter({ unit: user?.unit }, '-date', 30),
    enabled: !!user?.unit,
  });

  const record = cetRecords.find(r => r.date === selectedDate);

  const formatDisplay = (d) => {
    const parsed = parseISO(d);
    return `${format(parsed, 'dd MMM yyyy')} (${DAY_NAMES[parsed.getDay()]})`;
  };

  const goBack = () => {
    const prev = addDays(new Date(selectedDate + 'T00:00:00'), -1);
    setSelectedDate(format(prev, 'yyyy-MM-dd'));
  };
  const goForward = () => {
    const next = addDays(new Date(selectedDate + 'T00:00:00'), 1);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };

  return (
    <div className="pb-24">
      <PageHeader title="View CET" backTo="/actions" subtitle="Daily Training Programme" />

      {/* Date Scroll — always centered on selected */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center shrink-0 hover:bg-muted/40 transition-colors">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex gap-2 flex-1 justify-center">
            {slots.map(d => {
              const rec = cetRecords.find(r => r.date === d.date);
              const isSelected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={cn(
                    'flex flex-col items-center px-4 py-2.5 rounded-xl border shrink-0 transition-all min-w-[72px]',
                    isSelected ? 'bg-primary border-primary/40 text-primary-foreground' : 'bg-card border-border text-foreground hover:bg-muted/40'
                  )}
                >
                  <span className={`text-[10px] font-medium uppercase tracking-wide ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{d.day}</span>
                  <span className="text-sm font-bold mt-0.5">{d.label}</span>
                  <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{d.isToday ? 'Today' : d.month}</span>
                  {rec?.is_published && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-primary-foreground/60' : 'bg-green-400'}`} />}
                </button>
              );
            })}
          </div>
          <button onClick={goForward} className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center shrink-0 hover:bg-muted/40 transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : !record ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">No CET for {formatDisplay(selectedDate)}</p>
            <p className="text-xs text-muted-foreground">Your instructor hasn't uploaded the CET for this date yet.</p>
          </div>
        ) : (
          <>
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{formatDisplay(selectedDate)}</p>
                {record.wdi && <p className="text-xs text-muted-foreground">WDI: {record.wdi}</p>}
              </div>
              <Badge className="bg-green-500/15 text-green-400 border-green-500/25">Published</Badge>
            </div>

            {/* Quote */}
            {record.quote && (
              <Card className="bg-primary/8 border-primary/20">
                <CardContent className="p-4">
                  <p className="text-sm italic text-foreground">"{record.quote}"</p>
                  {record.quote_author && <p className="text-xs text-primary mt-1.5">— {record.quote_author}</p>}
                </CardContent>
              </Card>
            )}

            {/* Timetable */}
            {record.timetable?.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-4 space-y-0">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Timetable</p>
                  {record.timetable.map((r, i) => (
                    <div key={i} className="flex gap-3 py-2 border-b border-border/40 last:border-0">
                      <span className="text-xs font-mono text-primary w-14 shrink-0 pt-0.5">{r.time}</span>
                      <span className="text-sm text-foreground">{r.activity}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Additional Instructions */}
            {record.notes && (
              <Card className="border-amber-500/20 bg-amber-500/8">
                <CardContent className="p-4">
                  <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide mb-2">Additional Instructions</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{record.notes}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}