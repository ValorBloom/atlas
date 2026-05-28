import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import LoadingScreen from './LoadingScreen';

export default function MOLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        if (!u?.user_role) {
          navigate('/setup', { replace: true });
        } else if (u.user_role !== 'medical_officer') {
          navigate('/', { replace: true });
        }
      })
      .catch(() => navigate('/setup', { replace: true }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background font-inter max-w-lg mx-auto">
      <Outlet context={{ user, setUser }} />
    </div>
  );
}