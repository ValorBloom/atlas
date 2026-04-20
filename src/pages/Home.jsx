import React, { useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { isInstructor, isCadetAdmin, formatRankName } from '@/lib/constants';
import {
  MapPin, Activity, FileText, Trophy, Bell,
  ClipboardList, ChevronRight, Megaphone, Anchor,
  Calendar, Dumbbell, Users, Shield, CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

function ActionRow({ to, icon: Icon, label, description, accent }) {
  const colors = {
    blue:   { wrap: 'bg-primary/8 border-primary/20 hover:bg-primary/12',   icon: 'bg-primary/15',   text: 'text-primary' },
    amber:  { wrap: 'bg-amber-500/8 border-amber-500/20 hover:bg-amber-500/12', icon: 'bg-amber-500/15', text: 'text-amber-400' },
    green:  { wrap: 'bg-green-500/8 border-green-500/20 hover:bg-green-500/12', icon: 'bg-green-500/15', text: 'text-green-400' },
    red:    { wrap: 'bg-destructive/8 border-destructive/20 hover:bg-destructive/12', icon: 'bg-destructive/15', text: 'text-destructive' },
    default:{ wrap: 'bg-card border-border hover:bg-muted/40',               icon: 'bg-muted',         text: 'text-foreground/70' },
  };
  const c = colors[accent] || colors.default;

  return (
    <Link to={to} className={cn(
      'flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.97]',
      c.wrap
    )}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', c.icon)}>
        <Icon style={{ width: 17, height: 17 }} className={c.text} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </Link>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">{children}</p>
  );
}

export default function Home() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);

  useEffect(() => {
    if (user && !user.unit) navigate('/setup', { replace: true });
  }, [user]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-unread', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email, is_read: false }, '-created_date', 5),
    enabled: !!user?.email,
  });

  const { data: activeWindows = [] } = useQuery({
    queryKey: ['sft-windows-active', user?.unit],
    queryFn: () => base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: activeMovements = [] } = useQuery({
    queryKey: ['movements-active-home', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter({ unit: user?.unit, status: 'departed' }, '-created_date', 3),
    enabled: !!user?.unit && (instructor || cadetAdmin),
    refetchInterval: 30000,
  });

  const { data: pendingStatus = [] } = useQuery({
    queryKey: ['status-pending-home', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit: user?.unit, status: 'pending_approval' }, '-created_date', 5),
    enabled: !!user?.unit && instructor,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = instructor
    ? (user?.rank ? `${user.rank} ${user?.full_name?.split(' ').slice(-1)[0] || ''}` : user?.full_name || 'Instructor')
    : (formatRankName(user?.rank || '', user?.full_name || '') || 'Welcome');

  const unread = notifications.length;

  return (
    <div className="pb-24">

      {/* ── Hero Header ── */}
      {instructor ? (
        // Instructor: bold command-style header
        <div className="relative px-4 pt-10 pb-7 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-background to-background pointer-events-none" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground tracking-wide">{greeting()}, Instructor</p>
              <h1 className="text-2xl font-bold text-foreground leading-tight">{displayName}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-semibold">{user?.unit}</span>
                <span className="text-[11px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">Instructor</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <Shield style={{ width: 22, height: 22 }} className="text-primary" />
            </div>
          </div>
        </div>
      ) : (
        // Cadet / CadetAdmin header
        <div className="px-4 pt-10 pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{greeting()}</p>
              <h1 className="text-xl font-bold text-foreground leading-tight">{displayName}</h1>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {user?.unit && (
                  <span className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">{user.unit}</span>
                )}
                {cadetAdmin ? (
                  <span className="text-[11px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-semibold">Cadet Admin</span>
                ) : (
                  <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Cadet</span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
              <Anchor style={{ width: 18, height: 18 }} className="text-foreground/60" />
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-5">

        {/* ── Alert Banners ── */}
        <div className="space-y-2">
          {unread > 0 && (
            <Link to="/notifications" className="flex items-center justify-between p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Bell className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-amber-300">{unread} unread notification{unread > 1 ? 's' : ''}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-500/60" />
            </Link>
          )}

          {activeWindows.length > 0 && !instructor && (
            <Link to="/actions/sft" className="flex items-center justify-between p-3 bg-primary/8 border border-primary/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">SFT Window Open</p>
                  <p className="text-xs text-muted-foreground">{activeWindows[0].start_time}H – {activeWindows[0].end_time}H</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary/40" />
            </Link>
          )}

          {instructor && pendingStatus.length > 0 && (
            <Link to="/actions/status/update/RSO" className="flex items-center justify-between p-3 bg-destructive/8 border border-destructive/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive/90">{pendingStatus.length} status pending approval</p>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/40" />
            </Link>
          )}

          {(cadetAdmin) && activeMovements.length > 0 && (
            <Link to="/admin/locations" className="flex items-center justify-between p-3 bg-destructive/8 border border-destructive/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive/80">{activeMovements.length} personnel out of camp</p>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/40" />
            </Link>
          )}
        </div>

        {/* ── INSTRUCTOR PORTAL ── */}
        {instructor && (
          <>
            <div className="space-y-2">
              <SectionLabel>Approvals</SectionLabel>
              <ActionRow to="/actions/status/update/RSO" icon={CheckSquare} label="Status Approvals" description="Approve RSO, RSI & MA" accent="blue" />
              <ActionRow to="/admin/pt" icon={Activity} label="SFT Approval" description="Review & approve SFT list" accent="blue" />
            </div>
            <div className="space-y-2">
              <SectionLabel>Reports</SectionLabel>
              <ActionRow to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="View & finalise" accent="default" />
              <ActionRow to="/admin/locations" icon={MapPin} label="Movement Log" description="All personnel movements" accent="default" />
            </div>
            <div className="space-y-2">
              <SectionLabel>Communications</SectionLabel>
              <ActionRow to="/admin/cet" icon={Calendar} label="Send CET" description="Daily timetable & quote" accent="green" />
              <ActionRow to="/admin/announcements" icon={Megaphone} label="Announcements" description="Post unit-wide notices" accent="green" />
            </div>
            <div className="space-y-2">
              <SectionLabel>Management</SectionLabel>
              <ActionRow to="/admin/appoint" icon={Shield} label="Appoint Cadet Admin" description="Manage admin privileges" accent="amber" />
              <ActionRow to="/admin" icon={Users} label="Dashboard" description="Full instructor panel" accent="default" />
            </div>
          </>
        )}

        {/* ── CADET ACTIONS ── */}
        {!instructor && (
          <>
            <div className="space-y-2">
              <SectionLabel>Quick Actions</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/actions/movement" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 active:scale-[0.97] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Movement</p>
                </Link>
                <Link to="/actions/sft" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 active:scale-[0.97] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-green-400" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">SFT</p>
                </Link>
                <Link to="/actions/status" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 active:scale-[0.97] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Status</p>
                </Link>
                <Link to="/points" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 active:scale-[0.97] transition-all">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-foreground/60" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Points</p>
                </Link>
              </div>
            </div>

            {cadetAdmin && (
              <div className="space-y-2">
                <SectionLabel>Admin</SectionLabel>
                <ActionRow to="/admin/pt" icon={Dumbbell} label="PT Admin" description="Open SFT session & submit list" accent="blue" />
                <ActionRow to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Compile & send" accent="default" />
                <ActionRow to="/admin/locations" icon={MapPin} label="Movement Log" description="Track all personnel" accent="default" />
                <ActionRow to="/admin/announcements" icon={Megaphone} label="Announcements" description="Post unit notices" accent="default" />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}