import React from 'react';
import { Activity, Megaphone, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MOBottomNav({ activeTab, onTabChange }) {
  const items = [
    { key: 'overview', icon: Activity, label: 'Dashboard' },
    { key: 'announce', icon: Megaphone, label: 'Announce' },
    { key: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {items.map(({ key, icon: Icon, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg transition-all min-w-0 flex-1 relative',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200',
                isActive ? 'w-6 bg-primary' : 'w-0 bg-transparent'
              )} />
              <div className="relative mt-1">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
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