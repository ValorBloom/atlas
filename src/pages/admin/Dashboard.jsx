import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isInstructor, isCadetAdmin } from '@/lib/constants';
import {
  Users, Shield, Activity, MapPin, FileText,
  ClipboardList, Trash2, Megaphone, ChevronRight, Calendar, CalendarDays, ListTodo
} from 'lucide-react';

function NavLink({ to, icon: Icon, label, badge }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium flex-1">{label}</span>
      {badge && (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">{badge}</Badge>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: activeMovements = [] } = useQuery({
    queryKey: ['movements-active', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter({ unit: user?.unit, status: 'departed' }, '-created_date', 5),
    enabled: !!user?.unit,
    refetchInterval: 30000,
  });

  const { data: activeWindows = [] } = useQuery({
    queryKey: ['sft-windows-active', user?.unit],
    queryFn: () => base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pending-approvals', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit: user?.unit, status: 'pending_approval' }),
    enabled: !!user?.unit && instructor,
  });

  const { data: activeStatuses = [] } = useQuery({
    queryKey: ['active-statuses-dash', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter(
      { unit: user?.unit, status: { $in: ['active', 'approved', 'pending_approval'] } },
      '-created_date',
      100
    ),
    enabled: !!user?.unit && instructor,
    refetchInterval: 30000,
  });

  if (!instructor && !cadetAdmin) {
    return (
      <div>
        <PageHeader title="Admin" backTo="/" />
        <div className="px-4 py-16 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  // Cadet admin gets a focused view
  if (cadetAdmin && !instructor) {
    return (
      <div className="pb-24">
        <div className="px-4 pt-8 pb-4 space-y-1">
          <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Cadet Admin · {user?.unit}</p>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        </div>
        <div className="px-4 space-y-4">
          {activeMovements.length > 0 && (
            <Link to="/admin/locations" className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/8">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-semibold text-primary flex-1">{activeMovements.length} movement{activeMovements.length > 1 ? 's' : ''} pending return</p>
              <ChevronRight className="h-3.5 w-3.5 text-primary/40" />
            </Link>
          )}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tools</p>
            <div className="space-y-1.5">
              <NavLink to="/admin/pt" icon={Activity} label="PT Admin" />
              <NavLink to="/admin/parade-state" icon={ClipboardList} label="Parade State" />
              <NavLink to="/admin/locations" icon={MapPin} label="Movement Log" badge={activeMovements.length > 0 ? `${activeMovements.length}` : null} />
              <NavLink to="/admin/announcements" icon={Megaphone} label="Announcements" />
              <NavLink to="/actions/cet" icon={Calendar} label="View CET" />
              <NavLink to="/admin/duty" icon={CalendarDays} label="Duty Admin" />

            </div>
          </div>
        </div>
      </div>
    );
  }

  const cadets = allUsers.filter(u => u.user_role === 'cadet' || u.user_role === 'cadet_admin');
  const cadetTotal = cadets.length;

  // A report has an MC if any outcome is MC (new multi-outcome) or legacy status_category is MC
  const hasMC = (s) =>
    s.status_category === 'MC' ||
    (Array.isArray(s.outcomes) && s.outcomes.some(o => o.category === 'MC'));

  // Cadets on MC are out of camp — collect their IDs
  const mcCadetIds = new Set(
    activeStatuses.filter(s => (s.type === 'RSO' || s.type === 'RSI') && hasMC(s))
      .map(s => s.personnel_id).filter(Boolean)
  );
  // Movement out-of-camp IDs
  const movementOutIds = new Set(activeMovements.map(m => m.personnel_id).filter(Boolean));
  // Union — anyone out via movement OR on MC counts as out of camp
  const outOfCampIds = new Set([...mcCadetIds, ...movementOutIds]);
  const outNow = outOfCampIds.size;
  const movementOut = movementOutIds.size; // movement-only count for the Movement Log links

  const cadetInCamp = Math.max(cadetTotal - outNow, 0);
  const pctInCamp = cadetTotal > 0 ? Math.round((cadetInCamp / cadetTotal) * 100) : 0;

  // Count DISTINCT cadets per type (a cadet may have multiple reports) — take latest type per person
  const distinctCadetsByType = (type) => new Set(
    activeStatuses.filter(s => s.type === type).map(s => s.personnel_id).filter(Boolean)
  ).size;
  const rsoCount = distinctCadetsByType('RSO');
  const maCount = distinctCadetsByType('MA');
  const rsiCount = distinctCadetsByType('RSI');

  // Distinct cadets on a non-MC medical/MA status still in camp but not effective
  // (MC holders already removed via outNow)
  const inCampStatusIds = new Set(
    activeStatuses
      .filter(s => (s.type === 'RSO' || s.type === 'RSI' || s.type === 'MA') && !mcCadetIds.has(s.personnel_id))
      .map(s => s.personnel_id)
      .filter(Boolean)
  );
  const inCampOnStatus = inCampStatusIds.size;
  const effectiveStrength = Math.max(cadetInCamp - inCampOnStatus, 0);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 space-y-1">
        <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase">Instructor · {user?.unit}</p>
        <h1 className="text-2xl font-bold tracking-tight">Command Centre</h1>
      </div>

      <div className="px-4 space-y-4">

        {/* Alert strip — only visible when needed */}
        {(pendingApprovals.length > 0 || movementOut > 0) && (
          <div className="space-y-1.5">
            {pendingApprovals.length > 0 && (
              <Link to="/admin/status-approvals" className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/25 bg-amber-500/8">
                <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs font-semibold text-amber-300 flex-1">{pendingApprovals.length} status pending approval</p>
                <ChevronRight className="h-3.5 w-3.5 text-amber-500/50" />
              </Link>
            )}
            {movementOut > 0 && (
              <Link to="/admin/locations" className="flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/8">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs font-semibold text-primary flex-1">{movementOut} personnel out of camp</p>
                <ChevronRight className="h-3.5 w-3.5 text-primary/40" />
              </Link>
            )}
          </div>
        )}

        {/* Unit Strength — cadets only */}
        <Card className="border-primary/15 overflow-hidden">
          <CardContent className="p-0">
            <div className="px-4 pt-4 pb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Cadet Strength</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums text-foreground">{cadetInCamp}</span>
                  <span className="text-base text-muted-foreground font-medium">/ {cadetTotal}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{pctInCamp}% in camp</p>
              </div>
              <div className="text-right pb-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Effective</p>
                <p className="text-2xl font-bold text-green-400 tabular-nums">{Math.max(effectiveStrength, 0)}</p>
              </div>
            </div>
            {/* Segmented bar */}
            <div className="px-4 pb-4 space-y-1.5">
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${cadetTotal > 0 ? (Math.max(effectiveStrength,0)/cadetTotal)*100 : 0}%` }} />
                {inCampOnStatus > 0 && (
                  <div className="h-full bg-destructive/60 transition-all" style={{ width: `${cadetTotal > 0 ? (inCampOnStatus/cadetTotal)*100 : 0}%` }} />
                )}
                {outNow > 0 && (
                  <div className="h-full bg-amber-500/50 rounded-r-full transition-all" style={{ width: `${cadetTotal > 0 ? (outNow/cadetTotal)*100 : 0}%` }} />
                )}
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Effective</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive/60 inline-block" />Status</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/50 inline-block" />Out</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4-tile status grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'RSO', value: rsoCount, color: 'text-destructive', bg: 'bg-destructive/8 border-destructive/20' },
            { label: 'RSI', value: rsiCount, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20' },
            { label: 'MA', value: maCount, color: 'text-primary', bg: 'bg-primary/8 border-primary/20' },
            { label: 'Out', value: movementOut, color: 'text-orange-400', bg: 'bg-orange-500/8 border-orange-500/20' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border p-2.5 text-center ${bg}`}>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${color}`}>{label}</p>
              <p className="text-xl font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* SFT & quick tools row */}
        <div className="grid grid-cols-2 gap-2">
          <Link to="/admin/pt" className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeWindows.length > 0 ? 'bg-green-500/15' : 'bg-muted'}`}>
              <Activity className={`h-4 w-4 ${activeWindows.length > 0 ? 'text-green-400' : 'text-muted-foreground'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">SFT</p>
              <p className="text-[10px] text-muted-foreground">{activeWindows.length > 0 ? 'Live session' : 'No session'}</p>
            </div>
            {activeWindows.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-auto shrink-0" />}
          </Link>
          <Link to="/admin/parade-state" className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold">Parade State</p>
              <p className="text-[10px] text-muted-foreground">View report</p>
            </div>
          </Link>
        </div>

        {/* Management links */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Management</p>
          <div className="space-y-1.5">
            <NavLink to="/admin/locations" icon={MapPin} label="Movement Log" badge={movementOut > 0 ? `${movementOut} out` : null} />
            <NavLink to="/admin/status-approvals" icon={FileText} label="Status Approvals" badge={pendingApprovals.length > 0 ? `${pendingApprovals.length}` : null} />
            <NavLink to="/admin/cet" icon={Calendar} label="Send CET" />
            <NavLink to="/admin/announcements" icon={Megaphone} label="Announcements" />
            <NavLink to="/admin/duty" icon={CalendarDays} label="Duty Admin" />
            <NavLink to="/tasks" icon={ListTodo} label="Tasks" />
            <NavLink to="/admin/nominal" icon={Users} label="Nominal Role" />
            <NavLink to="/admin/data-clear" icon={Trash2} label="Data Clear" />
          </div>
        </div>
      </div>
    </div>
  );
}