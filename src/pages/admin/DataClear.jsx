import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2, ShieldAlert, Zap, Users } from 'lucide-react';
import { toast } from 'sonner';

const DATA_TARGETS = [
  { key: 'movement', label: 'Movement Logs', entity: 'MovementLog', description: 'All movement records' },
  { key: 'status', label: 'Status Reports', entity: 'StatusReport', description: 'RSO, MA, RSI records' },
  { key: 'sft_submissions', label: 'SFT Submissions', entity: 'SFTSubmission', description: 'All SFT submissions' },
  { key: 'sft_windows', label: 'SFT Windows', entity: 'SFTWindow', description: 'All SFT windows' },
  { key: 'point_logs', label: 'Point Logs', entity: 'PointLog', description: 'All point records' },
  { key: 'notifications', label: 'Notifications', entity: 'Notification', description: 'All notifications' },
];

export default function DataClear() {
  const { user } = useOutletContext();
  const [selected, setSelected] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);
  const [clearAllMode, setClearAllMode] = useState(false);
  const [witnessName, setWitnessName] = useState('');
  const [witnessConfirmed, setWitnessConfirmed] = useState(false);

  const handleClear = async () => {
    if (!selected || confirmText !== 'DELETE') return;
    setClearing(true);

    const records = await base44.entities[selected.entity].filter({ unit: user?.unit });
    for (const record of records) {
      await base44.entities[selected.entity].delete(record.id);
    }

    await base44.entities.AuditLog.create({
      action: `data_clear_${selected.key}`,
      category: 'data_clear',
      details: `Cleared ${records.length} ${selected.label} records for ${user?.unit}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setClearing(false);
    setSelected(null);
    setConfirmText('');
    toast.success(`${selected.label} cleared (${records.length} records)`);
  };

  const handleClearAll = async () => {
    if (confirmText !== 'DELETE ALL' || !witnessConfirmed || !witnessName.trim()) return;
    setClearing(true);
    let totalDeleted = 0;

    for (const target of DATA_TARGETS) {
      const records = await base44.entities[target.entity].filter({ unit: user?.unit });
      for (const record of records) {
        await base44.entities[target.entity].delete(record.id);
      }
      totalDeleted += records.length;
    }

    await base44.entities.AuditLog.create({
      action: 'data_clear_all',
      category: 'data_clear',
      details: `Cleared ALL data (${totalDeleted} records total) for ${user?.unit}. Witness: ${witnessName.trim()}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setClearing(false);
    setClearAllMode(false);
    setConfirmText('');
    setWitnessName('');
    setWitnessConfirmed(false);
    toast.success(`All data cleared (${totalDeleted} records)`);
  };

  return (
    <div>
      <PageHeader title="Data Clear" backTo="/admin" subtitle="Controlled data operations" />
      <div className="px-4 py-4 space-y-5">
        <Alert className="bg-destructive/5 border-destructive/20">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-xs text-destructive">
            These operations permanently delete data. They cannot be undone. All actions are logged.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          {DATA_TARGETS.map(target => (
            <button
              key={target.key}
              onClick={() => { setSelected(target); setClearAllMode(false); setConfirmText(''); }}
              className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all ${
                selected?.key === target.key 
                  ? 'border-destructive bg-destructive/5' 
                  : 'border-border bg-card'
              }`}
            >
              <p className="font-medium">{target.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{target.description}</p>
            </button>
          ))}
        </div>

        {/* Clear All button */}
        <button
          onClick={() => { setClearAllMode(true); setSelected(null); setConfirmText(''); setWitnessName(''); setWitnessConfirmed(false); }}
          className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all ${
            clearAllMode
              ? 'border-destructive bg-destructive/10'
              : 'border-destructive/30 bg-destructive/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-destructive">Clear All Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">Delete every record across all categories for {user?.unit}</p>
            </div>
          </div>
        </button>

        {selected && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Confirm Deletion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                You are about to permanently delete all <strong>{selected.label}</strong> for <strong>{user?.unit}</strong>. 
                This action cannot be undone.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Type DELETE to confirm</Label>
                <Input
                  placeholder="DELETE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="font-mono text-center"
                />
              </div>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleClear}
                disabled={confirmText !== 'DELETE' || clearing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {clearing ? 'Clearing...' : `Delete All ${selected.label}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {clearAllMode && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Confirm — Delete ALL Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                This will permanently delete <strong>all records</strong> across every category for <strong>{user?.unit}</strong>. 
                This is irreversible.
              </p>
              {/* Step 1: Witness */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> Step 1 — Witness name (another admin present)</Label>
                <Input
                  placeholder="Rank Name of witnessing admin"
                  value={witnessName}
                  onChange={(e) => { setWitnessName(e.target.value); setWitnessConfirmed(false); }}
                />
                {witnessName.trim().length > 2 && !witnessConfirmed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => setWitnessConfirmed(true)}
                  >
                    Confirm witness — {witnessName.trim()}
                  </Button>
                )}
                {witnessConfirmed && (
                  <p className="text-[11px] text-green-400">✓ Witness confirmed: {witnessName.trim()}</p>
                )}
              </div>

              {/* Step 2: Type confirmation */}
              {witnessConfirmed && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Step 2 — Type <span className="font-mono font-bold">DELETE ALL</span> to confirm</Label>
                  <Input
                    placeholder="DELETE ALL"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="font-mono text-center"
                  />
                </div>
              )}

              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleClearAll}
                disabled={confirmText !== 'DELETE ALL' || !witnessConfirmed || clearing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {clearing ? 'Clearing All...' : 'Delete All Data'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}