import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RANKS, UNITS, isInstructor, isCadetAdmin, getGroupLabel, getGroupOptions } from '@/lib/constants';
import { LogOut, Trash2, Moon, Sun, ChevronRight, Bell, Shield, Upload, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '@/lib/ThemeContext';
import { cn } from '@/lib/utils';

// Minimal Atlas vertebra inline SVG
function AtlasMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
      <ellipse cx="32" cy="32" rx="28" ry="20" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="32" cy="32" rx="12" ry="9" stroke="currentColor" strokeWidth="2.5" />
      <rect x="4" y="27" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="2.5" />
      <rect x="48" y="27" width="12" height="10" rx="3" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export default function Profile() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const cadetAdmin = isCadetAdmin(user);
  const { theme, toggleTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        rank: user.rank || '',
        unit: user.unit || '',
        phone_number: user.phone_number || '',
        group: user.group || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    setSaving(false);
    setEditing(false);
    toast.success('Profile updated');
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
  const groupOptions = getGroupOptions(user?.unit);

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

        {/* ── Identity Hero — military card (light + dark mode) ── */}
        <div className="relative rounded-2xl overflow-hidden border border-primary/30 bg-primary/5 dark:bg-[hsl(222,24%,10%)]">
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(hsl(217,91%,55%) 1px, transparent 1px), linear-gradient(90deg, hsl(217,91%,55%) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
          {/* Corner brackets */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-primary/40 rounded-tl" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-primary/40 rounded-tr" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-primary/40 rounded-bl" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-primary/40 rounded-br" />

          <div className="relative px-5 py-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border border-primary/25 bg-primary/15">
                <span className="text-2xl font-bold text-primary">{initials || '?'}</span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <AtlasMark size={14} />
                  <span className="text-[9px] tracking-[0.2em] uppercase text-primary/70 font-semibold">ATLAS ID</span>
                </div>
                <p className="text-base font-bold text-foreground leading-tight truncate">{fullName || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="border-t border-primary/15 mt-4 pt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Rank</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{user?.rank || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Unit</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{user?.unit || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Role</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{roleLabel}</p>
              </div>
              {user?.group && (
                <div className="col-span-3 pt-1 border-t border-primary/10">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{groupLabel}</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{user.group}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Details section ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Details</p>
            {!editing ? (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(true)}>Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" className="text-xs h-7" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>

          <div className="divide-y divide-border">
            {/* Rank */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Rank</span>
              {editing ? (
                <Select value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <span className="text-xs font-medium">{user?.rank || '—'}</span>
              )}
            </div>

            {/* Unit */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Unit</span>
              {editing ? (
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v, group: '' })}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <span className="text-xs font-medium">{user?.unit || '—'}</span>
              )}
            </div>

            {/* Group (platoon / flight / byte etc.) */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">{getGroupLabel(form.unit || user?.unit)}</span>
              {editing ? (
                <Select value={form.group} onValueChange={(v) => setForm({ ...form, group: v })}>
                  <SelectTrigger className="h-8 w-40 text-xs bg-background border-border"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {(getGroupOptions(form.unit || user?.unit) || []).map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs font-medium">{user?.group || '—'}</span>
              )}
            </div>

            {/* Phone */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Phone</span>
              {editing ? (
                <Input
                  className="h-8 w-36 text-xs bg-background border-border"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  placeholder="e.g. 91234567"
                />
              ) : (
                <span className="text-xs font-medium">{user?.phone_number || '—'}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Settings ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Settings</p>
          </div>

          {/* Theme */}
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

          {/* Notifications */}
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

          {/* About Atlas */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <AtlasMark size={15} />
              </div>
              <div>
                <p className="text-sm font-medium">Atlas</p>
                <p className="text-xs text-muted-foreground">OCS Operations Platform v1.0</p>
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