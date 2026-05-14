import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import BottomNav from './BottomNav';
import LoadingScreen from './LoadingScreen';

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshUser = async (optimisticUpdates = null) => {
    if (optimisticUpdates) {
      // Apply updates immediately so UI reflects changes without waiting for cache
      setUser(prev => ({ ...prev, ...optimisticUpdates }));
    }
    // Re-fetch to sync with server
    const u = await base44.entities.User.filter({ email: (await base44.auth.me())?.email }).then(r => r[0]).catch(() => null);
    if (u) setUser(prev => ({ ...prev, ...u }));
    return u;
  };

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        setUser(u);
        if (!u?.unit && location.pathname !== '/setup') {
          navigate('/setup', { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location.pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background font-inter">
      <main className="pb-20 max-w-lg mx-auto min-h-screen overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <Outlet context={{ user, setUser, refreshUser }} />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav isInstructor={isInstructor(user)} isCadetAdmin={isCadetAdmin(user)} />
    </div>
  );
}