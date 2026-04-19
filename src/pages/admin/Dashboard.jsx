import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isAdmin } from '@/lib/constants';
import { 
  Users, UserCheck, Shield, Activity, MapPin, FileText, 
  ClipboardList, Trophy, Upload, Trash2, ChevronRight 
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

export default function Dashboard() {
  const { user } = useOutletContext();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: activeWindows = [] } = useQuery({
    queryKey: ['sft-windows-active', user?.unit],
    queryFn: () => base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: recentMovements = [] } = useQuery({
    queryKey: ['recent-movements', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter({ unit: user?.unit }, '-created_date', 5),
    enabled: !!user?.unit,
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pending-approvals', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit: user?.unit, status: 'pending_approval' }),
    enabled: !!user?.unit,
  });

  const cadets = allUsers.filter(u => u.role === 'cadet');
  const instructors = allUsers.filter(u => u.role === 'instructor');
  const admins = allUsers.filter(u => u.is_admin);

  if (!isAdmin(user)) {
    return (
      <div>
        <PageHeader title="Admin" backTo="/" />
        <div className="px-4 py-16 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle={user?.unit} />
      <div className="px-4 py-4 space-y-5">
        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-3">
              <Link to="/actions/status/update/RSO" className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {pendingApprovals.length} Pending Approval{pendingApprovals.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-amber-600">RSO requests awaiting action</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-600" />
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Unit Overview */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Overview</h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={Users} label="Total Strength" value={allUsers.length} />
            <StatCard icon={UserCheck} label="Cadets" value={cadets.length} />
            <StatCard icon={Shield} label="Instructors" value={instructors.length} />
            <StatCard icon={Shield} label="Admins" value={admins.length} />
          </div>
        </div>

        {/* SFT Status */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SFT Status</h2>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              {activeWindows.length > 0 ? (
                <div>
                  <p className="text-sm font-medium">Window Active</p>
                  <p className="text-xs text-muted-foreground">
                    {activeWindows[0].start_time}h – {activeWindows[0].end_time}h
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active SFT window</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
          <div className="space-y-1.5">
            {[
              { to: '/admin/parade-state', icon: ClipboardList, label: 'Parade State' },
              { to: '/admin/pt', icon: Activity, label: 'PT Admin' },
              { to: '/points', icon: Trophy, label: 'Points' },
              { to: '/admin/import', icon: Upload, label: 'Import Users' },
              { to: '/admin/announcements', icon: FileText, label: 'Announcements' },
              { to: '/admin/data-clear', icon: Trash2, label: 'Data Clear' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}