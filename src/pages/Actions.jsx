import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { MapPin, Activity, FileText, Calendar, CalendarDays, ListTodo, ClipboardList, Megaphone, Dumbbell, Users, Shield, ChevronRight, LayoutDashboard, CheckSquare, BarChart2 } from 'lucide-react';
import { isCadetAdmin, isInstructor } from '@/lib/constants';
import { cn } from '@/lib/utils';

const CADET_ACTIONS = [
  { to: '/actions/movement', icon: MapPin, label: 'Movement', sub: 'Departure & arrival', accent: 'blue' },
  { to: '/actions/sft', icon: Activity, label: 'SFT', sub: 'Submit activity', accent: 'green' },
  { to: '/actions/status', icon: FileText, label: 'Status', sub: 'RSO · MA · RSI', accent: 'amber' },
  { to: '/actions/cet', icon: Calendar, label: 'View CET', sub: 'Daily programme', accent: 'blue' },
  { to: '/actions/duty', icon: CalendarDays, label: 'Duty', sub: 'View roster', accent: 'purple' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks', sub: 'My assigned tasks', accent: 'green' },
];

const INSTRUCTOR_ADMIN_ACTIONS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', sub: 'Command overview', accent: 'blue' },
  { to: '/admin/parade-state', icon: ClipboardList, label: 'Parade State', sub: 'Compile & send', accent: 'default' },
  { to: '/admin/status-approvals', icon: CheckSquare, label: 'Status Approvals', sub: 'Review pending requests', accent: 'amber' },
  { to: '/admin/locations', icon: MapPin, label: 'Movement Log', sub: 'Track personnel', accent: 'default' },
  { to: '/admin/pt', icon: Dumbbell, label: 'PT Admin', sub: 'SFT sessions', accent: 'blue' },
  { to: '/admin/cet', icon: Calendar, label: 'CET Admin', sub: 'Daily programme', accent: 'blue' },
  { to: '/admin/duty', icon: CalendarDays, label: 'Duty Admin', sub: 'Assign & track', accent: 'purple' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements', sub: 'Unit notices', accent: 'default' },
  { to: '/admin/nominal', icon: Users, label: 'Nominal Role', sub: 'View all personnel', accent: 'default' },
  { to: '/admin/appoint', icon: Shield, label: 'Appoint Admin', sub: 'Grant cadet access', accent: 'amber' },
];

const CADET_ADMIN_ACTIONS = [
  { to: '/admin/parade-state', icon: ClipboardList, label: 'Parade State', sub: 'Compile & send', accent: 'default' },
  { to: '/admin/status-approvals', icon: CheckSquare, label: 'Status Approvals', sub: 'Review pending requests', accent: 'amber' },
  { to: '/admin/locations', icon: MapPin, label: 'Movement Log', sub: 'Track personnel', accent: 'default' },
  { to: '/admin/cet', icon: Calendar, label: 'CET Admin', sub: 'Daily programme', accent: 'blue' },
  { to: '/admin/duty', icon: CalendarDays, label: 'Duty Admin', sub: 'Assign & track', accent: 'purple' },
  { to: '/admin/nominal', icon: Users, label: 'Nominal Role', sub: 'View all personnel', accent: 'default' },
];

const ACCENT_STYLES = {
  blue:    { wrap: 'bg-primary/12', icon: 'text-primary' },
  green:   { wrap: 'bg-green-500/12', icon: 'text-green-400' },
  amber:   { wrap: 'bg-amber-500/12', icon: 'text-amber-400' },
  purple:  { wrap: 'bg-violet-500/12', icon: 'text-violet-400' },
  default: { wrap: 'bg-muted/60', icon: 'text-muted-foreground' },
};

function ActionRow({ to, icon: Icon, label, sub, accent = 'default' }) {
  const s = ACCENT_STYLES[accent] || ACCENT_STYLES.default;
  return (
    <Link
      to={to}
      className="flex items-center gap-3.5 px-4 py-3.5 bg-card border-b border-border/50 last:border-0 active:bg-muted/30 transition-colors"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.wrap)}>
        <Icon className={cn('h-5 w-5', s.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </Link>
  );
}

function SectionHeader({ label }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-4 pt-5 pb-2">
      {label}
    </p>
  );
}

export default function Actions() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const isAdmin = instructor || cadetAdmin;

  // Instructors and cadet admins get an admin-first layout
  if (isAdmin) {
    const adminActions = instructor ? INSTRUCTOR_ADMIN_ACTIONS : CADET_ADMIN_ACTIONS;
    const roleLabel = instructor ? 'Instructor' : 'Cadet Admin';
    return (
      <div className="pb-24">
        <div className="px-4 pt-12 pb-4">
          <h1 className="text-[22px] font-bold text-foreground">Actions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{roleLabel} tools</p>
        </div>

        <SectionHeader label="Admin" />
        <div className="rounded-2xl border border-border/60 mx-4 overflow-hidden bg-card">
          {adminActions.map(a => <ActionRow key={a.to} {...a} />)}
        </div>

        <SectionHeader label="Cadet Actions" />
        <div className="rounded-2xl border border-border/60 mx-4 overflow-hidden bg-card">
          {CADET_ACTIONS.map(a => <ActionRow key={a.to} {...a} />)}
        </div>
      </div>
    );
  }

  // Standard cadet layout
  return (
    <div className="pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-[22px] font-bold text-foreground">Actions</h1>
        <p className="text-xs text-muted-foreground mt-0.5">What would you like to do?</p>
      </div>

      <div className="rounded-2xl border border-border/60 mx-4 overflow-hidden bg-card">
        {CADET_ACTIONS.map(a => <ActionRow key={a.to} {...a} />)}
      </div>
    </div>
  );
}