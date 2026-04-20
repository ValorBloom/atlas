import React, { useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { isInstructor, isCadetAdmin, formatRankName } from '@/lib/constants';
import QuickAction from '@/components/home/QuickAction';
import {
  MapPin, Activity, FileText, Trophy, Bell,
  ClipboardList, LayoutDashboard,
  ChevronRight, Eye, Megaphone, Anchor
} from 'lucide-react';

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

  return (
    <div className="space-y-5 pb-4">

      {/* Header */}
      <div className="px-4 pt-10 pb-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">{greeting()}</p>
            <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
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
              {user?.section && (
                <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                  {user.section}
                </span>
              )}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                instructor ? 'bg-primary/20 text-primary' :
                cadetAdmin ? 'bg-amber-500/20 text-amber-400' :
                'bg-secondary text-muted-foreground'
              }`}>
                {roleLabel}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
            <Anchor className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">

        {/* Alerts */}
        {notifications.length > 0 && (
          <Link to="/notifications" className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Bell className="h-4 w-4 text-amber-400 shrink-0" />
              <p className="text-sm font-medium text-amber-300">
                {notifications.length} unread alert{notifications.length > 1 ? 's' : ''}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
          </Link>
        )}

        {/* SFT Active */}
        {activeWindows.length > 0 && (
          <div className="flex items-center gap-2.5 p-3.5 bg-primary/10 border border-primary/20 rounded-xl">
            <Activity className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">SFT Window Active</p>
              <p className="text-xs text-muted-foreground">{activeWindows[0].start_time}h – {activeWindows[0].end_time}h</p>
            </div>
          </div>
        )}

        {/* Live movement alert */}
        {(instructor || cadetAdmin) && activeMovements.length > 0 && (
          <Link
            to={instructor ? '/admin/locations' : '/actions/movement'}
            className="flex items-center justify-between p-3.5 bg-destructive/10 border border-destructive/25 rounded-xl"
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm font-medium text-red-400">
                {activeMovements.length} out of camp
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-destructive/60 shrink-0" />
          </Link>
        )}

        {/* Cadet Actions */}
        {!instructor && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction to="/actions/movement" icon={MapPin} label="Movement" description="Depart / Reached" variant="primary" />
              <QuickAction to="/actions/sft" icon={Activity} label="SFT" description="Submit activity" variant="primary" />
              <QuickAction to="/actions/status" icon={FileText} label="Status" description="RSO / MA / RSI" />
              <QuickAction to="/points" icon={Trophy} label="Points" description="Leaderboard" />
            </div>
          </div>
        )}

        {/* Cadet Admin Actions */}
        {cadetAdmin && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Admin</p>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction to="/actions/movement" icon={Eye} label="Movement Logs" description="View all" />
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Update & send" variant="primary" />
            </div>
          </div>
        )}

        {/* Instructor Actions */}
        {instructor && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Instructor Panel</p>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction to="/admin/locations" icon={MapPin} label="Locations" description="Live tracker" variant="primary" />
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="View & send" variant="primary" />
              <QuickAction to="/admin/announcements" icon={Megaphone} label="Announcements" description="Daily CET" />
              <QuickAction to="/admin" icon={LayoutDashboard} label="Dashboard" description="Admin panel" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}