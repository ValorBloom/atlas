import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Zap, Bell, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/actions', icon: Zap, label: 'Actions' },
  { path: '/notifications', icon: Bell, label: 'Alerts' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const adminItem = { path: '/admin', icon: Shield, label: 'Admin' };

export default function BottomNav({ isAdmin }) {
  const location = useLocation();
  const items = isAdmin ? [...navItems, adminItem] : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {items.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-0 flex-1",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn(
                "text-[10px] leading-tight",
                isActive ? "font-semibold" : "font-medium"
              )}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}