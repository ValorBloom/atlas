import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CADET_RANKS, INSTRUCTOR_RANKS, UNITS, ADMIN_PIN,
  getGroupLabel, getGroupOptions, getSectionOptions, UNIT_GROUPS
} from '@/lib/constants';
import { AlertTriangle, ChevronRight, Lock, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  {
    value: 'cadet',
    icon: User,
    label: 'Cadet',
    description: 'Submit reports, SFT, movements',
  },
  {
    value: 'instructor',
    icon: Shield,
    label: 'Instructor',
    description: 'Full access — requires auth code',
  },
];

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    unit: '', rank: '', role: 'cadet', phone_number: '', admin_pin: '',
    platoon: '', section: ''
  });
  const [pinError, setPinError] = useState('');
  const [saving, setSaving] = useState(false);

  const isCadet = form.role === 'cadet';
  const groupOptions = form.unit ? getGroupOptions(form.unit) : [];
  const sectionOptions = form.unit ? getSectionOptions(form.unit) : [];
  const groupLabel = getGroupLabel(form.unit);
  const hasGroups = groupOptions.length > 0;
  const hasSections = !!sectionOptions;

  const rankOptions = isCadet ? CADET_RANKS : INSTRUCTOR_RANKS;

  const handleUnitChange = (v) => setForm({ ...form, unit: v, platoon: '', section: '' });

  const handleSubmit = async () => {
    if (!form.unit || !form.rank) return;

    if (form.role === 'instructor') {
      if (form.admin_pin !== ADMIN_PIN) {
        setPinError('Invalid authorisation code.');
        return;
      }
    }

    setSaving(true);
    await base44.auth.updateMe({
      unit: form.unit,
      rank: form.rank,
      role: form.role,
      is_admin: form.role === 'instructor',
      phone_number: form.phone_number,
      platoon: form.platoon || null,
      section: form.section || null,
    });
    setSaving(false);
    navigate('/');
    window.location.reload();
  };

  const canProceedStep1 = form.unit && form.rank &&
    (!isCadet || !hasGroups || form.platoon) &&
    (!isCadet || !hasSections || !hasGroups || form.section);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-4">
            <span className="text-white font-bold text-xl tracking-tight">A</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Anchor</h1>
          <p className="text-sm text-muted-foreground mt-1">OCS Operations Platform</p>
        </div>

        {/* Step bar */}
        <div className="flex gap-2 mb-7">
          <div className={cn("flex-1 h-0.5 rounded-full", step >= 1 ? "bg-primary" : "bg-border")} />
          <div className={cn("flex-1 h-0.5 rounded-full", step >= 2 ? "bg-primary" : "bg-border")} />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="mb-1">
              <h2 className="text-lg font-semibold text-foreground">Your Profile</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Set up your account details.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Unit</Label>
              <Select value={form.unit} onValueChange={handleUnitChange}>
                <SelectTrigger className="h-11 bg-card border-border">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setForm({ ...form, role: value, rank: '', admin_pin: '' })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3.5 rounded-xl border text-center transition-all",
                      form.role === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-border/80"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Rank</Label>
              <Select value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })}>
                <SelectTrigger className="h-11 bg-card border-border">
                  <SelectValue placeholder="Select rank" />
                </SelectTrigger>
                <SelectContent>
                  {rankOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Platoon/Group — only for cadets */}
            {isCadet && form.unit && hasGroups && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{groupLabel}</Label>
                <Select value={form.platoon} onValueChange={(v) => setForm({ ...form, platoon: v, section: '' })}>
                  <SelectTrigger className="h-11 bg-card border-border">
                    <SelectValue placeholder={`Select ${groupLabel}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Standard units: platoon + section */}
            {isCadet && form.unit && !UNIT_GROUPS[form.unit] && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Platoon</Label>
                  <Select value={form.platoon} onValueChange={(v) => setForm({ ...form, platoon: v })}>
                    <SelectTrigger className="h-11 bg-card border-border">
                      <SelectValue placeholder="Select platoon" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(p => <SelectItem key={p} value={`Platoon ${p}`}>Platoon {p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Section</Label>
                  <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                    <SelectTrigger className="h-11 bg-card border-border">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(s => <SelectItem key={s} value={`Section ${s}`}>Section {s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Phone <span className="normal-case font-normal">(optional)</span>
              </Label>
              <Input
                placeholder="e.g. 91234567"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                className="h-11 bg-card border-border"
              />
            </div>

            <Button className="w-full h-11 mt-2" onClick={() => setStep(2)} disabled={!canProceedStep1}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="mb-1">
              <h2 className="text-lg font-semibold text-foreground">Confirm Role</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {form.role === 'instructor' ? 'Enter your authorisation code.' : 'Review and confirm.'}
              </p>
            </div>

            {/* Summary */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium">{form.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rank</span>
                <span className="font-medium">{form.rank}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium capitalize">{form.role}</span>
              </div>
              {form.platoon && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{groupLabel}</span>
                  <span className="font-medium">{form.platoon}</span>
                </div>
              )}
              {form.section && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Section</span>
                  <span className="font-medium">{form.section}</span>
                </div>
              )}
            </div>

            {form.role === 'instructor' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Auth Code
                </Label>
                <Input
                  type="password"
                  placeholder="Enter code"
                  value={form.admin_pin}
                  onChange={(e) => { setForm({ ...form, admin_pin: e.target.value }); setPinError(''); }}
                  className="h-11 bg-card border-border font-mono tracking-widest"
                />
                {pinError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{pinError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 border-border" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1 h-11" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Setting up...' : 'Enter Anchor'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}