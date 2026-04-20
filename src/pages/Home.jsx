import React, { useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { isInstructor, isCadetAdmin, formatRankName } from '@/lib/constants';
import QuickAction from '@/components/home/QuickAction';
import {
  MapPin, Activity, FileText, Trophy, Bell,
  ClipboardList, LayoutDashboard, ChevronRight,
  Megaphone, Anchor, Calendar, Dumbbell, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
    queryFn: () => base44.entities.Notification.filter(
      { recipient_email: user?.email, is_read: false }, '-created_date', 5
    ),
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = formatRankName(user?.rank || '', user?.full_name || '') || 'Welcome';
  const roleLabel = instructor ? 'Instructor' : cadetAdmin ? 'Cadet Admin' : 'Cadet';
  const unread = notifications.length;

  return (
    <div className="pb-24">

      {/* Header */}
      <div className="px-4 pt-10 pb-6 bg-gradient-to-b from-background to-background/80">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{greeting()}</p>
            <h1 className="text-xl font-bold text-foreground leading-tight">{displayName}</h1>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {user?.unit && (
                <span className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                  {user.unit}
                </span>
              )}
              {user?.platoon && (
                <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                  {user.platoon}
                </span>
              )}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                instructor ? 'bg-primary/15 text-primary' :
                cadetAdmin ? 'bg-amber-500/15 text-amber-400' :
                'bg-secondary text-muted-foreground'
              }`}>
                {roleLabel}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
            <Anchor style={{ width: 18, height: 18 }} className="text-foreground/60" />
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">

        {/* Alerts row */}
        <div className="space-y-2">
          {unread > 0 && (
            <Link to="/notifications"
              className="flex items-center justify-between p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Bell className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-amber-300">
                  {unread} unread notification{unread > 1 ? 's' : ''}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-500/60" />
            </Link>
          )}

          {activeWindows.length > 0 && (
            <Link to="/actions/sft"
              className="flex items-center justify-between p-3 bg-primary/8 border border-primary/20 rounded-xl transition-all active:scale-[0.98]">
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

          {(instructor || cadetAdmin) && activeMovements.length > 0 && (
            <Link to={instructor ? '/admin/locations' : '/actions/movement'}
              className="flex items-center justify-between p-3 bg-destructive/8 border border-destructive/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive/80">
                  {activeMovements.length} personnel out of camp
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/40" />
            </Link>
          )}
        </div>

        {/* Cadet Actions */}
        {!instructor && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction to="/actions/movement" icon={MapPin} label="Movement" description="Depart / Reached" />
              <QuickAction to="/actions/sft" icon={Activity} label="SFT" description="Submit activity" />
              <QuickAction to="/actions/status" icon={FileText} label="Status" description="RSO / MA / RSI" />
              <QuickAction to="/points" icon={Trophy} label="Points" description="Leaderboard" />
            </div>
          </div>
        )}

        {/* Cadet Admin */}
        {cadetAdmin && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">Admin</p>
            <div className="space-y-1.5">
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Update & send" />
              <QuickAction to="/admin/pt" icon={Dumbbell} label="PT Admin" description="SFT session & report" />
              <QuickAction to="/admin/locations" icon={Users} label="Movement Logs" description="View all movements" />
            </div>
          </div>
        )}

        {/* Instructor */}
        {instructor && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">Instructor Panel</p>
            <div className="space-y-1.5">
              <QuickAction to="/admin/locations" icon={MapPin} label="Live Locations" description="Track personnel movements" />
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="View & send" />
              <QuickAction to="/actions/status/update/RSO" icon={FileText} label="Status Approvals" description="Approve RSO / RSI" />
              <QuickAction to="/admin/cet" icon={Calendar} label="Send CET" description="Daily timetable & quote" />
              <QuickAction to="/admin" icon={LayoutDashboard} label="Dashboard" description="Full instructor panel" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}