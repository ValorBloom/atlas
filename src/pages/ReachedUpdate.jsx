import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { TIME_REGEX, formatTime, formatRankName, getCurrentTimeSG } from '@/lib/constants';
import { Clock, Check, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ReachedUpdate() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reachedTime, setReachedTime] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: pendingLogs = [], isLoading } = useQuery({
    queryKey: ['movement-pending', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter(
      { unit: user?.unit, status: 'departed' }, '-created_date', 20
    ),
    enabled: !!user?.unit,
  });

  const handleSubmit = async () => {
    if (!selectedLog || !TIME_REGEX.test(reachedTime)) return;
    setSaving(true);
    await base44.entities.MovementLog.update(selectedLog.id, {
      reached_time: reachedTime,
      status: 'reached',
    });

    await base44.entities.Notification.create({
      title: 'Reached Confirmed',
      message: `${formatRankName(selectedLog.personnel_rank, selectedLog.personnel_name)} reached ${selectedLog.to_location} at ${formatTime(reachedTime)}`,
      type: 'success',
      category: 'movement',
      recipient_unit: user?.unit,
    });

    setSaving(false);
    toast.success('Reached time recorded');
    queryClient.invalidateQueries({ queryKey: ['movement-pending'] });
    navigate('/');
  };

  return (
    <div>
      <PageHeader title="Report Reached" backTo="/" subtitle="Record arrival time" />
      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : pendingLogs.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No pending movements.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Movement</Label>
              {pendingLogs.map(log => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                    selectedLog?.id === log.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-card'
                  }`}
                >
                  <p className="font-medium">{formatRankName(log.personnel_rank, log.personnel_name)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {log.from_location} → {log.to_location} • Left {formatTime(log.leave_time)}
                  </p>
                </button>
              ))}
            </div>

            {selectedLog && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Reached Time</Label>
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="e.g. 0900"
                    maxLength={4}
                    value={reachedTime}
                    onChange={(e) => setReachedTime(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                  <Button variant="outline" size="sm" onClick={() => setReachedTime(getCurrentTimeSG())}>
                    <Clock className="h-3.5 w-3.5 mr-1" />Now
                  </Button>
                </div>

                {reachedTime && TIME_REGEX.test(reachedTime) && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
{`✅ REACHED REPORT
${formatRankName(selectedLog.personnel_rank, selectedLog.personnel_name)}
Location: ${selectedLog.to_location}
Reached: ${formatTime(reachedTime)}
Date: ${format(new Date(), 'ddMMMMyyyy').toUpperCase()}`}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={!TIME_REGEX.test(reachedTime) || saving}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Confirm Reached'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}