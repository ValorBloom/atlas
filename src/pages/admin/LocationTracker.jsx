import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullToRefresh from '@/components/layout/PullToRefresh';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, ArrowRight, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { formatRankName, formatTime, isInstructor, isCadetAdmin } from '@/lib/constants';
import { isToday, parseISO, differenceInMinutes } from 'date-fns';

export default function LocationTracker() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['movements-today'] });
  };
  const { pullDistance, refreshing } = usePullToRefresh(refresh);

  const { data: allMovements = [], isLoading } = useQuery({
    queryKey: ['movements-today', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter({ unit: user?.unit }, '-created_date', 200),
    enabled: !!user?.unit,
    refetchInterval: 30000,
  });

  const todayMovements = allMovements.filter(m => {
    try { return isToday(parseISO(m.movement_date || m.created_date)); } catch { return false; }
  });

  const pending = todayMovements.filter(m => m.status === 'departed');
  const returned = todayMovements.filter(m => m.status === 'reached');

  const isOverdue = (m) => {
    if (!m.leave_time) return false;
    const hh = parseInt(m.leave_time.slice(0, 2));
    const mm = parseInt(m.leave_time.slice(2, 4));
    const now = new Date();
    const leaveDate = new Date();
    leaveDate.setHours(hh, mm, 0, 0);
    return differenceInMinutes(now, leaveDate) > 60;
  };

  return (
    <div className="pb-24 relative">
      <PullToRefresh pullDistance={pullDistance} refreshing={refreshing} />
      <PageHeader title="Movement Log" backTo="/admin" subtitle={`Today · ${todayMovements.length} movements`} />
      <div className="px-4 py-4 space-y-5">

        {/* Pending Out Banner */}
        {pending.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/8 border border-destructive/20">
            <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive/90">{pending.length} movement{pending.length > 1 ? 's' : ''} pending return</p>
              <p className="text-xs text-muted-foreground">Awaiting reached time update</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && todayMovements.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/25 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No movements recorded today</p>
            <p className="text-xs text-muted-foreground/60 mt-1">All personnel accounted for</p>
          </div>
        )}

        {/* Pending (Away) list — grouped by trip */}
        {pending.length > 0 && (() => {
          const groups = [];
          const assigned = new Set();
          pending.forEach(m => {
            if (assigned.has(m.id)) return;
            const group = pending.filter(l =>
              l.from_location === m.from_location &&
              l.to_location === m.to_location &&
              l.leave_time === m.leave_time &&
              l.reported_by === m.reported_by
            );
            group.forEach(l => assigned.add(l.id));
            groups.push(group);
          });

          return (
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Pending Return ({pending.length} personnel · {groups.length} {groups.length === 1 ? 'trip' : 'trips'})
              </h2>
              {groups.map((group, gi) => {
                const rep = group[0];
                const overdue = isOverdue(rep);
                return (
                  <div key={gi} className={`p-3.5 rounded-xl border transition-all ${
                    overdue ? 'border-destructive/30 bg-destructive/8' : 'border-amber-500/25 bg-amber-500/8'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 mt-1">{gi + 1}.</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {group.length === 1 ? (
                              <p className="text-sm font-semibold text-foreground">
                                {formatRankName(rep.personnel_rank, rep.personnel_name)}
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-foreground">
                                {group.length} personnel
                              </p>
                            )}
                            {overdue && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                          </div>
                          {group.length > 1 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {group.map(l => l.personnel_name?.split(' ').slice(-1)[0]).join(', ')}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <span>{rep.from_location}</span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                            <span className="font-medium text-foreground">{rep.to_location}</span>
                          </div>
                          {rep.purpose && <p className="text-xs text-muted-foreground mt-0.5">{rep.purpose}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className={`text-[10px] ${overdue ? 'bg-destructive/15 text-destructive border-destructive/25' : 'bg-amber-500/15 text-amber-400 border-amber-500/25'}`}>
                          {overdue ? 'Overdue' : group.length > 1 ? `${group.length} away` : 'Away'}
                        </Badge>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground justify-end">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formatTime(rep.leave_time)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Full today log */}
        {todayMovements.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Today's Full Log ({todayMovements.length})
            </h2>
            {todayMovements.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{formatRankName(m.personnel_rank, m.personnel_name)}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{m.from_location}</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>{m.to_location}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{formatTime(m.leave_time)}</span>
                    {m.reached_time && (
                      <>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span className="text-green-400">{formatTime(m.reached_time)}</span>
                      </>
                    )}
                  </div>
                  {m.purpose && <p className="text-xs text-muted-foreground/70 mt-0.5">{m.purpose}</p>}
                </div>
                <Badge className={`text-[10px] shrink-0 ${
                  m.status === 'reached'
                    ? 'bg-green-500/15 text-green-400 border-green-500/25'
                    : m.status === 'departed'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {m.status === 'reached' ? 'Returned' : m.status === 'departed' ? 'Away' : 'Cancelled'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}