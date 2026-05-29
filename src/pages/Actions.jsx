import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import QuickAction from '@/components/home/QuickAction';
import {
  MapPin, Activity, FileText, Dumbbell, ClipboardList,
  Users, Megaphone, Trash2, Calendar, CheckSquare, Shield, CalendarDays, ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Compact grid tile for instructors
function ActionTile({ to, icon: Icon, label, sub, accent = 'default' }) {
  const styles = {
    blue: 'bg-primary/10 border-primary/20 text-primary',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    red: 'bg-destructive/10 border-destructive/20 text-destructive',
    default: 'bg-muted border-border text-muted-foreground',
  };
  const s = styles[accent] || styles.default;
  return (
    <Link to={to} className="flex flex-col gap-2 p-3.5 rounded-xl border bg-card hover:bg-muted/30 active:scale-[0.97] transition-all">
      <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center', s)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{sub}</p>}
      </div>
    </Link>
  );
}

export default function Actions() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);

  // Instructors get a unique grid-based layout, not a list
  if (instructor) {
    return (
      <div>
        <PageHeader title="Actions" subtitle="All operations" />
        <div className="px-4 py-4 space-y-5 pb-24">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Approvals</p>
            <div className="grid grid-cols-2 gap-2">
              <ActionTile to="/admin/parade-state" icon={CheckSquare} label="Status Approvals" sub="RSO · RSI · MA" accent="amber" />
              <ActionTile to="/admin/pt" icon={Activity} label="SFT Approval" sub="Review submission list" accent="green" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Reports & Tracking</p>
            <div className="grid grid-cols-2 gap-2">
              <ActionTile to="/admin/parade-state" icon={ClipboardList} label="Parade State" sub="View & finalise" accent="blue" />
              <ActionTile to="/admin/locations" icon={MapPin} label="Movement Log" sub="Live personnel track" accent="blue" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Communications</p>
            <div className="grid grid-cols-2 gap-2">
              <ActionTile to="/admin/cet" icon={Calendar} label="Send CET" sub="Daily timetable" accent="green" />
              <ActionTile to="/admin/announcements" icon={Megaphone} label="Announcements" sub="Unit-wide notices" accent="default" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">System</p>
            <div className="grid grid-cols-2 gap-2">
              <ActionTile to="/admin/appoint" icon={Shield} label="Appoint Admin" sub="Grant cadet access" accent="amber" />
              <ActionTile to="/admin/nominal" icon={Users} label="Nominal Role" sub="View & edit all personnel" accent="default" />
              <ActionTile to="/admin/data-clear" icon={Trash2} label="Data Clear" sub="Controlled wipe" accent="red" />
              <ActionTile to="/tasks" icon={ListTodo} label="Tasks" sub="Assign & track tasks" accent="green" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Cadets & cadet admins keep the list view
  return (
    <div>
      <PageHeader title="Actions" subtitle="All available operations" />
      <div className="px-4 py-5 space-y-6 pb-24">
        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Personal</h2>
          <div className="space-y-1.5">
            <QuickAction to="/actions/movement" icon={MapPin} label="Movement Report" description="Report departure and arrival" />
            <QuickAction to="/actions/sft" icon={Activity} label="SFT Submission" description="Submit your SFT activity" />
            <QuickAction to="/actions/status" icon={FileText} label="Status Report" description="RSO / MA / RSI reporting" />
            <QuickAction to="/actions/cet" icon={Calendar} label="View CET" description="Daily training programme" />
            <QuickAction to="/actions/duty" icon={CalendarDays} label="Duty Roster" description="CDO / CDS / CDG / Guard" />
            <QuickAction to="/tasks" icon={ListTodo} label="My Tasks" description="View tasks assigned to you" />

          </div>
        </div>

        {cadetAdmin && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Admin</h2>
            <div className="space-y-1.5">
              <QuickAction to="/admin/pt" icon={Dumbbell} label="PT Admin" description="Open SFT session & submit list" />
              <QuickAction to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Compile and send parade state" />
              <QuickAction to="/admin/locations" icon={MapPin} label="Movement Log" description="View all personnel movements" />
              <QuickAction to="/actions/duty" icon={CalendarDays} label="Duty Roster" description="Manage CDO/CDS/Guard duties" />
              <QuickAction to="/admin/announcements" icon={Megaphone} label="Announcements" description="Post unit-wide notices" />
              <QuickAction to="/tasks" icon={ListTodo} label="Tasks" description="Assign & track tasks" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}