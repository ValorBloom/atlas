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
  ClipboardList, Trophy, Upload, Trash2, Megaphone, ChevronRight, Eye
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, to }) {
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper to={to} className="block">
      <Card className="hover:bg-muted/30 transition-colors">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
          {to && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </CardContent>
      </Card>
    </Wrapper>
  );
}

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
  const outNow = activeMovements.length;

  return (
    <div>
      <PageHeader title="Instructor Dashboard" subtitle={user?.unit} />
      <div className="px-4 py-4 space-y-5">

        {/* Alerts */}
        {pendingApprovals.length > 0 && (
          <Link to="/actions/status/update/RSO">
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {pendingApprovals.length} Pending RSO Approval{pendingApprovals.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-amber-600">Requires your review</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-600" />
              </CardContent>
            </Card>
          </Link>
        )}

        {outNow > 0 && (
          <Link to="/admin/locations">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-primary">{outNow} personnel out of camp</p>
                    <p className="text-xs text-muted-foreground">Tap to view live locations</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-primary" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Unit Stats */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Overview</h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Users} label="Total Strength" value={allUsers.length} />
            <StatCard icon={MapPin} label="Out of Camp" value={outNow} to="/admin/locations" />
            <StatCard icon={Shield} label="Cadets / OCTs" value={cadets.length} />
            <StatCard icon={Activity} label="SFT Window" value={activeWindows.length > 0 ? 'Active' : 'None'} to="/admin/pt" />
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</h2>
          <div className="space-y-1.5">
            <NavLink to="/admin/locations" icon={MapPin} label="Live Locations" badge={outNow > 0 ? `${outNow} out` : null} />
            <NavLink to="/admin/parade-state" icon={ClipboardList} label="Parade State" />
            <NavLink to="/admin/pt" icon={Activity} label="PT / SFT Admin" />
            <NavLink to="/actions/status/update/RSO" icon={FileText} label="Status Approvals" badge={pendingApprovals.length > 0 ? `${pendingApprovals.length}` : null} />
            <NavLink to="/admin/announcements" icon={Megaphone} label="Announcements / CET" />
            <NavLink to="/points" icon={Trophy} label="Points & Leaderboard" />
            <NavLink to="/admin/import" icon={Upload} label="Import Users" />
            <NavLink to="/admin/data-clear" icon={Trash2} label="Data Clear" />
          </div>
        </div>
      </div>
    </div>
  );
}