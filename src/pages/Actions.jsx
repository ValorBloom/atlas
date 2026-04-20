import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import QuickAction from '@/components/home/QuickAction';
import {
  MapPin, Activity, FileText, Dumbbell, ClipboardList,
  Upload, Trophy, Megaphone, Trash2, Calendar, Users, CheckSquare, Shield, CalendarDays
} from 'lucide-react';

export default function Actions() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);

  return (
    <div>
      <PageHeader title="Actions" subtitle="All available operations" />
      <div className="px-4 py-5 space-y-6 pb-24">

        {/* ── Cadet & CadetAdmin actions ── */}
        {!instructor && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Personal</h2>
            <div className="space-y-1.5">
              <QuickAction to="/actions/movement" icon={MapPin} label="Movement Report" description="Report departure and arrival" />
              <QuickAction to="/actions/sft" icon={Activity} label="SFT Submission" description="Submit your SFT activity" />
              <QuickAction to="/actions/status" icon={FileText} label="Status Report" description="RSO / MA / RSI reporting" />
              <QuickAction to="/actions/cet" icon={Calendar} label="View CET" description="Daily training programme" />
              <QuickAction to="/actions/duty" icon={CalendarDays} label="Duty Roster" description="CDO / CDS / CDG / Guard" />
              <QuickAction to="/points" icon={Trophy} label="Points" description="View leaderboard & history" />
            </div>
          </div>
        )}

        {/* ── Cadet Admin section ── */}
        {cadetAdmin && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Admin</h2>
            <div className="space-y-1.5">
              <QuickAction to="/admin/pt" icon={Dumbbell} label="PT Admin" description="Open SFT session & submit list" />
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Compile and send parade state" />
              <QuickAction to="/admin/locations" icon={MapPin} label="Movement Log" description="View all personnel movements" />
              <QuickAction to="/actions/duty" icon={CalendarDays} label="Duty Roster" description="Manage CDO/CDS/Guard duties" />
              <QuickAction to="/admin/announcements" icon={Megaphone} label="Announcements" description="Post unit-wide notices" />
            </div>
          </div>
        )}

        {/* ── Instructor portal ── */}
        {instructor && (
          <>
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Approvals</h2>
              <div className="space-y-1.5">
                <QuickAction to="/actions/status/update/RSO" icon={CheckSquare} label="Status Approvals" description="Approve / reject RSO, RSI & MA" />
                <QuickAction to="/admin/pt" icon={Activity} label="SFT Approval" description="Review & approve SFT submission" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Reports</h2>
              <div className="space-y-1.5">
                <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="View, update & finalise" />
                <QuickAction to="/admin/locations" icon={MapPin} label="Movement Log" description="All personnel movement history" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Communications</h2>
              <div className="space-y-1.5">
                <QuickAction to="/admin/cet" icon={Calendar} label="Send CET" description="Daily timetable with quote" />
                <QuickAction to="/admin/announcements" icon={Megaphone} label="Announcements" description="Post unit-wide notices" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">System</h2>
              <div className="space-y-1.5">
                <QuickAction to="/admin/appoint" icon={Shield} label="Appoint Cadet Admin" description="Manage admin privileges" />
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