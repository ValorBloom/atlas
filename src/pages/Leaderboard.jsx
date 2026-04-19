import React, { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRankName } from '@/lib/constants';
import { Trophy, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Leaderboard() {
  const { user } = useOutletContext();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['point-logs', user?.unit],
    queryFn: () => base44.entities.PointLog.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const standings = useMemo(() => {
    const totals = {};
    logs.forEach(log => {
      if (!totals[log.user_id]) {
        totals[log.user_id] = { name: log.user_name, rank: log.user_rank, points: 0 };
      }
      totals[log.user_id].points += (log.delta || 0);
    });
    return Object.entries(totals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.points - a.points);
  }, [logs]);

  const rankColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

  return (
    <div>
      <PageHeader title="Leaderboard" backTo="/points" subtitle="Current point standings" />
      <div className="px-4 py-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : standings.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No points recorded yet.</p>
          </div>
        ) : (
          standings.map((entry, i) => (
            <Card key={entry.id} className={cn(i < 3 && 'border-primary/20')}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {i < 3 ? (
                    <Medal className={cn('h-4 w-4', rankColors[i])} />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{formatRankName(entry.rank, entry.name)}</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs font-semibold">
                  {entry.points} pts
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}