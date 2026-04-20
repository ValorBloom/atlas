import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle2, XCircle, Shield, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { isCadetAdmin, isInstructor } from '@/lib/constants';

const ADMIN_CATEGORIES = ['movement', 'sft', 'status', 'approval', 'admin', 'parade'];
const CADET_CATEGORIES = ['announcement', 'points', 'system'];

const typeIcons = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors = {
  success: 'text-green-400 bg-green-500/15',
  info: 'text-primary bg-primary/10',
  warning: 'text-amber-400 bg-amber-500/15',
  error: 'text-destructive bg-destructive/15',
};

function NotifItem({ notif, onRead }) {
  const Icon = typeIcons[notif.type] || Info;
  const colors = typeColors[notif.type] || typeColors.info;
  return (
    <button
      onClick={() => !notif.is_read && onRead(notif.id)}
      className={cn(
        "w-full text-left p-3.5 rounded-xl border transition-all",
        notif.is_read
          ? "bg-card border-border opacity-60"
          : "bg-card border-border shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-1.5 rounded-lg shrink-0", colors)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm leading-tight", !notif.is_read ? "font-semibold" : "font-medium")}>
              {notif.title}
            </p>
            {!notif.is_read && (
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5">
            {format(new Date(notif.created_date), 'dd MMM, HH:mm')}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function Notifications() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const cadetAdmin = isCadetAdmin(user);
  const instructor = isInstructor(user);
  const showTabs = cadetAdmin || instructor;
  const [tab, setTab] = useState('admin');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter(
      { recipient_email: user?.email }, '-created_date', 100
    ),
    enabled: !!user?.email,
  });

  // Also fetch unit-wide notifications (announcements etc.)
  const { data: unitNotifs = [] } = useQuery({
    queryKey: ['notifications-unit', user?.unit],
    queryFn: () => base44.entities.Notification.filter(
      { recipient_unit: user?.unit }, '-created_date', 100
    ),
    enabled: !!user?.unit,
  });

  // Merge and deduplicate
  const allNotifs = useMemo(() => {
    const map = new Map();
    [...notifications, ...unitNotifs].forEach(n => map.set(n.id, n));
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.created_date) - new Date(a.created_date)
    );
  }, [notifications, unitNotifs]);

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unit'] });
    },
  });

  const markAllRead = async (list) => {
    const unread = list.filter(n => !n.is_read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unit'] });
  };

  const adminNotifs = allNotifs.filter(n => ADMIN_CATEGORIES.includes(n.category));
  const cadetNotifs = allNotifs.filter(n => CADET_CATEGORIES.includes(n.category) || !n.category);

  const currentList = showTabs ? (tab === 'admin' ? adminNotifs : cadetNotifs) : allNotifs;
  const unreadCount = currentList.filter(n => !n.is_read).length;
  const totalUnread = allNotifs.filter(n => !n.is_read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
        rightAction={
          unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1" onClick={() => markAllRead(currentList)}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )
        }
      />

      {/* Tabs for cadet admins / instructors */}
      {showTabs && (
        <div className="flex border-b border-border mx-4">
          <button
            onClick={() => setTab('admin')}
            className={`flex items-center gap-1.5 flex-1 py-2.5 text-sm font-medium transition-colors relative ${
              tab === 'admin' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Admin
            {adminNotifs.filter(n => !n.is_read).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                {adminNotifs.filter(n => !n.is_read).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('cadet')}
            className={`flex items-center gap-1.5 flex-1 py-2.5 text-sm font-medium transition-colors relative ${
              tab === 'cadet' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Announcements
            {cadetNotifs.filter(n => !n.is_read).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                {cadetNotifs.filter(n => !n.is_read).length}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications here</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {currentList.map((notif) => (
              <NotifItem key={notif.id} notif={notif} onRead={(id) => markReadMutation.mutate(id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}