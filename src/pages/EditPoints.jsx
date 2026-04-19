import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { POINT_REASONS, formatRankName } from '@/lib/constants';
import { Check, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function EditPoints() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [delta, setDelta] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: cadets = [] } = useQuery({
    queryKey: ['cadets-unit', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit, role: 'cadet' }),
    enabled: !!user?.unit,
  });

  const toggleUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const finalReason = reason === 'Custom' ? customReason : reason;
  const deltaNum = parseInt(delta);
  const canSubmit = selectedUsers.length > 0 && finalReason && !isNaN(deltaNum) && deltaNum !== 0;

  const handleSubmit = async () => {
    setSaving(true);
    const logs = selectedUsers.map(uid => {
      const cadet = cadets.find(c => c.id === uid);
      return {
        user_id: uid,
        user_name: cadet?.full_name || '',
        user_rank: cadet?.rank || '',
        delta: deltaNum,
        reason: finalReason,
        unit: user?.unit,
        action_by: user?.email,
      };
    });
    await base44.entities.PointLog.bulkCreate(logs);
    
    await base44.entities.AuditLog.create({
      action: 'points_edit',
      category: 'points',
      details: `${deltaNum > 0 ? '+' : ''}${deltaNum} points to ${selectedUsers.length} cadets: ${finalReason}`,
      performed_by: user?.email,
      unit: user?.unit,
    });

    setSaving(false);
    toast.success(`Points updated for ${selectedUsers.length} cadet(s)`);
    queryClient.invalidateQueries({ queryKey: ['point-logs'] });
    navigate('/points');
  };

  return (
    <div>
      <PageHeader title="Edit Points" backTo="/points" />
      <div className="px-4 py-4 space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Cadets</Label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {cadets.map(c => (
              <button
                key={c.id}
                onClick={() => toggleUser(c.id)}
                className={`w-full text-left p-2.5 rounded-lg border text-sm flex items-center gap-2.5 transition-all ${
                  selectedUsers.includes(c.id) ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <Checkbox checked={selectedUsers.includes(c.id)} />
                <span>{formatRankName(c.rank, c.full_name)}</span>
              </button>
            ))}
          </div>
          {selectedUsers.length > 0 && (
            <p className="text-xs text-muted-foreground">{selectedUsers.length} selected</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Reason</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
            <SelectContent>
              {POINT_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          {reason === 'Custom' && (
            <Input
              placeholder="Enter custom reason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Points (positive or negative)</Label>
          <Input
            type="number"
            placeholder="e.g. 5 or -3"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="text-center text-lg font-mono"
          />
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || saving}>
          <Check className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Apply Points'}
        </Button>
      </div>
    </div>
  );
}