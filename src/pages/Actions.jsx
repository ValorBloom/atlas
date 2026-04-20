import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import QuickAction from '@/components/home/QuickAction';
import {
  MapPin, Activity, FileText, Dumbbell, ClipboardList,
  Upload, Trophy, Megaphone, Trash2, Calendar, LayoutDashboard, Users
} from 'lucide-react';

export default function Actions() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);

  return (
    <div>
      <PageHeader title="Actions" subtitle="All available operations" />
      <div className="px-4 py-5 space-y-6">

        {/* Standard cadet operations */}
        {!instructor && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Operations</h2>
            <div className="space-y-1.5">
              <QuickAction to="/actions/movement" icon={MapPin} label="Movement Report" description="Report departure and arrival" />
              <QuickAction to="/actions/sft" icon={Activity} label="SFT Submission" description="Submit your SFT activity" />
              <QuickAction to="/actions/status" icon={FileText} label="Status Report" description="RSO / MA / RSI reporting" />
              <QuickAction to="/points" icon={Trophy} label="Points" description="View and manage points" />
            </div>
          </div>
        )}

        {/* Cadet Admin operations */}
        {cadetAdmin && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Admin Operations</h2>
            <div className="space-y-1.5">
              <QuickAction to="/admin/pt" icon={Dumbbell} label="PT Admin" description="Open SFT session, manage & send report" />
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Compile and send parade state" />
              <QuickAction to="/admin/locations" icon={Users} label="Movement Logs" description="View all movements, highlight pending" />
            </div>
          </div>
        )}

        {/* Instructor operations */}
        {instructor && (
          <>
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Operations</h2>
              <div className="space-y-1.5">
                <QuickAction to="/admin/locations" icon={MapPin} label="Live Locations" description="Where is everyone" />
                <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="View, update & send" />
                <QuickAction to="/actions/status/update/RSO" icon={FileText} label="Status Approvals" description="Approve / reject RSO & status reports" />
                <QuickAction to="/admin/cet" icon={Calendar} label="Send CET" description="Daily timetable with quote" />
                <QuickAction to="/points" icon={Trophy} label="Points" description="View and manage points" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">System</h2>
              <div className="space-y-1.5">
                <QuickAction to="/admin/pt" icon={Dumbbell} label="PT Admin" description="SFT window and approve report" />
                <QuickAction to="/admin/announcements" icon={Megaphone} label="Announcements" description="Post unit-wide notices" />
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