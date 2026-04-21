import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isInstructor, isCadetAdmin, formatRankName } from '@/lib/constants';
import {
  MapPin, Activity, FileText, Trophy, Bell,
  ClipboardList, ChevronRight, Megaphone,
  Calendar, Dumbbell, Users, Shield, CheckSquare, Settings, X, Check, CalendarDays,
  Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// All available pinnable actions for cadets
const ALL_CADET_ACTIONS = [
  { key: 'movement', to: '/actions/movement', icon: MapPin, label: 'Movement', color: 'primary' },
  { key: 'sft', to: '/actions/sft', icon: Activity, label: 'SFT', color: 'green' },
  { key: 'status', to: '/actions/status', icon: FileText, label: 'Status', color: 'amber' },
  { key: 'points', to: '/points', icon: Trophy, label: 'Points', color: 'default' },
  { key: 'cet', to: '/actions/cet', icon: Calendar, label: 'View CET', color: 'blue' },
  { key: 'duty', to: '/actions/duty', icon: CalendarDays, label: 'Duty', color: 'purple' },
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
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">{children}</p>;
}

// Minimal Atlas mark
function AtlasMark({ className = "text-primary/60" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <ellipse cx="32" cy="32" rx="28" ry="20" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="32" cy="32" rx="12" ry="9" stroke="currentColor" strokeWidth="2.5" />
      <rect x="4" y="27" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="2.5" />
      <rect x="48" y="27" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

// Compact action tile for instructors on home (2-col grid)
function InstructorTile({ to, icon: Icon, label, sub, accent = 'default', badge }) {
  const styles = {
    blue: { wrap: 'bg-primary/10 border-primary/20', icon: 'text-primary' },
    amber: { wrap: 'bg-amber-500/10 border-amber-500/20', icon: 'text-amber-400' },
    green: { wrap: 'bg-green-500/10 border-green-500/20', icon: 'text-green-400' },
    default: { wrap: 'bg-muted/60 border-border', icon: 'text-muted-foreground' },
  };
  const s = styles[accent] || styles.default;
  return (
    <Link to={to} className="flex flex-col gap-2.5 p-3.5 rounded-xl border bg-card hover:bg-muted/20 active:scale-[0.97] transition-all relative overflow-hidden">
      <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center shrink-0', s.wrap)}>
        <Icon className={cn('h-4 w-4', s.icon)} />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
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

  const lastName = user?.full_name?.split(' ').slice(-1)[0] || '';
  const displayName = instructor
    ? (user?.rank ? `${user.rank} ${lastName}` : user?.full_name || 'Instructor')
    : (formatRankName(user?.rank || '', user?.full_name || '') || 'Welcome');

  const unread = notifications.length;
  const pinnedActions = ALL_CADET_ACTIONS.filter(a => pinnedKeys.includes(a.key));

  // ── INSTRUCTOR HOME ──
  if (instructor) {
    return (
      <div className="pb-24">
        {/* Military header */}
        <div className="relative px-4 pt-9 pb-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <AtlasMark />
                <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">Atlas · {user?.unit}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{greeting()}</p>
              <h1 className="text-xl font-bold text-foreground leading-tight mt-0.5">{displayName}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {unread > 0 && (
                <Link to="/notifications" className="relative w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-amber-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>
                </Link>
              )}
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-4">
          {/* Pending alerts strip */}
          {(pendingStatus.length > 0 || activeMovements.length > 0) && (
            <div className="flex gap-2">
              {pendingStatus.length > 0 && (
                <Link to="/actions/status/update/RSO" className="flex-1 flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8">
                  <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-amber-300 truncate">{pendingStatus.length} pending</p>
                    <p className="text-[9px] text-muted-foreground">Status approval</p>
                  </div>
                </Link>
              )}
              {activeMovements.length > 0 && (
                <Link to="/admin/locations" className="flex-1 flex items-center gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/8">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-primary truncate">{activeMovements.length} out</p>
                    <p className="text-[9px] text-muted-foreground">Personnel out</p>
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Primary action grid */}
          <div className="space-y-2">
            <SectionLabel>Approvals & Reports</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <InstructorTile to="/actions/status/update/RSO" icon={CheckSquare} label="Status Approvals" sub="RSO · RSI · MA" accent="amber" badge={pendingStatus.length > 0 ? pendingStatus.length : null} />
              <InstructorTile to="/admin/pt" icon={Activity} label="SFT Approval" sub="Review submissions" accent="green" />
              <InstructorTile to="/admin/parade-state" icon={ClipboardList} label="Parade State" sub="View & finalise" accent="blue" />
              <InstructorTile to="/admin/locations" icon={MapPin} label="Movement Log" sub="Live tracking" accent="default" badge={activeMovements.length > 0 ? activeMovements.length : null} />
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>Communications</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <InstructorTile to="/admin/cet" icon={Calendar} label="Send CET" sub="Daily programme" accent="green" />
              <InstructorTile to="/admin/announcements" icon={Megaphone} label="Announcements" sub="Unit notices" accent="default" />
            </div>
          </div>

          {/* Dashboard shortcut */}
          <Link to="/admin" className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Command Centre</p>
                <p className="text-xs text-muted-foreground">Unit overview & management</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    );
  }

  // ── CADET / CADET ADMIN HOME ──
  return (
    <div className="pb-24">
      {/* Cadet header */}
      <div className="px-4 pt-9 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <AtlasMark />
              <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">Atlas · {user?.unit}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{greeting()}</p>
            <h1 className="text-xl font-bold text-foreground leading-tight mt-0.5">{displayName}</h1>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {cadetAdmin ? (
                <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-semibold border border-amber-500/25">Cadet Admin</span>
              ) : (
                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full border border-border">Cadet</span>
              )}
            </div>
          </div>
          {unread > 0 && (
            <Link to="/notifications" className="relative w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mt-1">
              <Bell className="h-4 w-4 text-amber-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">{unread}</span>
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* Alert banners */}
        <div className="space-y-1.5">
          {activeWindows.length > 0 && (
            <Link to="/actions/sft" className="flex items-center justify-between p-3 bg-primary/8 border border-primary/20 rounded-xl active:scale-[0.98] transition-all">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary">SFT Window Open</p>
                  <p className="text-[10px] text-muted-foreground">{activeWindows[0].start_time}H – {activeWindows[0].end_time}H</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-primary/40" />
            </Link>
          )}
          {cadetAdmin && activeMovements.length > 0 && (
            <Link to="/admin/locations" className="flex items-center justify-between p-3 bg-destructive/8 border border-destructive/20 rounded-xl active:scale-[0.98] transition-all">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-destructive shrink-0" />
                <p className="text-xs font-semibold text-destructive/90">{activeMovements.length} personnel out of camp</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-destructive/40" />
            </Link>
          )}
        </div>

        {/* ── Daily CET Quote bar (always shown if CET published, toggleable) ── */}
        {todayCET?.quote ? (
          <div className="rounded-xl border border-primary/25 bg-primary/8 overflow-hidden">
            <div className="flex items-stretch">
              {/* Accent bar */}
              <div className="w-1 bg-primary/50 shrink-0" />
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
              {pinnedActions.map(action => {
                const styles = ACTION_ICON_STYLES[action.color] || ACTION_ICON_STYLES.default;
                const ActionIcon = action.icon;
                return (
                  <Link
                    key={action.key}
                    to={action.to}
                    className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 active:scale-[0.97] transition-all"
                  >
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', styles.wrap)}>
                      <ActionIcon className={cn('h-5 w-5', styles.icon)} />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{action.label}</p>
                  </Link>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}