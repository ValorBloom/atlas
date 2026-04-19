import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { isAdmin } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import QuickAction from '@/components/home/QuickAction';
import { Trophy, List, Edit, Shuffle } from 'lucide-react';

export default function Points() {
  const { user } = useOutletContext();
  const admin = isAdmin(user);

  return (
    <div>
      <PageHeader title="Points" backTo="/" />
      <div className="px-4 py-5 space-y-3">
        <QuickAction to="/points/leaderboard" icon={Trophy} label="Leaderboard" description="View current standings" variant="primary" />
        <QuickAction to="/points/logs" icon={List} label="Point Logs" description="View point history" />
        {admin && (
          <>
            <QuickAction to="/points/edit" icon={Edit} label="Edit Points" description="Adjust cadet points" />
            <QuickAction to="/points/draw" icon={Shuffle} label="Draw Names" description="Weighted random draw" />
          </>
        )}
      </div>
    </div>
  );
}