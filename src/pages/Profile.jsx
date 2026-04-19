import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RANKS, UNITS } from '@/lib/constants';
import { LogOut, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useOutletContext();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

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
    await base44.auth.updateMe({
      ...form,
      display_name: `${form.rank} ${user.full_name || ''}`.trim(),
    });
    setSaving(false);
    setEditing(false);
    toast.success('Profile updated');
  };

  return (
    <div>
      <PageHeader 
        title="Profile" 
        rightAction={
          <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => base44.auth.logout('/')}>
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Logout
          </Button>
        }
      />
      <div className="px-4 py-5 space-y-5">
        {/* Identity Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{user?.rank || '—'}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{user?.unit || '—'}</Badge>
                  {user?.is_admin && (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                      <Shield className="h-2.5 w-2.5 mr-0.5" />Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Details</CardTitle>
              {!editing ? (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="text-xs" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <p className="text-sm font-medium capitalize">{user?.role || 'Cadet'}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Rank</Label>
              {editing ? (
                <Select value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{user?.rank || '—'}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Unit</Label>
              {editing ? (
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{user?.unit || '—'}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              {editing ? (
                <Input 
                  className="h-9" 
                  value={form.phone_number} 
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })} 
                />
              ) : (
                <p className="text-sm font-medium">{user?.phone_number || '—'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}