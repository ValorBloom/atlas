import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, ArrowRight, User } from 'lucide-react';
import { formatRankName, formatTime } from '@/lib/constants';
import { format, isToday, parseISO } from 'date-fns';

export default function LocationTracker() {
  const { user } = useOutletContext();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['movements-active', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter(
      { unit: user?.unit, status: 'departed' }, '-created_date', 50
    ),
    enabled: !!user?.unit,
    refetchInterval: 30000, // refresh every 30s
  });

  const { data: allMovements = [] } = useQuery({
    queryKey: ['movements-today', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter(
      { unit: user?.unit }, '-created_date', 100
    ),
    enabled: !!user?.unit,
  });

  const todayMovements = allMovements.filter(m => {
    try { return isToday(parseISO(m.movement_date || m.created_date)); } catch { return false; }
  });

  const reachedToday = todayMovements.filter(m => m.status === 'reached').length;
  const activeNow = movements.length;

  return (
    <div>
      <PageHeader title="Personnel Location" backTo="/admin" subtitle="Live movement tracker" />
      <div className="px-4 py-4 space-y-5">

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-primary font-medium">Out of Camp</p>
              <p className="text-2xl font-bold text-primary">{activeNow}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Returned Today</p>
              <p className="text-2xl font-bold">{reachedToday}</p>
            </CardContent>
          </Card>
        </div>

        {/* Active movements */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Currently Out of Camp</h2>
            <span className="text-xs text-muted-foreground">Auto-refreshes</span>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!isLoading && movements.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All personnel are in camp</p>
              </CardContent>
            </Card>
          )}

          {movements.map((m) => (
            <Card key={m.id} className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatRankName(m.personnel_rank, m.personnel_name)}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <span>{m.from_location}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium text-foreground">{m.to_location}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.purpose}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
                      Out
                    </Badge>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground justify-end">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{formatTime(m.leave_time)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Today's log */}
        {todayMovements.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Movement Log</h2>
            {todayMovements.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{formatRankName(m.personnel_rank, m.personnel_name)}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <span>{m.from_location}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{m.to_location}</span>
                        <span className="mx-1">·</span>
                        <span>{formatTime(m.leave_time)}</span>
                        {m.reached_time && <><span>→</span><span>{formatTime(m.reached_time)}</span></>}
                      </div>
                    </div>
                    <Badge
                      className={
                        m.status === 'reached'
                          ? 'text-[10px] bg-green-50 text-green-700 border border-green-200'
                          : m.status === 'departed'
                          ? 'text-[10px] bg-amber-50 text-amber-700 border border-amber-200'
                          : 'text-[10px]'
                      }
                      variant="outline"
                    >
                      {m.status === 'reached' ? 'Returned' : m.status === 'departed' ? 'Out' : 'Cancelled'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}