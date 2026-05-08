import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileSelect, MobileSelectItem } from '@/components/ui/MobileSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RANKS, UNITS, isInstructor, isCadetAdmin, getGroupLabel, getGroupOptions } from '@/lib/constants';

const ATLAS_LOGO_LIGHT = 'https://media.base44.com/images/public/69e4b33d62de074557854c0f/2885c3eb3_8b77309c-da5d-492a-af37-aa6aa8c79a0b-removebg-preview.png';
const ATLAS_LOGO_DARK = 'https://media.base44.com/images/public/69e4b33d62de074557854c0f/299b68b6d_image-removebg-preview.png';
import { LogOut, Trash2, Moon, Sun, ChevronRight, Bell, Shield, Upload, Star, KeyRound, Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '@/lib/ThemeContext';
import { cn } from '@/lib/utils';

function AtlasMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
      <circle cx="50" cy="45" r="36" stroke="currentColor" strokeWidth="3.5" strokeDasharray="5 3" opacity="0.5" />
      <path d="M50 12 L72 72 H28 Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path d="M50 28 L58 52 H42 Z" fill="currentColor" opacity="0.7" />
      <polygon points="50,7 47,13 53,13" fill="currentColor" opacity="0.5" />
      <polygon points="14,45 20,42 20,48" fill="currentColor" opacity="0.7" />
      <polygon points="86,45 80,42 80,48" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export default function Profile() {
  const { user, refreshUser } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const { theme, toggleTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // PIN gate for saving (required when changing unit)
  const [showPinGate, setShowPinGate] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        rank: user.rank || '',
        unit: user.unit || '',
        platoon: user.platoon || '',
      });
    }
  }, [user]);

  const unitChanged = editing && form.unit !== (user?.unit || '');
  const needsPin = unitChanged;

  const handleSaveClick = () => {
    if (needsPin) {
      setPinInput('');
      setPinError('');
      setShowPinGate(true);
    } else {
      doSave();
    }
  };

  const doSave = async () => {
    setSaving(true);
    setPinError('');

    // Send all editable fields on every save
    const updates = {
      full_name: form.full_name,
      rank: form.rank,
      unit: form.unit,
      platoon: form.platoon || null,
    };

    const res = await base44.functions.invoke('updateProfile', {
      updates,
      unitPin: needsPin ? pinInput : undefined,
    });

    if (res?.data?.error) {
      const msg = res.data.error;
      // Show PIN errors inline in the PIN gate, others as toast
      if (showPinGate || msg.toLowerCase().includes('pin') || msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('transfer')) {
        setPinError(msg);
      } else {
        toast.error(msg);
      }
      setSaving(false);
      return;
    }

    // Sync session cache + refresh UI
    await base44.auth.updateMe(updates).catch(() => {});
    await refreshUser().catch(() => {});
    setSaving(false);
    setEditing(false);
    setShowPinGate(false);
    setPinInput('');
    toast.success('Profile updated');
  };

  const handlePinConfirm = () => {
    doSave();
  };

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm || pwForm.next.length < 6) return;
    setPwSaving(true);
    await base44.auth.updateMe({ password: pwForm.next });
    setPwSaving(false);
    setShowChangePassword(false);
    setPwForm({ next: '', confirm: '' });
    toast.success('Password updated');
  };

  const handleDeleteAccount = async () => {
    if (deleteInput.trim() !== user?.full_name?.trim()) return;
    setDeleting(true);
    await base44.entities.User.delete(user.id);
    base44.auth.logout('/');
  };

  const fullName = user?.full_name || '';
  const deleteReady = deleteInput.trim() === fullName.trim() && fullName.length > 0;
  const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = instructor ? 'Instructor' : cadetAdmin ? 'Cadet Admin' : 'Cadet';
  const groupLabel = getGroupLabel(user?.unit);
  const groupOptions = getGroupOptions(form.unit || user?.unit);
  const logoUrl = theme === 'dark' ? ATLAS_LOGO_DARK : ATLAS_LOGO_LIGHT;

  return (
    <div className="pb-24">
      <PageHeader
        title="Profile"
        rightAction={
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs gap-1.5" onClick={() => base44.auth.logout('/')}>
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        }
      />

      <div className="px-4 py-5 space-y-4">

        {/* ── Identity Hero ── */}
        <div className="relative rounded-2xl overflow-hidden border border-primary/30 bg-primary/5 dark:bg-[hsl(222,24%,10%)]">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(hsl(217,91%,55%) 1px, transparent 1px), linear-gradient(90deg, hsl(217,91%,55%) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-primary/40 rounded-tl" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-primary/40 rounded-tr" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-primary/40 rounded-bl" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-primary/40 rounded-br" />

          <div className="relative px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border border-primary/25 bg-primary/15">
                <span className="text-2xl font-bold text-primary">{initials || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <AtlasMark size={14} />
                  <span className="text-[9px] tracking-[0.2em] uppercase text-primary/70 font-semibold">ATLAS ID</span>
                </div>
                <p className="text-base font-bold text-foreground leading-tight truncate">{fullName || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{user?.rank || ''}{user?.rank ? ' · ' : ''}{user?.unit || user?.email}</p>
              </div>
            </div>
            <div className="border-t border-primary/15 mt-4 pt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Rank</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{user?.rank || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Unit</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{user?.unit || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Role</p>
                <p className="text-sm font-bold text-foreground mt-0.5 truncate">{roleLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Details ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Details</p>
            {!editing ? (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {
                setForm({ full_name: user?.full_name || '', rank: user?.rank || '', unit: user?.unit || '', platoon: user?.platoon || '' });
                setEditing(true);
              }}>Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setEditing(false); setShowPinGate(false); setPinInput(''); setPinError(''); }}>Cancel</Button>
                <Button size="sm" className="text-xs h-7" onClick={handleSaveClick} disabled={saving}>
                  {saving ? 'Saving…' : needsPin ? 'Save (PIN required)' : 'Save'}
                </Button>
              </div>
            )}
          </div>

          <div className="divide-y divide-border">
            {/* Email — read-only */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-muted-foreground">{user?.email || '—'}</span>
            </div>

            {/* Full Name */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Name</span>
              {editing ? (
                <Input
                  className="h-9 w-44 text-sm bg-background border-border"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Full name"
                />
              ) : (
                <span className="text-sm font-medium">{user?.full_name || '—'}</span>
              )}
            </div>

            {/* Rank */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Rank</span>
              {editing ? (
                <MobileSelect value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })} placeholder="Rank" className="h-9 w-36 text-sm bg-background border-border">
                  {RANKS.map(r => <MobileSelectItem key={r} value={r}>{r}</MobileSelectItem>)}
                </MobileSelect>
              ) : (
                <span className="text-sm font-medium">{user?.rank || '—'}</span>
              )}
            </div>

            {/* Unit — PIN gated */}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-sm text-muted-foreground">Unit</span>
                {editing && <p className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Requires unit PIN</p>}
              </div>
              {editing ? (
                <MobileSelect value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v, platoon: '' })} placeholder="Unit" className="h-9 w-36 text-sm bg-background border-border">
                  {UNITS.map(u => <MobileSelectItem key={u} value={u}>{u}</MobileSelectItem>)}
                </MobileSelect>
              ) : (
                <span className="text-sm font-medium">{user?.unit || '—'}</span>
              )}
            </div>

            {/* Group */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">{groupLabel}</span>
              {editing ? (
                <MobileSelect value={form.platoon} onValueChange={(v) => setForm({ ...form, platoon: v })} placeholder="Select…" className="h-9 w-44 text-sm bg-background border-border">
                  {(groupOptions || []).map(g => (
                    <MobileSelectItem key={g} value={g}>{g}</MobileSelectItem>
                  ))}
                </MobileSelect>
              ) : (
                <span className="text-sm font-medium">{user?.platoon || '—'}</span>
              )}
            </div>


          </div>

          {/* PIN Gate (inline, shown when unit changed and Save clicked) */}
          {showPinGate && (
            <div className="px-4 pb-4 pt-3 border-t border-border bg-amber-500/5 space-y-2.5">
              <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                {instructor ? 'Enter instructor auth code to confirm' : `Enter PIN for ${form.unit} to confirm unit change`}
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Enter PIN"
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                  className="h-9 text-sm font-mono tracking-widest flex-1"
                />
                <Button size="sm" className="h-9 px-4 text-xs" onClick={handlePinConfirm} disabled={saving || !pinInput}>
                  {saving ? '…' : 'Confirm'}
                </Button>
              </div>
              {pinError && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">{pinError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* ── Settings ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Settings</p>
          </div>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {theme === 'dark' ? <Moon className="h-3.5 w-3.5 text-primary" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Appearance</p>
                <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark mode active' : 'Light mode active'}</p>
              </div>
            </div>
            <div className={cn('w-10 rounded-full transition-colors flex items-center px-0.5 py-0.5', theme === 'dark' ? 'bg-primary' : 'bg-muted')} style={{ height: 22 }}>
              <div className={cn('w-4 h-4 rounded-full bg-white shadow transition-transform', theme === 'dark' ? 'translate-x-5' : 'translate-x-0')} />
            </div>
          </button>

          <Link to="/notifications" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Bell className="h-3.5 w-3.5 text-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">View alerts & announcements</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <KeyRound className="h-3.5 w-3.5 text-foreground/60" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your login password</p>
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', showChangePassword && 'rotate-90')} />
          </button>

          {showChangePassword && (
            <div className="px-4 pb-4 pt-2 space-y-2.5 border-b border-border bg-muted/10">
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password (min 6 chars)"
                  value={pwForm.next}
                  onChange={e => setPwForm({ ...pwForm, next: e.target.value })}
                  className="h-9 text-xs pr-9"
                />
                <button onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                type={showPw ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={pwForm.confirm}
                onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                className="h-9 text-xs"
              />
              {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                disabled={pwForm.next.length < 6 || pwForm.next !== pwForm.confirm || pwSaving}
                onClick={handleChangePassword}
              >
                {pwSaving ? 'Saving…' : 'Update Password'}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <img src={logoUrl} alt="ATLAS" width={22} height={22} style={{ objectFit: 'contain' }} />
              </div>
              <div>
                <p className="text-sm font-medium">ATLAS</p>
                <p className="text-xs text-muted-foreground">SAF Management Platform v1.0</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Instructor tools ── */}
        {instructor && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Administration</p>
            </div>
            <Link to="/admin/appoint" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Appoint Cadet Admin</p>
                  <p className="text-xs text-muted-foreground">Grant admin access to cadets</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/import" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Upload className="h-3.5 w-3.5 text-foreground/60" />
                </div>
                <div>
                  <p className="text-sm font-medium">Import Users</p>
                  <p className="text-xs text-muted-foreground">Mass import via CSV</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        )}

        {/* ── Delete Account ── */}
        {!showDelete ? (
          <div className="flex justify-center pt-1 pb-4">
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 text-xs text-destructive/40 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Delete Account
            </button>
          </div>
        ) : (
          <div className="bg-card border border-destructive/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-destructive">Confirm Account Deletion</p>
            <p className="text-xs text-muted-foreground">Type your full name: <span className="text-foreground font-mono">{fullName}</span></p>
            <Input
              placeholder="Type full name to confirm"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="h-9 text-xs bg-background border-border"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs border-border h-8"
                onClick={() => { setShowDelete(false); setDeleteInput(''); }}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" className="flex-1 text-xs h-8"
                disabled={!deleteReady || deleting} onClick={handleDeleteAccount}>
                {deleting ? 'Deleting…' : 'Delete Forever'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}