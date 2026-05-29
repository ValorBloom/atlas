import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { isInstructor, isCadetAdmin, isMedicalOfficer } from '@/lib/constants';
import BottomNav from './BottomNav';
import LoadingScreen from './LoadingScreen';

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshUser = async (optimisticUpdates = null) => {
    if (optimisticUpdates) {
      setUser(prev => ({ ...prev, ...optimisticUpdates }));
    }
    // Auth me() always has display_name; entity filter has extra fields like platoon
    const authUser = await base44.auth.me().catch(() => null);
    if (authUser) setUser(prev => ({ ...prev, ...authUser }));
    return authUser;
  };

  useEffect(() => {
    base44.auth.me()
      .then((u) => {
        setUser(u);
        if (u?.user_role === 'medical_officer') {
          navigate('/medical', { replace: true });
        } else if (!u?.unit && location.pathname !== '/setup') {
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            <Outlet context={{ user, setUser, refreshUser }} />
          </motion.div>
        </AnimatePresence>
      </main>
      {!isMedicalOfficer(user) && <BottomNav isInstructor={isInstructor(user)} isCadetAdmin={isCadetAdmin(user)} userEmail={user?.email} />}
    </div>
  );
}