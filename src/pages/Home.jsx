import React, { useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { isAdmin, formatRankName } from '@/lib/constants';
import QuickAction from '@/components/home/QuickAction';
import { 
  MapPin, Activity, FileText, Trophy, Bell,
  ClipboardList, Upload, Dumbbell, LayoutDashboard, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const admin = isAdmin(user);

  useEffect(() => {
    if (user && !user.unit) {
      navigate('/setup', { replace: true });
    }
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

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.display_name || formatRankName(user?.rank || '', user?.full_name || '');

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="text-xl font-bold text-foreground">{displayName || 'Welcome'}</h1>
        <div className="flex items-center gap-2 mt-1">
          {user?.unit && (
            <Badge variant="secondary" className="text-xs font-medium">{user.unit}</Badge>
          )}
          {admin && (
            <Badge className="text-xs bg-primary/10 text-primary border-0 font-medium">Admin</Badge>
          )}
        </div>
      </div>

      {/* Active SFT Alert */}
      {activeWindows.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-primary">SFT Window Active</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {activeWindows[0].start_time}h – {activeWindows[0].end_time}h
          </p>
        </div>
      )}

      {/* Unread Notifications */}
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

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickAction to="/actions/movement" icon={MapPin} label="Movement" description="Report movement" variant="primary" />
          <QuickAction to="/actions/sft" icon={Activity} label="SFT" description="Submit SFT activity" variant="primary" />
          <QuickAction to="/actions/status" icon={FileText} label="Status" description="RSO / MA / RSI" />
          <QuickAction to="/points" icon={Trophy} label="Points" description="View leaderboard" />
        </div>
      </div>

      {/* Admin Actions */}
      {admin && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Generate report" />
            <QuickAction to="/admin/pt" icon={Dumbbell} label="PT Admin" description="SFT controls" />
            <QuickAction to="/admin/import" icon={Upload} label="Import Users" description="CSV upload" />
            <QuickAction to="/admin" icon={LayoutDashboard} label="Dashboard" description="Overview" />
          </div>
        </div>
      )}
    </div>
  );
}