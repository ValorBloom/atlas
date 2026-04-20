import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RANKS, UNITS, isInstructor, isCadetAdmin, getGroupLabel } from '@/lib/constants';
import { LogOut, User, Shield, Star, ChevronRight, Trash2, Moon, Sun, Phone, Bell, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '@/lib/ThemeContext';
import { cn } from '@/lib/utils';

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
  const roleBg = instructor ? 'bg-primary/15 text-primary' : cadetAdmin ? 'bg-amber-500/15 text-amber-400' : 'bg-secondary text-secondary-foreground';

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
        <div className="relative bg-gradient-to-br from-primary/10 via-card to-card border border-primary/15 rounded-2xl p-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-6 translate-x-6 pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/25 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">{initials || <User className="h-6 w-6" />}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-foreground truncate">{fullName || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {user?.rank && (
                  <Badge variant="secondary" className="text-[10px] font-semibold">{user.rank}</Badge>
                )}
                {user?.unit && (
                  <Badge variant="secondary" className="text-[10px]">{user.unit}</Badge>
                )}
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', roleBg)}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
          {(user?.phone_number) && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">{user.phone_number}</span>
            </div>
          )}
        </div>

        {/* ── Edit Details ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Details</p>
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
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Role</span>
              <span className="text-xs font-medium capitalize">{roleLabel}</span>
            </div>
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
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Unit</span>
              {editing && !instructor ? (
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <span className="text-xs font-medium">{user?.unit || '—'}</span>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">Phone</span>
              {editing ? (
                <Input
                  className="h-8 w-32 text-xs bg-background border-border"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
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
            <p className="text-sm font-semibold text-foreground">Settings</p>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {theme === 'dark' ? <Moon className="h-3.5 w-3.5 text-primary" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Appearance</p>
                <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
              </div>
            </div>
            <div className={cn('w-10 h-5.5 rounded-full transition-colors flex items-center px-0.5', theme === 'dark' ? 'bg-primary' : 'bg-muted')}>
              <div className={cn('w-4 h-4 rounded-full bg-white shadow transition-transform', theme === 'dark' ? 'translate-x-5' : 'translate-x-0')} />
            </div>
          </button>

          {/* Notifications link */}
          <Link to="/notifications" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Bell className="h-3.5 w-3.5 text-foreground/60" />
              </div>
              <p className="text-sm font-medium text-foreground">Notifications</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* ── Instructor tools ── */}
        {instructor && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Administration</p>
            </div>
            <Link to="/admin/appoint" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Appoint Cadet Admin</p>
                  <p className="text-xs text-muted-foreground">Grant admin access to cadets</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link to="/admin/import" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Lock className="h-3.5 w-3.5 text-foreground/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Import Users</p>
                  <p className="text-xs text-muted-foreground">Mass import via CSV</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        )}

        {/* ── Delete Account ── */}
        {!showDelete ? (
          <div className="flex justify-center pt-2 pb-4">
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 text-xs text-destructive/50 hover:text-destructive transition-colors"
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