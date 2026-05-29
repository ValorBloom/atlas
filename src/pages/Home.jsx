import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullToRefresh from '@/components/layout/PullToRefresh';
import { isInstructor, isCadetAdmin, formatRankName } from '@/lib/constants';

const ATLAS_LOGO_DARK = 'https://media.base44.com/images/public/69e4b33d62de074557854c0f/299b68b6d_image-removebg-preview.png';
import {
  MapPin, Activity, FileText, Bell,
  ClipboardList, ChevronRight, Megaphone,
  Calendar, Dumbbell, Users, Shield, CheckSquare, Settings, X, Check, CalendarDays,
  Eye, EyeOff, ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import TodaySummary from '@/components/home/TodaySummary';
import { SkeletonGrid } from '@/components/ui/SkeletonCard';
import { motion } from 'framer-motion';

// All available pinnable actions for cadets
const ALL_CADET_ACTIONS = [
  { key: 'movement', to: '/actions/movement', icon: MapPin, label: 'Movement', color: 'primary' },
  { key: 'sft', to: '/actions/sft', icon: Activity, label: 'SFT', color: 'green' },
  { key: 'status', to: '/actions/status', icon: FileText, label: 'Status', color: 'amber' },
  { key: 'cet', to: '/actions/cet', icon: Calendar, label: 'View CET', color: 'blue' },
  { key: 'duty', to: '/actions/duty', icon: CalendarDays, label: 'Duty', color: 'purple' },
  { key: 'tasks', to: '/tasks', icon: ListTodo, label: 'Tasks', color: 'green' },
];

const DEFAULT_PINNED = ['movement', 'cet', 'sft'];

const ACTION_ICON_STYLES = {
  primary: { wrap: 'bg-primary/15', icon: 'text-primary' },
  green: { wrap: 'bg-green-500/15', icon: 'text-green-400' },
  amber: { wrap: 'bg-amber-500/15', icon: 'text-amber-400' },
  blue: { wrap: 'bg-primary/15', icon: 'text-primary' },
  purple: { wrap: 'bg-violet-500/15', icon: 'text-violet-400' },
  default: { wrap: 'bg-muted', icon: 'text-foreground/60' },
};

function SectionLabel({ children }) {
  return <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] px-0.5">{children}</p>;
}

function InitialsAvatar({ name, size = 'sm' }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div className={`rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 ${size === 'sm' ? 'w-9 h-9' : 'w-10 h-10'}`}>
      <span className="text-[11px] font-bold text-primary">{initials}</span>
    </div>
  );
}

// Compact action tile for instructors on home (2-col grid)
function InstructorTile({ to, icon: Icon, label, sub, accent = 'default', badge }) {
  const styles = {
    blue: { wrap: 'bg-primary/10', icon: 'text-primary' },
    amber: { wrap: 'bg-amber-500/10', icon: 'text-amber-400' },
    green: { wrap: 'bg-green-500/10', icon: 'text-green-400' },
    default: { wrap: 'bg-muted/50', icon: 'text-muted-foreground' },
  };
  const s = styles[accent] || styles.default;
  return (
    <Link to={to} className="flex flex-col gap-2.5 p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-muted/20 active:scale-[0.97] transition-all relative overflow-hidden">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', s.wrap)}>
        <Icon className={cn('h-[18px] w-[18px]', s.icon)} />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className="absolute top-2.5 right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Home() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const containerRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    await qc.invalidateQueries({ queryKey: ['sft-windows-active'] });
    await qc.invalidateQueries({ queryKey: ['movements-active-home'] });
    await qc.invalidateQueries({ queryKey: ['cet-today'] });
    await qc.invalidateQueries({ queryKey: ['tasks'] });
    setLastUpdated(Date.now());
  };
  const { pullDistance, refreshing } = usePullToRefresh(refresh, containerRef);
  const [customizing, setCustomizing] = useState(false);
  const [showQuote, setShowQuote] = useState(true);

  useEffect(() => {
    if (user && !user.unit) navigate('/setup', { replace: true });
  }, [user]);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-unread', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email, is_read: false }, '-created_date', 5),
    enabled: !!user?.email,
  });

  const { data: activeWindows = [] } = useQuery({
    queryKey: ['sft-windows-active', user?.unit],
    queryFn: () => base44.entities.SFTWindow.filter({ is_active: true, unit: user?.unit }),
    enabled: !!user?.unit,
  });

  const { data: activeMovements = [] } = useQuery({
    queryKey: ['movements-active-home', user?.unit],
    queryFn: () => base44.entities.MovementLog.filter({ unit: user?.unit, status: 'departed' }, '-created_date', 3),
    enabled: !!user?.unit && (instructor || cadetAdmin),
    refetchInterval: 30000,
  });

  const { data: pendingStatus = [] } = useQuery({
    queryKey: ['status-pending-home', user?.unit],
    queryFn: () => base44.entities.StatusReport.filter({ unit: user?.unit, status: 'pending_approval' }, '-created_date', 5),
    enabled: !!user?.unit && instructor,
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: todayCET } = useQuery({
    queryKey: ['cet-today', user?.unit],
    queryFn: () => base44.entities.CETRecord.filter({ unit: user?.unit, date: todayStr, is_published: true }, '-date', 1),
    enabled: !!user?.unit && !instructor,
    select: data => data?.[0],
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ['tasks-mine-home', user?.id, user?.unit],
    queryFn: () => base44.entities.Task.filter({ unit: user?.unit, assigned_to_id: user?.id, status: 'Not Done' }, '-created_date', 20),
    enabled: !!user?.unit && !!user?.id && !instructor,
  });

  const { data: homeConfig } = useQuery({
    queryKey: ['home-config', user?.id],
    queryFn: () => base44.entities.HomeConfig.filter({ user_id: user?.id }),
    enabled: !!user?.id && !instructor,
    select: data => data?.[0],
  });

  const pinnedKeys = homeConfig?.pinned_actions || DEFAULT_PINNED;

  const savePinned = async (keys) => {
    if (homeConfig?.id) {
      await base44.entities.HomeConfig.update(homeConfig.id, { pinned_actions: keys });
    } else {
      await base44.entities.HomeConfig.create({ user_id: user?.id, pinned_actions: keys });
    }
    qc.invalidateQueries({ queryKey: ['home-config', user?.id] });
  };

  const togglePin = (key) => {
    const current = [...pinnedKeys];
    if (current.includes(key)) {
      savePinned(current.filter(k => k !== key));
    } else {
      savePinned([...current, key]);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const name = user?.display_name || user?.full_name || '';
  const lastName = name.split(' ').slice(-1)[0] || '';
  const displayName = instructor
    ? (user?.rank ? `${user.rank} ${lastName}` : name || 'Instructor')
    : (formatRankName(user?.rank || '', name) || 'Welcome');

  const unread = notifications.length;
  const pinnedActions = ALL_CADET_ACTIONS.filter(a => pinnedKeys.includes(a.key));

  // One-line day summary
  const daySummary = () => {
    const parts = [];
    if (!instructor) {
      if (myTasks.length > 0) parts.push(`${myTasks.length} task${myTasks.length > 1 ? 's' : ''} due`);
    } else {
      if (pendingStatus.length > 0) parts.push(`${pendingStatus.length} status pending`);
      if (activeMovements.length > 0) parts.push(`${activeMovements.length} out`);
    }
    if (activeWindows.length > 0) parts.push('SFT open');
    return parts.length > 0 ? parts.join(' · ') : null;
  };
  const summary = daySummary();

  // ── INSTRUCTOR HOME ──
  if (instructor) {
    return (
      <div className="pb-24 relative" ref={containerRef}>
        <PullToRefresh pullDistance={pullDistance} refreshing={refreshing} lastUpdated={lastUpdated} />
        {/* Header */}
        <div className="px-4 pt-12 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <img src={ATLAS_LOGO_DARK} alt="ATLAS" width={14} height={14} style={{ objectFit: 'contain', opacity: 0.5 }} />
                <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">{user?.unit}</span>
              </div>
              <h1 className="text-[22px] font-bold text-foreground leading-tight">{displayName}</h1>
              {summary && <p className="text-[11px] text-muted-foreground mt-1">{summary}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Link to="/notifications" className="relative w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>
                )}
              </Link>
              <Link to="/profile">
                <InitialsAvatar name={name} />
              </Link>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-4">
          {/* Today summary — single consolidated alert, no duplicate strip */}
          <TodaySummary
            statusCount={pendingStatus.length}
            outCount={activeMovements.length}
          />

          {/* Primary action grid */}
          <div className="space-y-2">
            <SectionLabel>Approvals & Reports</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <InstructorTile to="/admin/parade-state" icon={CheckSquare} label="Status Approvals" sub="RSO · RSI · MA" accent="amber" badge={pendingStatus.length > 0 ? pendingStatus.length : null} />
              <InstructorTile to="/admin/pt" icon={Activity} label="SFT Approval" sub="Review submissions" accent="green" />
              <InstructorTile to="/admin/parade-state" icon={ClipboardList} label="Parade State" sub="View & finalise" accent="blue" />
              <InstructorTile to="/admin/locations" icon={MapPin} label="Movement Log" sub="Live tracking" accent="default" badge={activeMovements.length > 0 ? activeMovements.length : null} />
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>Communications & Duties</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <InstructorTile to="/admin/cet" icon={Calendar} label="Send CET" sub="Daily programme" accent="green" />
              <InstructorTile to="/admin/announcements" icon={Megaphone} label="Announcements" sub="Unit notices" accent="default" />
              <InstructorTile to="/admin/duty" icon={CalendarDays} label="Duty Admin" sub="Assign & track duty" accent="blue" />
              <InstructorTile to="/tasks" icon={ListTodo} label="Tasks" sub="Assign & track tasks" accent="green" />
            </div>
          </div>

          {/* Dashboard shortcut */}
          <Link to="/admin" className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Command Centre</p>
                <p className="text-[11px] text-muted-foreground">Unit overview & management</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          </Link>
        </div>
      </div>
    );
  }

  // ── CADET / CADET ADMIN HOME ──
  return (
    <div className="pb-24 relative" ref={containerRef}>
      <PullToRefresh pullDistance={pullDistance} refreshing={refreshing} lastUpdated={lastUpdated} />
      {/* Cadet header */}
      <div className="px-4 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <img src={ATLAS_LOGO_DARK} alt="ATLAS" width={14} height={14} style={{ objectFit: 'contain', opacity: 0.5 }} />
              <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-medium">{user?.unit}</span>
              {cadetAdmin && (
                <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-semibold border border-amber-500/20">Admin</span>
              )}
            </div>
            <h1 className="text-[22px] font-bold text-foreground leading-tight">{displayName}</h1>
            {summary && <p className="text-[11px] text-muted-foreground mt-1">{summary}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/notifications" className="relative w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>
              )}
            </Link>
            <Link to="/profile">
              <InitialsAvatar name={name} />
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* SFT alert — left-accent strip style */}
        {activeWindows.length > 0 && (
          <Link to="/actions/sft" className="flex items-stretch rounded-xl overflow-hidden border border-border active:scale-[0.98] transition-all bg-card">
            <div className="w-1 bg-primary shrink-0" />
            <div className="flex items-center justify-between flex-1 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">SFT Window Open</p>
                  <p className="text-[10px] text-muted-foreground">{activeWindows[0].start_time}H – {activeWindows[0].end_time}H</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
          </Link>
        )}

        {/* ── Daily CET Quote bar (always shown if CET published, toggleable) ── */}
        {todayCET?.quote ? (
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-stretch">
              {/* Accent bar */}
              <div className="w-1 bg-primary shrink-0" />
              <div className="flex-1 px-3 py-3 min-w-0">
                <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Quote of the Day</p>
                {showQuote ? (
                  <>
                    <p className="text-sm italic text-foreground leading-relaxed">"{todayCET.quote}"</p>
                    {todayCET.quote_author && <p className="text-xs text-primary/60 mt-1">— {todayCET.quote_author}</p>}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Hidden — tap eye to show</p>
                )}
              </div>
              <button
                onClick={() => setShowQuote(v => !v)}
                className="px-3 flex items-center text-primary/50 hover:text-primary transition-colors"
              >
                {showQuote ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : null}

        {/* Today summary for cadets — includes outCount for cadet admin */}
        <TodaySummary
          taskCount={myTasks.length}
          outCount={cadetAdmin ? activeMovements.length : 0}
        />

        {/* ── Quick Actions (customizable grid) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>Quick Actions</SectionLabel>
            <button onClick={() => setCustomizing(!customizing)} className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
              {customizing ? <><X className="h-3 w-3" /> Done</> : <><Settings className="h-3 w-3" /> Customize</>}
            </button>
          </div>

          {customizing ? (
            <div className="grid grid-cols-3 gap-2">
              {ALL_CADET_ACTIONS.map(action => {
                const styles = ACTION_ICON_STYLES[action.color] || ACTION_ICON_STYLES.default;
                const pinned = pinnedKeys.includes(action.key);
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.key}
                    onClick={() => togglePin(action.key)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border transition-all relative',
                      pinned ? 'border-primary/40 bg-primary/8' : 'border-border bg-card opacity-50'
                    )}
                  >
                    {pinned && <Check className="absolute top-1.5 right-1.5 h-3 w-3 text-primary" />}
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', styles.wrap)}>
                      <ActionIcon style={{ width: 18, height: 18 }} className={styles.icon} />
                    </div>
                    <p className="text-[10px] font-semibold text-foreground leading-tight text-center">{action.label}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {pinnedActions.map((action, i) => {
                const styles = ACTION_ICON_STYLES[action.color] || ACTION_ICON_STYLES.default;
                const ActionIcon = action.icon;
                return (
                  <motion.div
                    key={action.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      to={action.to}
                      className="flex flex-col items-center justify-center gap-2.5 py-4 px-2 rounded-2xl border border-border/60 bg-card hover:bg-muted/30 active:scale-[0.96] transition-all w-full"
                    >
                      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', styles.wrap)}>
                        <ActionIcon className={cn('h-5 w-5', styles.icon)} />
                      </div>
                      <p className="text-[11px] font-semibold text-foreground">{action.label}</p>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Cadet Admin section ── */}
        {cadetAdmin && (
          <div className="space-y-2">
            <SectionLabel>Admin</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <InstructorTile to="/admin/pt" icon={Dumbbell} label="PT Admin" sub="SFT session" accent="blue" />
              <InstructorTile to="/admin/parade-state" icon={ClipboardList} label="Parade State" sub="Compile & send" accent="default" />
              <InstructorTile to="/admin/locations" icon={MapPin} label="Movement Log" sub="Track personnel" accent="default" />
              <InstructorTile to="/admin/announcements" icon={Megaphone} label="Announcements" sub="Unit notices" accent="default" />
              <InstructorTile to="/admin/duty" icon={CalendarDays} label="Duty Admin" sub="Assign & track duty" accent="blue" />
              <InstructorTile to="/tasks" icon={ListTodo} label="Tasks" sub="Assign & track tasks" accent="green" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}