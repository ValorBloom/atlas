import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isInstructor, isCadetAdmin, formatRankName } from '@/lib/constants';
import {
  MapPin, Activity, FileText, Trophy, Bell,
  ClipboardList, ChevronRight, Megaphone, Anchor,
  Calendar, Dumbbell, Users, Shield, CheckSquare, Settings, X, Check, CalendarDays,
  Star
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

function ActionRow({ to, icon: Icon, label, description, accent }) {
  const colors = {
    blue:   { wrap: 'bg-primary/8 border-primary/20 hover:bg-primary/12',   icon: 'bg-primary/15',   text: 'text-primary' },
    amber:  { wrap: 'bg-amber-500/8 border-amber-500/20 hover:bg-amber-500/12', icon: 'bg-amber-500/15', text: 'text-amber-400' },
    green:  { wrap: 'bg-green-500/8 border-green-500/20 hover:bg-green-500/12', icon: 'bg-green-500/15', text: 'text-green-400' },
    red:    { wrap: 'bg-destructive/8 border-destructive/20 hover:bg-destructive/12', icon: 'bg-destructive/15', text: 'text-destructive' },
    default:{ wrap: 'bg-card border-border hover:bg-muted/40', icon: 'bg-muted', text: 'text-foreground/70' },
  };
  const c = colors[accent] || colors.default;
  return (
    <Link to={to} className={cn('flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.97]', c.wrap)}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', c.icon)}>
        <Icon style={{ width: 17, height: 17 }} className={c.text} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
    </Link>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">{children}</p>;
}

export default function Home() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const [customizing, setCustomizing] = useState(false);

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

  // Fetch today's CET for daily message
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: todayCET } = useQuery({
    queryKey: ['cet-today', user?.unit],
    queryFn: () => base44.entities.CETRecord.filter({ unit: user?.unit, date: todayStr, is_published: true }, '-date', 1),
    enabled: !!user?.unit && !instructor,
    select: data => data?.[0],
  });

  // Home config (pinned actions)
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

  const displayName = instructor
    ? (user?.rank ? `${user.rank} ${user?.full_name?.split(' ').slice(-1)[0] || ''}` : user?.full_name || 'Instructor')
    : (formatRankName(user?.rank || '', user?.full_name || '') || 'Welcome');

  const unread = notifications.length;
  const pinnedActions = ALL_CADET_ACTIONS.filter(a => pinnedKeys.includes(a.key));

  return (
    <div className="pb-24">

      {/* ── Hero Header ── */}
      {instructor ? (
        <div className="relative px-4 pt-10 pb-7 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-background to-background pointer-events-none" />
          <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground tracking-wide">{greeting()}, Instructor</p>
              <h1 className="text-2xl font-bold text-foreground leading-tight">{displayName}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-semibold border border-primary/20">{user?.unit}</span>
                <span className="text-[11px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/15">Instructor</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
              <Shield style={{ width: 22, height: 22 }} className="text-primary" />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-10 pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{greeting()}</p>
              <h1 className="text-xl font-bold text-foreground leading-tight">{displayName}</h1>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {user?.unit && (
                  <span className="text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium border border-border">{user.unit}</span>
                )}
                {cadetAdmin ? (
                  <span className="text-[11px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-semibold border border-amber-500/25">Cadet Admin</span>
                ) : (
                  <span className="text-[11px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full border border-border">Cadet</span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-border flex items-center justify-center shrink-0">
              <Anchor style={{ width: 18, height: 18 }} className="text-foreground/60" />
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-5">

        {/* ── Alert Banners ── */}
        <div className="space-y-2">
          {unread > 0 && (
            <Link to="/notifications" className="flex items-center justify-between p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Bell className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <p className="text-sm font-medium text-amber-300">{unread} unread notification{unread > 1 ? 's' : ''}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-500/60" />
            </Link>
          )}

          {activeWindows.length > 0 && !instructor && (
            <Link to="/actions/sft" className="flex items-center justify-between p-3 bg-primary/8 border border-primary/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">SFT Window Open</p>
                  <p className="text-xs text-muted-foreground">{activeWindows[0].start_time}H – {activeWindows[0].end_time}H</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-primary/40" />
            </Link>
          )}

          {instructor && pendingStatus.length > 0 && (
            <Link to="/actions/status/update/RSO" className="flex items-center justify-between p-3 bg-destructive/8 border border-destructive/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive/90">{pendingStatus.length} status pending approval</p>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/40" />
            </Link>
          )}

          {cadetAdmin && activeMovements.length > 0 && (
            <Link to="/admin/locations" className="flex items-center justify-between p-3 bg-destructive/8 border border-destructive/20 rounded-xl transition-all active:scale-[0.98]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive/80">{activeMovements.length} personnel out of camp</p>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/40" />
            </Link>
          )}
        </div>

        {/* ── Daily Message (Cadet: Today's CET quote) ── */}
        {!instructor && todayCET?.quote && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-2">Daily Quote</p>
            <p className="text-sm italic text-foreground leading-relaxed">"{todayCET.quote}"</p>
            {todayCET.quote_author && <p className="text-xs text-primary/70 mt-2">— {todayCET.quote_author}</p>}
          </div>
        )}

        {/* ── INSTRUCTOR PORTAL ── */}
        {instructor && (
          <>
            <div className="space-y-2">
              <SectionLabel>Approvals</SectionLabel>
              <ActionRow to="/actions/status/update/RSO" icon={CheckSquare} label="Status Approvals" description="Approve RSO, RSI & MA" accent="blue" />
              <ActionRow to="/admin/pt" icon={Activity} label="SFT Approval" description="Review & approve SFT list" accent="blue" />
            </div>
            <div className="space-y-2">
              <SectionLabel>Reports</SectionLabel>
              <ActionRow to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="View & finalise" accent="default" />
              <ActionRow to="/admin/locations" icon={MapPin} label="Movement Log" description="All personnel movements" accent="default" />
            </div>
            <div className="space-y-2">
              <SectionLabel>Communications</SectionLabel>
              <ActionRow to="/admin/cet" icon={Calendar} label="Send CET" description="Daily timetable & quote" accent="green" />
              <ActionRow to="/admin/announcements" icon={Megaphone} label="Announcements" description="Post unit-wide notices" accent="green" />
            </div>
            <div className="space-y-2">
              <SectionLabel>Management</SectionLabel>
              <ActionRow to="/admin/appoint" icon={Shield} label="Appoint Cadet Admin" description="Manage admin privileges" accent="amber" />
              <ActionRow to="/admin" icon={Users} label="Dashboard" description="Full instructor panel" accent="default" />
            </div>
          </>
        )}

        {/* ── CADET QUICK ACTIONS (customizable) ── */}
        {!instructor && (
          <>
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

            {cadetAdmin && (
              <div className="space-y-2">
                <SectionLabel>Admin</SectionLabel>
                <ActionRow to="/admin/pt" icon={Dumbbell} label="PT Admin" description="Open SFT session & submit list" accent="blue" />
                <ActionRow to="/admin/parade-state" icon={ClipboardList} label="Parade State" description="Compile & send" accent="default" />
                <ActionRow to="/admin/locations" icon={MapPin} label="Movement Log" description="Track all personnel" accent="default" />
                <ActionRow to="/actions/duty" icon={CalendarDays} label="Duty Roster" description="Manage CDO/CDS/Guard duties" accent="default" />
                <ActionRow to="/admin/announcements" icon={Megaphone} label="Announcements" description="Post unit notices" accent="default" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}