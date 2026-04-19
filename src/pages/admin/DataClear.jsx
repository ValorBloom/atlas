import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
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
              onClick={() => { setSelected(target); setConfirmText(''); }}
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
      </div>
    </div>
  );
}