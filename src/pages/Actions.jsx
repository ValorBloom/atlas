import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import QuickAction from '@/components/home/QuickAction';
import {
  MapPin, Activity, FileText, Dumbbell, ClipboardList,
  Upload, Trophy, Megaphone, Trash2, Eye, LayoutDashboard
} from 'lucide-react';

export default function Actions() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);

  return (
    <div>
      <PageHeader title="Actions" subtitle="All available operations" />
      <div className="px-4 py-5 space-y-6">

        {/* Standard operations — visible to all cadets & cadet admins */}
        {!instructor && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations</h2>
            <div className="space-y-2">
              <QuickAction to="/actions/movement" icon={MapPin} label="Movement Report" description="Report personnel movement" variant="primary" />
              <QuickAction to="/actions/sft" icon={Activity} label="SFT Submission" description="Submit SFT activity" variant="primary" />
              <QuickAction to="/actions/status" icon={FileText} label="Status Report" description="RSO / MA / RSI reporting" />
              <QuickAction to="/points" icon={Trophy} label="Points" description="View and manage points" />
            </div>
          </div>
        )}

        {/* Cadet Admin operations */}
        {cadetAdmin && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Operations</h2>
            <div className="space-y-2">
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Update & send parade state" variant="primary" />
            </div>
          </div>
        )}

        {/* Instructor operations */}
        {instructor && (
          <>
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations</h2>
              <div className="space-y-2">
                <QuickAction to="/admin/locations" icon={MapPin} label="Live Locations" description="Where is everyone" variant="primary" />
                <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="View, update & send" variant="primary" />
                <QuickAction to="/actions/status/update/RSO" icon={FileText} label="Status Approvals" description="Review RSO & status reports" />
                <QuickAction to="/admin/announcements" icon={Megaphone} label="Announcements / CET" description="Send daily CET updates" />
                <QuickAction to="/points" icon={Trophy} label="Points" description="View and manage points" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System</h2>
              <div className="space-y-2">
                <QuickAction to="/admin/pt" icon={Dumbbell} label="PT Admin" description="SFT window and report controls" />
                <QuickAction to="/admin/import" icon={Upload} label="Import Users" description="Mass import via CSV" />
                <QuickAction to="/admin/data-clear" icon={Trash2} label="Data Clear" description="Controlled data operations" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}