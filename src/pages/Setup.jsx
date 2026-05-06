import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MobileSelect, MobileSelectItem } from '@/components/ui/MobileSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CADET_RANKS, INSTRUCTOR_RANKS, UNITS, ADMIN_PIN, UNIT_PINS,
  getGroupLabel, getGroupOptions, getSectionOptions, UNIT_GROUPS
} from '@/lib/constants';
import { AlertTriangle, ChevronRight, Lock, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const ATLAS_LOGO_URL = 'https://media.base44.com/images/public/69e4b33d62de074557854c0f/35dd33095_8b77309c-da5d-492a-af37-aa6aa8c79a0b-removebg-preview.png';

function AtlasLogo({ size = 56 }) {
  return (
    <img src={ATLAS_LOGO_URL} alt="ATLAS" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain' }} />
  );
}

const ROLE_OPTIONS = [
  { value: 'cadet',      icon: User,   label: 'Cadet',      description: 'Submit reports, SFT, movements' },
  { value: 'instructor', icon: Shield, label: 'Instructor', description: 'Full access — requires auth code' },
];

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: '', unit: '', rank: '', role: 'cadet', phone_number: '',
    admin_pin: '', unit_pin: '', platoon: '', section: ''
  });
  const [pinError, setPinError] = useState('');
  const [unitPinError, setUnitPinError] = useState('');
  const [saving, setSaving] = useState(false);

  const isCadet = form.role === 'cadet';
  const isStandardUnit = form.unit && !UNIT_GROUPS[form.unit];
  const groupOptions = form.unit ? getGroupOptions(form.unit) : [];
  const sectionOptions = form.unit ? getSectionOptions(form.unit) : null;
  const groupLabel = getGroupLabel(form.unit);

  const rankOptions = isCadet ? CADET_RANKS : INSTRUCTOR_RANKS;

  const handleUnitChange = (v) => setForm({ ...form, unit: v, platoon: '', section: '', unit_pin: '' });

  const handleSubmit = async () => {
    if (!form.unit || !form.rank || !form.full_name.trim()) return;

    if (form.unit_pin !== UNIT_PINS[form.unit]) {
      setUnitPinError('Invalid unit PIN.');
      return;
    }
    if (form.role === 'instructor' && form.admin_pin !== ADMIN_PIN) {
      setPinError('Invalid authorisation code.');
      return;
    }

    setSaving(true);
    const isInstr = form.role === 'instructor';
    try {
      await base44.auth.updateMe({
        full_name: form.full_name.trim(),
        unit: form.unit,
        rank: form.rank,
        phone_number: form.phone_number,
        platoon: isInstr ? null : (form.platoon || null),
        section: isInstr ? null : (form.section || null),
        // Store role as custom field (not platform role — that requires platform admin)
        user_role: form.role,
      });
      window.location.href = '/';
    } catch (e) {
      setSaving(false);
    }
  };

  // Step 1 can proceed when name + unit + rank + (if cadet standard unit) platoon filled
  const canProceedStep1 = form.full_name.trim().length > 1 && form.unit && form.rank &&
    (!isCadet || !isStandardUnit || form.platoon);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <AtlasLogo size={64} />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">ATLAS</h1>
          <p className="text-sm text-muted-foreground mt-1">SAF Management Platform</p>
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

            {/* Full name — collected first */}
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground uppercase tracking-wide">Full Name</Label>
              <Input
                placeholder="e.g. John Tan Wei Ming"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="h-11 bg-card border-border"
              />
              <p className="text-[10px] text-muted-foreground">This will be your display name across the platform.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground uppercase tracking-wide">Unit</Label>
              <MobileSelect value={form.unit} onValueChange={handleUnitChange} placeholder="Select unit" className="h-11 bg-card border-border text-sm">
                {UNITS.map(u => <MobileSelectItem key={u} value={u}>{u}</MobileSelectItem>)}
              </MobileSelect>
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
              <Label className="text-sm text-muted-foreground uppercase tracking-wide">Rank</Label>
              <MobileSelect value={form.rank} onValueChange={(v) => setForm({ ...form, rank: v })} placeholder="Select rank" className="h-11 bg-card border-border text-sm">
                {rankOptions.map(r => <MobileSelectItem key={r} value={r}>{r}</MobileSelectItem>)}
              </MobileSelect>
            </div>

            {/* Unit-specific groups (Air/DIS/Mids) — single select, no section */}
            {isCadet && form.unit && UNIT_GROUPS[form.unit] && (
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground uppercase tracking-wide">{groupLabel}</Label>
                <MobileSelect value={form.platoon} onValueChange={(v) => setForm({ ...form, platoon: v, section: '' })} placeholder={`Select ${groupLabel}`} className="h-11 bg-card border-border text-sm">
                  {groupOptions.map(g => <MobileSelectItem key={g} value={g}>{g}</MobileSelectItem>)}
                </MobileSelect>
              </div>
            )}

            {/* Standard army units — platoon + section */}
            {isCadet && isStandardUnit && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground uppercase tracking-wide">Platoon</Label>
                  <MobileSelect value={form.platoon} onValueChange={(v) => setForm({ ...form, platoon: v, section: '' })} placeholder="Select platoon" className="h-11 bg-card border-border text-sm">
                    {[1,2,3,4].map(p => <MobileSelectItem key={p} value={`Platoon ${p}`}>Platoon {p}</MobileSelectItem>)}
                  </MobileSelect>
                </div>
                {form.platoon && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground uppercase tracking-wide">Section</Label>
                    <MobileSelect value={form.section} onValueChange={(v) => setForm({ ...form, section: v })} placeholder="Select section" className="h-11 bg-card border-border text-sm">
                      {[1,2,3,4].map(s => <MobileSelectItem key={s} value={`Section ${s}`}>Section {s}</MobileSelectItem>)}
                    </MobileSelect>
                  </div>
                )}
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
              <h2 className="text-lg font-semibold text-foreground">Confirm Identity</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {form.role === 'instructor' ? 'Enter your authorisation codes.' : 'Verify your unit to continue.'}
              </p>
            </div>

            {/* Summary */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{form.full_name}</span>
              </div>
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

            {/* Unit PIN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Unit PIN
              </Label>
              <Input
                type="password"
                placeholder={`Enter ${form.unit} unit PIN`}
                value={form.unit_pin}
                onChange={(e) => { setForm({ ...form, unit_pin: e.target.value }); setUnitPinError(''); }}
                className="h-11 bg-card border-border font-mono tracking-widest"
              />
              {unitPinError && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{unitPinError}</AlertDescription>
                </Alert>
              )}
            </div>

            {form.role === 'instructor' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Instructor Auth Code
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
                {saving ? 'Setting up...' : 'Enter ATLAS'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}