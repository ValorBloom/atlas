import React, { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Zap, Bell, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

function getTabForPath(pathname) {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/actions')) return 'actions';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'home';
}

export default function BottomNav({ isInstructor, isCadetAdmin, userEmail }) {
  const navigate = useNavigate();
  const location = useLocation();
  const tabHistory = useRef({
    home: '/',
    actions: '/actions',
    notifications: '/notifications',
    profile: '/profile',
    admin: '/admin',
  });

  const currentTab = getTabForPath(location.pathname);

  useEffect(() => {
    tabHistory.current[currentTab] = location.pathname;
  }, [location.pathname, currentTab]);

  // Unread notification count
  const { data: unreadNotifs = [] } = useQuery({
    queryKey: ['notifications-unread-nav', userEmail],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: userEmail, is_read: false }, '-created_date', 1),
    enabled: !!userEmail,
    refetchInterval: 60000,
    select: d => d,
  });
  const unreadCount = unreadNotifs.length;

  const goToTab = (tabKey, defaultPath) => {
    const remembered = tabHistory.current[tabKey] || defaultPath;
    if (currentTab === tabKey && location.pathname === remembered) {
      navigate(defaultPath, { replace: true });
    } else {
      navigate(remembered);
    }
  };

  const adminItem = isInstructor
    ? { key: 'admin', icon: Shield, label: 'Command', default: '/admin' }
    : null;

  const items = [
    { key: 'home', icon: Home, label: 'Home', default: '/' },
    { key: 'actions', icon: Zap, label: 'Actions', default: '/actions' },
    { key: 'notifications', icon: Bell, label: 'Alerts', default: '/notifications', badge: unreadCount },
    ...(adminItem ? [adminItem] : []),
    { key: 'profile', icon: User, label: 'Profile', default: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {items.map(({ key, icon: Icon, label, default: defaultPath, badge }) => {
          const isActive = currentTab === key;
          return (
            <button
              key={key}
              onClick={() => goToTab(key, defaultPath)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-all min-w-0 flex-1 relative',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {/* Active pill indicator */}
              <div className={cn(
                'absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200',
                isActive ? 'w-6 bg-primary' : 'w-0 bg-transparent'
              )} />
              <div className="relative mt-1">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center pulse-soft">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-normal')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}