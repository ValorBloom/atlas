import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, AlertTriangle, Users, Sparkles, RefreshCw, Activity, BarChart2 } from 'lucide-react';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import MOAnnouncement from './MOAnnouncement';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#f97316'];

export default function MedicalDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { data: allReports = [], isLoading } = useQuery({
    queryKey: ['all-status-reports-mo'],
    queryFn: () => base44.entities.StatusReport.filter({}, '-created_date', 500),
  });

  const activeReports = allReports.filter(r => r.status === 'active' || r.status === 'approved');
  const last30Days = allReports.filter(r => new Date(r.created_date) > subDays(new Date(), 30));

  // Symptom frequency
  const symptomMap = {};
  last30Days.forEach(r => {
    if (r.symptoms) {
      r.symptoms.split(/[,;]/g).forEach(s => {
        const key = s.trim().toLowerCase();
        if (key) symptomMap[key] = (symptomMap[key] || 0) + 1;
      });
    }
  });
  const topSymptoms = Object.entries(symptomMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Cases by unit
  const unitMap = {};
  last30Days.forEach(r => {
    const u = r.unit || 'Unknown';
    unitMap[u] = (unitMap[u] || 0) + 1;
  });
  const unitData = Object.entries(unitMap).map(([unit, cases]) => ({ unit, cases }));

  // Type breakdown
  const typeMap = {};
  last30Days.forEach(r => { typeMap[r.type] = (typeMap[r.type] || 0) + 1; });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  // Frequent filers (sick >= 3x in 30 days)
  const personMap = {};
  last30Days.forEach(r => {
    const key = r.personnel_name || r.personnel_id;
    if (!key) return;
    if (!personMap[key]) personMap[key] = { name: r.personnel_name, unit: r.unit, rank: r.personnel_rank, count: 0 };
    personMap[key].count++;
  });
  const frequentFilers = Object.values(personMap)
    .filter(p => p.count >= 3)
    .sort((a, b) => b.count - a.count);

  // Cluster detection — same symptom, same unit, within 7 days
  const clusterMap = {};
  const recent7 = allReports.filter(r => new Date(r.created_date) > subDays(new Date(), 7));
  recent7.forEach(r => {
    if (!r.symptoms || !r.unit) return;
    r.symptoms.split(/[,;]/g).forEach(s => {
      const key = `${r.unit}__${s.trim().toLowerCase()}`;
      if (!clusterMap[key]) clusterMap[key] = { unit: r.unit, symptom: s.trim(), names: [] };
      clusterMap[key].names.push(r.personnel_name);
    });
  });
  const clusters = Object.values(clusterMap)
    .filter(c => c.names.length >= 3)
    .sort((a, b) => b.names.length - a.names.length);

  // --- Epidemic curve data (last 30 days, day-by-day) ---
  const epidemicDays = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
  const epiCurveData = epidemicDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayReports = last30Days.filter(r => format(new Date(r.created_date), 'yyyy-MM-dd') === dayStr);
    return { date: format(day, 'dd MMM'), total: dayReports.length };
  });

  // --- Wing-level comparison (per unit: MC count, LD count, active, total) ---
  const wingMap = {};
  last30Days.forEach(r => {
    const u = r.unit || 'Unknown';
    if (!wingMap[u]) wingMap[u] = { unit: u, total: 0, mc: 0, ld: 0, active: 0 };
    wingMap[u].total++;
    if (r.status_category === 'MC') wingMap[u].mc++;
    if (r.status_category === 'Light Duty') wingMap[u].ld++;
    if (r.status === 'active' || r.status === 'approved') wingMap[u].active++;
  });
  const wingData = Object.values(wingMap).sort((a, b) => b.total - a.total);

  const generateAiInsight = async () => {
    setLoadingInsight(true);
    setAiInsight(null);
    const summary = {
      total_last30: last30Days.length,
      active_now: activeReports.length,
      top_symptoms: topSymptoms.slice(0, 5),
      units_affected: unitData,
      frequent_filers: frequentFilers.length,
      clusters: clusters.map(c => ({ unit: c.unit, symptom: c.symptom, count: c.names.length })),
    };
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Military MO health brief. 30-day data: ${JSON.stringify(summary)}. Give: 1) Top trends 2) Cluster risks 3) Recommendations. Max 150 words, bullet points.`,
      model: 'gpt_5_mini',
    });
    setLoadingInsight(false);
    setAiInsight(res);
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'epidemic', label: 'Epi Curve' },
    { key: 'wings', label: 'Wings' },
    { key: 'clusters', label: 'Clusters', badge: clusters.length },
    { key: 'frequent', label: 'Watch List', badge: frequentFilers.length },
    { key: 'announce', label: 'Announce' },
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-sm font-bold text-foreground">Medical Dashboard</h1>
              <p className="text-[10px] text-muted-foreground">Health Analytics</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">{activeReports.length} Active</Badge>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto max-w-lg mx-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1 bg-destructive text-white text-[9px] px-1 rounded-full">{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-2">
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{last30Days.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cases (30d)</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{activeReports.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Active Now</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-amber-400">{clusters.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Clusters</p>
              </CardContent></Card>
            </div>

            {/* AI Insight */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">AI Health Insight</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={generateAiInsight} disabled={loadingInsight}>
                    <RefreshCw className={`h-3 w-3 ${loadingInsight ? 'animate-spin' : ''}`} />
                    {loadingInsight ? 'Analysing...' : 'Analyse'}
                  </Button>
                </div>
                {aiInsight ? (
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{aiInsight}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Click Analyse to get an AI-generated health summary and risk assessment based on the last 30 days of data.</p>
                )}
              </CardContent>
            </Card>

            {/* Top Symptoms */}
            {topSymptoms.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top Symptoms (30d)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={topSymptoms} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-20} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Cases by Unit */}
            {unitData.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cases by Unit (30d)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={unitData} dataKey="cases" nameKey="unit" cx="50%" cy="50%" outerRadius={60} label={({ unit, cases }) => `${unit}: ${cases}`} labelLine={false} fontSize={10}>
                        {unitData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Type Breakdown */}
            {typeData.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Report Types (30d)</p>
                  <div className="flex flex-wrap gap-2">
                    {typeData.map((t, i) => (
                      <div key={t.name} className="flex items-center gap-1.5 bg-muted/40 rounded-lg px-2.5 py-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground">({t.value})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* EPIDEMIC CURVE TAB */}
        {activeTab === 'epidemic' && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Daily Cases — Last 30 Days</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={epiCurveData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2, fill: 'hsl(var(--primary))' }} name="Cases" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Peak days */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Top 5 Peak Days</p>
                <div className="space-y-2">
                  {[...epiCurveData].sort((a, b) => b.total - a.total).slice(0, 5).map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-14">{d.date}</span>
                      <div className="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, (d.total / Math.max(...epiCurveData.map(x => x.total), 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-6 text-right">{d.total}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* WINGS COMPARISON TAB */}
        {activeTab === 'wings' && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wing-Level Health Metrics (30d)</p>
                </div>
                {wingData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={wingData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="unit" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                      <Bar dataKey="mc" name="MC" fill="#ef4444" radius={[3,3,0,0]} />
                      <Bar dataKey="ld" name="Light Duty" fill="#f59e0b" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Per-wing breakdown table */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Detailed Breakdown</p>
                <div className="space-y-2">
                  {wingData.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{w.unit}</p>
                      </div>
                      <div className="flex gap-2 text-[10px] shrink-0">
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">{w.total} total</span>
                        <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-medium">{w.mc} MC</span>
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded font-medium">{w.ld} LD</span>
                        <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded font-medium">{w.active} live</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* CLUSTERS TAB */}
        {activeTab === 'clusters' && (
          <>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-400 font-medium">Clusters = same symptom, same unit, ≥3 people within 7 days</p>
              </div>
            </div>
            {clusters.length === 0 ? (
              <Card><CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No clusters detected in the last 7 days.</p>
              </CardContent></Card>
            ) : clusters.map((c, i) => (
              <Card key={i} className="border-amber-500/25 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <p className="text-sm font-semibold text-amber-400">Cluster: {c.symptom}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Unit: <span className="font-medium text-foreground">{c.unit}</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.names.length} cases — {c.names.slice(0, 3).join(', ')}{c.names.length > 3 ? ` +${c.names.length - 3} more` : ''}</p>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-0 shrink-0">{c.names.length} cases</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* FREQUENT FILERS TAB */}
        {activeTab === 'frequent' && (
          <>
            <div className="p-3 bg-primary/8 border border-primary/20 rounded-xl">
              <p className="text-xs text-primary font-medium">Personnel with ≥3 reports in the last 30 days</p>
            </div>
            {frequentFilers.length === 0 ? (
              <Card><CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No frequent filers in the last 30 days.</p>
              </CardContent></Card>
            ) : frequentFilers.map((p, i) => (
              <Card key={i}>
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{p.rank ? `${p.rank} ` : ''}{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.unit}</p>
                  </div>
                  <Badge className={p.count >= 5 ? 'bg-destructive/15 text-destructive border-0' : 'bg-amber-500/15 text-amber-400 border-0'}>
                    {p.count}x
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {/* ANNOUNCE TAB */}
        {activeTab === 'announce' && <MOAnnouncement />}

      </div>
    </div>
  );
}