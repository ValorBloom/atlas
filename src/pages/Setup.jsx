import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RANKS, UNITS, ADMIN_PIN } from '@/lib/constants';
import { AlertTriangle, ChevronRight, Lock, Star, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  {
    value: 'cadet',
    icon: User,
    label: 'Cadet / OCT',
    description: 'Standard access — submit reports, SFT, movements',
  },
  {
    value: 'cadet_admin',
    icon: Star,
    label: 'Cadet Admin',
    description: 'View movements, update & send parade state',
  },
  {
    value: 'instructor',
    icon: Shield,
    label: 'Instructor',
    description: 'Full access — requires authorisation code',
  },
];

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = profile, 2 = role
  const [form, setForm] = useState({
    unit: '', rank: '', role: 'cadet', phone_number: '', admin_pin: ''
  });
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleRoleSelect = (role) => {
    setForm({ ...form, role, admin_pin: '' });
    setPinError('');
  };

  const handleSubmit = async () => {
    if (!form.unit || !form.rank) return;

    let isAdminUser = false;
    let finalRole = form.role;

    if (form.role === 'instructor') {
      if (form.admin_pin !== ADMIN_PIN) {
        setPinError('Invalid authorisation code. Please check and try again.');
        return;
      }
      isAdminUser = true;
    } else if (form.role === 'cadet_admin') {
      // Cadet admins get limited access, not full admin
      isAdminUser = false;
    }

    setSaving(true);
    await base44.auth.updateMe({
      unit: form.unit,
      rank: form.rank,
      role: finalRole,
      is_admin: isAdminUser,
      phone_number: form.phone_number,
    });
    setSaving(false);
    navigate('/');
    window.location.reload();
  };

  const canProceedStep1 = form.unit && form.rank;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <span className="text-white font-bold text-2xl tracking-tight">A</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Anchor</h1>
          <p className="text-sm text-muted-foreground mt-1">OCS Operations Platform</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={cn("flex-1 h-1 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-muted")} />
          <div className={cn("flex-1 h-1 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-muted")} />
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-1 mb-2">
              <h2 className="text-lg font-semibold">Your Profile</h2>
              <p className="text-sm text-muted-foreground">Tell us about yourself to get started.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select your unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Rank</Label>
              <Select value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select your rank" />
                </SelectTrigger>
                <SelectContent>
                  {RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. 91234567"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                className="h-10"
              />
            </div>

            <Button
              className="w-full h-10 mt-2"
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
            >
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1 mb-2">
              <h2 className="text-lg font-semibold">Your Role</h2>
              <p className="text-sm text-muted-foreground">Select your role in the unit.</p>
            </div>

            <div className="space-y-2.5">
              {ROLE_OPTIONS.map(({ value, icon: Icon, label, description }) => (
                <button
                  key={value}
                  onClick={() => handleRoleSelect(value)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                    form.role === value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-border hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    form.role === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={cn("text-sm font-semibold", form.role === value ? "text-primary" : "text-foreground")}>{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </button>
              ))}
            </div>

            {form.role === 'instructor' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Authorisation Code
                </Label>
                <Input
                  type="password"
                  placeholder="Enter code"
                  value={form.admin_pin}
                  onChange={(e) => { setForm({ ...form, admin_pin: e.target.value }); setPinError(''); }}
                  className="h-10 font-mono tracking-widest"
                />
                {pinError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{pinError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                className="flex-1 h-10"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? 'Setting up...' : 'Enter Anchor'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}