import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { isAdmin } from '@/lib/constants';
import BottomNav from './BottomNav';

export default function AppLayout() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background font-inter">
      <main className="pb-20 max-w-lg mx-auto">
        <Outlet context={{ user }} />
      </main>
      <BottomNav isAdmin={isAdmin(user)} />
    </div>
  );
}