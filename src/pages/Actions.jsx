import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { isAdmin } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import QuickAction from '@/components/home/QuickAction';
import { 
  MapPin, Activity, FileText, Dumbbell, ClipboardList, 
  Upload, Trophy, Megaphone, Trash2 
} from 'lucide-react';

export default function Actions() {
  const { user } = useOutletContext();
  const admin = isAdmin(user);

  return (
    <div>
      <PageHeader title="Actions" subtitle="All available operations" />
      <div className="px-4 py-5 space-y-6">
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations</h2>
          <div className="space-y-2">
            <QuickAction to="/actions/movement" icon={MapPin} label="Movement Report" description="Report personnel movement" variant="primary" />
            <QuickAction to="/actions/sft" icon={Activity} label="SFT Submission" description="Submit SFT activity" variant="primary" />
            <QuickAction to="/actions/status" icon={FileText} label="Status Report" description="RSO / MA / RSI reporting" />
            <QuickAction to="/points" icon={Trophy} label="Points" description="View and manage points" />
          </div>
        </div>

        {admin && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Operations</h2>
            <div className="space-y-2">
              <QuickAction to="/admin/pt" icon={Dumbbell} label="PT Admin" description="SFT window and report controls" />
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Generate parade state" />
              <QuickAction to="/admin/import" icon={Upload} label="Import Users" description="Mass import via CSV" />
              <QuickAction to="/admin/announcements" icon={Megaphone} label="Announcements" description="CET announcements" />
              <QuickAction to="/admin/data-clear" icon={Trash2} label="Data Clear" description="Controlled data operations" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}