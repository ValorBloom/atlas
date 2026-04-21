import React, { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Zap, Bell, User, Shield, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tab definitions — each tab remembers the last path visited within its section
const TAB_ROOTS = {
  home: '/',
  actions: '/actions',
  notifications: '/notifications',
  profile: '/profile',
  admin_instructor: '/admin',
  admin_cadet: '/admin',
};

function getTabForPath(pathname) {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/actions')) return 'actions';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/points')) return 'actions'; // points lives under actions section
  return 'home';
}

export default function BottomNav({ isInstructor, isCadetAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Remember last visited path per tab
  const tabHistory = useRef({
    home: '/',
    actions: '/actions',
    notifications: '/notifications',
    profile: '/profile',
    admin: isInstructor ? '/admin' : '/admin',
  });

  const currentTab = getTabForPath(location.pathname);

  // Keep history updated as user navigates
  React.useEffect(() => {
    tabHistory.current[currentTab] = location.pathname;
  }, [location.pathname, currentTab]);

  const goToTab = (tabKey, defaultPath) => {
    const remembered = tabHistory.current[tabKey] || defaultPath;
    // If already on this tab, go to root (native-style double-tap to top)
    if (currentTab === tabKey && location.pathname === remembered) {
      navigate(defaultPath, { replace: true });
    } else {
      navigate(remembered);
    }
  };

  const adminItem = isInstructor
    ? { key: 'admin', icon: Shield, label: 'Instructor', default: '/admin' }
    : isCadetAdmin
    ? { key: 'admin', icon: LayoutDashboard, label: 'Admin', default: '/admin' }
    : null;

  const items = [
    { key: 'home', icon: Home, label: 'Home', default: '/' },
    { key: 'actions', icon: Zap, label: 'Ops', default: '/actions' },
    { key: 'notifications', icon: Bell, label: 'Alerts', default: '/notifications' },
    ...(adminItem ? [adminItem] : []),
    { key: 'profile', icon: User, label: 'Profile', default: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {items.map(({ key, icon: Icon, label, default: defaultPath }) => {
          const isActive = currentTab === key;
          return (
            <button
              key={key}
              onClick={() => goToTab(key, defaultPath)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0 flex-1',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-medium')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}