import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isInstructor } from '@/lib/constants';
import {
  Users, Shield, Activity, MapPin, FileText,
  ClipboardList, Trophy, Upload, Trash2, Megaphone, ChevronRight, Calendar, UserX
} from 'lucide-react';

function NavLink({ to, icon: Icon, label, badge }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium flex-1">{label}</span>
      {badge && (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">{badge}</Badge>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: activeMovements = [] } = useQuery({
    queryKey: ['movements-active', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter({ unit: user?.unit, status: 'departed' }, '-created_date', 5),
    enabled: !!user?.unit,
    refetchInterval: 30000,
  });

  const { data: activeWindows = [] } = useQuery({
    queryKey: ['sft-windows-active', user?.unit],
    queryFn: () => base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pending-approvals', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit: user?.unit, status: 'pending_approval' }),
    enabled: !!user?.unit && instructor,
  });

  const { data: activeStatuses = [] } = useQuery({
    queryKey: ['active-statuses-dash', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit: user?.unit, status: 'active' }),
    enabled: !!user?.unit && instructor,
  });

  if (!instructor) {
    return (
      <div>
        <PageHeader title="Admin" backTo="/" />
        <div className="px-4 py-16 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Instructor access required.</p>
        </div>
      </div>
    );
  }

  const cadets = allUsers.filter(u => u.role === 'cadet' || u.role === 'cadet_admin');
  const instructors = allUsers.filter(u => u.role === 'instructor');
  const outNow = activeMovements.length;
  const inCamp = Math.max(allUsers.length - outNow, 0);
  const rsoCount = activeStatuses.filter(s => s.type === 'RSO').length;
  const maCount = activeStatuses.filter(s => s.type === 'MA').length;
  const rsiCount = activeStatuses.filter(s => s.type === 'RSI').length;

  return (
    <div>
      <PageHeader title="Instructor Dashboard" subtitle={user?.unit} />
      <div className="px-4 py-4 space-y-5">

        {/* Alerts */}
        {pendingApprovals.length > 0 && (
          <Link to="/actions/status/update/RSO">
            <div className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/8 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-300">{pendingApprovals.length} Pending RSO Approval{pendingApprovals.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-amber-500/70">Requires your review</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-500/50" />
            </div>
          </Link>
        )}

        {outNow > 0 && (
          <Link to="/admin/locations">
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/8 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">{outNow} personnel out of camp</p>
                  <p className="text-xs text-muted-foreground">Tap to view movement log</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary/40" />
            </div>
          </Link>
        )}

        {/* Unit Overview */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Overview</h2>

          {/* Strength bar */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Current Strength</p>
                  <p className="text-2xl font-bold">{inCamp}<span className="text-base font-normal text-muted-foreground">/{allUsers.length}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">In Camp</p>
                  <p className="text-sm font-semibold text-green-400">{inCamp}</p>
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: allUsers.length > 0 ? `${(inCamp / allUsers.length) * 100}%` : '0%' }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="text-center p-2 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cadets</p>
                  <p className="text-lg font-bold">{cadets.length}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Instructors</p>
                  <p className="text-lg font-bold">{instructors.length}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-destructive/8 border border-destructive/15">
                  <p className="text-[10px] text-destructive/70 uppercase tracking-wider">Out</p>
                  <p className="text-lg font-bold text-destructive">{outNow}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status breakdown */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'RSO', value: rsoCount, color: 'text-destructive', bg: 'bg-destructive/8 border-destructive/20' },
              { label: 'RSI', value: rsiCount, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20' },
              { label: 'MA', value: maCount, color: 'text-primary', bg: 'bg-primary/8 border-primary/20' },
            ].map(({ label, value, color, bg }) => (
              <Card key={label} className={`border ${bg}`}>
                <CardContent className="p-3 text-center">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>{label}</p>
                  <p className="text-2xl font-bold mt-0.5">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SFT status */}
          <Link to="/admin/pt" className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeWindows.length > 0 ? 'bg-green-500/15' : 'bg-muted'}`}>
              <Activity className={`h-4 w-4 ${activeWindows.length > 0 ? 'text-green-400' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">SFT Window</p>
              <p className="text-xs text-muted-foreground">{activeWindows.length > 0 ? `${activeWindows.length} active session` : 'No active session'}</p>
            </div>
            {activeWindows.length > 0 && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</h2>
          <div className="space-y-1.5">
            <NavLink to="/admin/locations" icon={MapPin} label="Movement Log" badge={outNow > 0 ? `${outNow} out` : null} />
            <NavLink to="/admin/parade-state" icon={ClipboardList} label="Parade State" />
            <NavLink to="/admin/pt" icon={Activity} label="PT / SFT Admin" />
            <NavLink to="/actions/status/update/RSO" icon={FileText} label="Status Approvals" badge={pendingApprovals.length > 0 ? `${pendingApprovals.length}` : null} />
            <NavLink to="/admin/announcements" icon={Megaphone} label="Announcements" />
            <NavLink to="/admin/cet" icon={Calendar} label="Send CET" />
            <NavLink to="/points" icon={Trophy} label="Points & Leaderboard" />
            <NavLink to="/admin/import" icon={Upload} label="Import Users" />
            <NavLink to="/admin/data-clear" icon={Trash2} label="Data Clear" />
          </div>
        </div>
      </div>
    </div>
  );
}