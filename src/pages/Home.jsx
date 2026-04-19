import React, { useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { isInstructor, isCadetAdmin, formatRankName } from '@/lib/constants';
import QuickAction from '@/components/home/QuickAction';
import {
  MapPin, Activity, FileText, Trophy, Bell,
  ClipboardList, Upload, Dumbbell, LayoutDashboard,
  ChevronRight, Eye, Megaphone, Star
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-primary px-4 pt-8 pb-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-primary-foreground/70">{greeting()},</p>
            <h1 className="text-xl font-bold text-primary-foreground">{displayName}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {user?.unit && (
                <span className="text-[11px] font-medium bg-white/20 text-white px-2 py-0.5 rounded-full">{user.unit}</span>
              )}
              {instructor && (
                <span className="text-[11px] font-semibold bg-white/30 text-white px-2 py-0.5 rounded-full">Instructor</span>
              )}
              {cadetAdmin && (
                <span className="text-[11px] font-semibold bg-amber-400/30 text-white px-2 py-0.5 rounded-full">Cadet Admin</span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">A</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">

      {/* Alerts */}
      {notifications.length > 0 && (
        <Link to="/notifications" className="block bg-amber-50 border border-amber-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800">{notifications.length} unread alert{notifications.length > 1 ? 's' : ''}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-500" />
          </div>
        </Link>
      )}

      {/* SFT Active */}
      {activeWindows.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-primary">SFT Window Active</p>
              <p className="text-xs text-muted-foreground">{activeWindows[0].start_time}h – {activeWindows[0].end_time}h</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructor / Cadet Admin: live movement alert */}
      {(instructor || cadetAdmin) && activeMovements.length > 0 && (
        <Link to={instructor ? '/admin/locations' : '/actions/movement'} className="block bg-red-50 border border-red-200 rounded-xl p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-800">{activeMovements.length} personnel out of camp</p>
            </div>
            <ChevronRight className="h-4 w-4 text-red-400" />
          </div>
        </Link>
      )}

      {/* Standard Quick Actions (all users) */}
      {!instructor && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction to="/actions/movement" icon={MapPin} label="Movement" description="Report movement" variant="primary" />
            <QuickAction to="/actions/sft" icon={Activity} label="SFT" description="Submit SFT activity" variant="primary" />
            <QuickAction to="/actions/status" icon={FileText} label="Status" description="RSO / MA / RSI" />
            <QuickAction to="/points" icon={Trophy} label="Points" description="View leaderboard" />
          </div>
        </div>
      )}

      {/* Cadet Admin Actions */}
      {cadetAdmin && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction to="/actions/movement" icon={Eye} label="Movement Logs" description="View all movements" />
            <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Update & send" variant="primary" />
          </div>
        </div>
      )}

      {/* Instructor Actions */}
      {instructor && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instructor Panel</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction to="/admin/locations" icon={MapPin} label="Locations" description="Live tracker" variant="primary" />
            <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="View & send" variant="primary" />
            <QuickAction to="/admin/announcements" icon={Megaphone} label="CET / Announce" description="Send daily CET" />
            <QuickAction to="/admin" icon={LayoutDashboard} label="Dashboard" description="Full admin panel" />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}