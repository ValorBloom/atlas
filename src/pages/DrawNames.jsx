import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatRankName } from '@/lib/constants';
import { Shuffle, Trophy, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DrawNames() {
  const { user } = useOutletContext();
  const [result, setResult] = useState(null);
  const [drawing, setDrawing] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ['point-logs', user?.unit],
    queryFn: () => base44.entities.PointLog.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: cadets = [] } = useQuery({
    queryKey: ['cadets-unit', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit, role: 'cadet' }),
    enabled: !!user?.unit,
  });

  const standings = useMemo(() => {
    const totals = {};
    cadets.forEach(c => {
      totals[c.id] = { name: c.full_name, rank: c.rank, points: 0 };
    });
    logs.forEach(log => {
      if (totals[log.user_id]) {
        totals[log.user_id].points += (log.delta || 0);
      }
    });
    return Object.entries(totals).map(([id, data]) => ({ id, ...data }));
  }, [logs, cadets]);

  const weightedDraw = () => {
    if (standings.length === 0) return null;
    const maxPoints = Math.max(...standings.map(s => s.points), 1);
    const weights = standings.map(s => ({
      ...s,
      weight: Math.max(maxPoints - s.points + 1, 1),
    }));
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    for (const entry of weights) {
      random -= entry.weight;
      if (random <= 0) return entry;
    }
    return weights[weights.length - 1];
  };

  const handleDraw = () => {
    setDrawing(true);
    setResult(null);
    setTimeout(() => {
      const drawn = weightedDraw();
      setResult(drawn);
      setDrawing(false);
    }, 1500);
  };

  return (
    <div>
      <PageHeader title="Draw Names" backTo="/points" subtitle="Weighted random selection" />
      <div className="px-4 py-5 space-y-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Lower-point cadets have a higher chance of being selected.
          </p>
        </div>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="px-8" 
            onClick={handleDraw}
            disabled={drawing || cadets.length === 0}
          >
            <Shuffle className={`h-4 w-4 mr-2 ${drawing ? 'animate-spin' : ''}`} />
            {drawing ? 'Drawing...' : 'Draw'}
          </Button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-center"
            >
              <Card className="w-full max-w-xs border-primary/30 bg-primary/5">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{formatRankName(result.rank, result.name)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current points: {result.points}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All Cadets</h3>
          {standings.sort((a, b) => a.points - b.points).map(s => (
            <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{formatRankName(s.rank, s.name)}</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{s.points} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}