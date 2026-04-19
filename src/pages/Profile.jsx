import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RANKS, UNITS, isInstructor } from '@/lib/constants';
import { LogOut, User, Shield, Star, ChevronRight, Trash2, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '@/lib/ThemeContext';

export default function Profile() {
  const { user } = useOutletContext();
  const instructor = isInstructor(user);
  const { theme, toggleTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete account state
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

  return (
    <div>
      <PageHeader
        title="Profile"
        rightAction={
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs gap-1" onClick={() => base44.auth.logout('/')}>
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        }
      />

      <div className="px-4 py-5 space-y-4">

        {/* Identity */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {user?.rank && <Badge variant="secondary" className="text-[10px]">{user.rank}</Badge>}
              {user?.unit && <Badge variant="secondary" className="text-[10px]">{user.unit}</Badge>}
              {user?.platoon && <Badge variant="secondary" className="text-[10px]">{user.platoon}</Badge>}
              {user?.section && <Badge variant="secondary" className="text-[10px]">{user.section}</Badge>}
              {user?.is_admin && (
                <Badge className="text-[10px] bg-primary/15 text-primary border-0">
                  <Shield className="h-2.5 w-2.5 mr-0.5" />Instructor
                </Badge>
              )}
              {user?.role === 'cadet_admin' && (
                <Badge className="text-[10px] bg-amber-500/15 text-amber-400 border-0">
                  <Star className="h-2.5 w-2.5 mr-0.5" />Admin
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Edit Details */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Role</span>
              <span className="text-xs font-medium capitalize">{user?.role || 'Cadet'}</span>
            </div>
            <div className="flex items-center justify-between">
              {editing ? (
                <>
                  <span className="text-xs text-muted-foreground">Rank</span>
                  <Select value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })}>
                    <SelectTrigger className="h-8 w-32 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>{RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">Rank</span>
                  <span className="text-xs font-medium">{user?.rank || '—'}</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between">
              {editing ? (
                <>
                  <span className="text-xs text-muted-foreground">Unit</span>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger className="h-8 w-32 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">Unit</span>
                  <span className="text-xs font-medium">{user?.unit || '—'}</span>
                </>
              )}
            </div>
            <div className="flex items-center justify-between">
              {editing ? (
                <>
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <Input
                    className="h-8 w-32 text-xs bg-background border-border"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  />
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <span className="text-xs font-medium">{user?.phone_number || '—'}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-secondary/50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Appearance</p>
              <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted'} flex items-center px-1`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </button>

        {/* Instructor: Appoint Cadet Admin */}
        {instructor && (
          <Link
            to="/admin/appoint"
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-secondary/50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <Star className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Appoint Cadet Admin</p>
              <p className="text-xs text-muted-foreground">Grant admin access to cadets</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        )}

        {/* Delete Account */}
        {!showDelete ? (
          <div className="flex justify-center pt-2 pb-4">
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 text-xs text-destructive/60 hover:text-destructive transition-colors"
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