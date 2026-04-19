import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRankName } from '@/lib/constants';
import { List, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function PointLogs() {
  const { user } = useOutletContext();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['point-logs-all', user?.unit],
    queryFn: () => base44.entities.PointLog.filter({ unit: user?.unit }, '-created_date', 100),
    enabled: !!user?.unit,
  });

  return (
    <div>
      <PageHeader title="Point Logs" backTo="/points" subtitle="Complete history" />
      <div className="px-4 py-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <List className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No point logs yet.</p>
          </div>
        ) : (
          logs.map(log => (
            <Card key={log.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  log.delta > 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {log.delta > 0 
                    ? <TrendingUp className="h-4 w-4 text-green-600" /> 
                    : <TrendingDown className="h-4 w-4 text-red-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{formatRankName(log.user_rank, log.user_name)}</p>
                  <p className="text-xs text-muted-foreground">{log.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className={`font-mono text-xs ${
                    log.delta > 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {log.delta > 0 ? '+' : ''}{log.delta}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(log.created_date), 'dd MMM')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}