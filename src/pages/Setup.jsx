import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RANKS, UNITS, ADMIN_PIN } from '@/lib/constants';
import { Shield, AlertTriangle } from 'lucide-react';

export default function Setup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    unit: '', rank: '', role: 'cadet', phone_number: '', admin_pin: ''
  });
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);

  const needsPin = form.role === 'instructor';

  const handleRoleChange = (role) => {
    setForm({ ...form, role });
    setShowPin(role === 'instructor');
    setPinError('');
  };

  const handleSubmit = async () => {
    if (!form.unit || !form.rank) return;

    let isAdminUser = false;
    if (form.role === 'instructor') {
      if (form.admin_pin !== ADMIN_PIN) {
        setPinError('Invalid admin PIN. Admin privileges will not be granted.');
        return;
      }
      isAdminUser = true;
    }

    setSaving(true);
    const displayName = `${form.rank} `;
    await base44.auth.updateMe({
      unit: form.unit,
      rank: form.rank,
      role: form.role,
      is_admin: isAdminUser,
      phone_number: form.phone_number,
      display_name: displayName,
    });
    setSaving(false);
    navigate('/');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Set Up Your Profile</h1>
          <p className="text-sm text-muted-foreground">Complete your profile to continue to Anchor.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Unit</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
              <SelectContent>
                {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Rank</Label>
            <Select value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })}>
              <SelectTrigger><SelectValue placeholder="Select rank" /></SelectTrigger>
              <SelectContent>
                {RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <Select value={form.role} onValueChange={handleRoleChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cadet">Cadet</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Phone Number</Label>
            <Input 
              placeholder="e.g. 91234567" 
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
          </div>

          {needsPin && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Admin PIN</Label>
              <p className="text-xs text-muted-foreground">
                Instructor accounts require an admin PIN for elevated access to administrative features.
              </p>
              <Input 
                type="password"
                placeholder="Enter admin PIN"
                value={form.admin_pin}
                onChange={(e) => { setForm({ ...form, admin_pin: e.target.value }); setPinError(''); }}
              />
              {pinError && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{pinError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={!form.unit || !form.rank || saving}
        >
          {saving ? 'Saving...' : 'Continue to Anchor'}
        </Button>
      </div>
    </div>
  );
}