import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const typeIcons = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const typeColors = {
  success: 'text-green-600 bg-green-50',
  info: 'text-primary bg-primary/5',
  warning: 'text-amber-600 bg-amber-50',
  error: 'text-red-600 bg-red-50',
};

export default function Notifications() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter(
      { recipient_email: user?.email }, '-created_date', 50
    ),
    enabled: !!user?.email,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    for (const n of unread) {
      await base44.entities.Notification.update(n.id, { is_read: true });
    }
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      <PageHeader 
        title="Notifications" 
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        rightAction={
          unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )
        }
      />
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {notifications.map((notif) => {
              const Icon = typeIcons[notif.type] || Info;
              const colors = typeColors[notif.type] || typeColors.info;
              return (
                <button
                  key={notif.id}
                  onClick={() => !notif.is_read && markReadMutation.mutate(notif.id)}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all",
                    notif.is_read 
                      ? "bg-card border-border opacity-70" 
                      : "bg-card border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("p-1.5 rounded-lg shrink-0", colors)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notif.is_read ? "font-semibold" : "font-medium"
                        )}>{notif.title}</p>
                        {!notif.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {format(new Date(notif.created_date), 'dd MMM, HH:mm')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}