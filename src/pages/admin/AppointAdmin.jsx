import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isInstructor, formatRankName } from '@/lib/constants';
import { Shield, Star, User, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AppointAdmin() {
  const { user } = useOutletContext();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(null); // user id being confirmed
  const [saving, setSaving] = useState(false);

  const { data: unitUsers = [], isLoading } = useQuery({
    queryKey: ['all-users', user?.unit],
    queryFn: () => base44.entities.User.filter({ unit: user?.unit }),
    enabled: !!user?.unit,
  });

  if (!isInstructor(user)) {
    return (
      <div>
        <PageHeader title="Appoint Admin" backTo="/admin" />
        <div className="px-4 py-16 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Instructor access required.</p>
        </div>
      </div>
    );
  }

  const cadets = unitUsers.filter(u => u.user_role === 'cadet' || u.user_role === 'cadet_admin');

  const handleAppoint = async (targetUser) => {
    setSaving(true);
    const newRole = targetUser.user_role === 'cadet_admin' ? 'cadet' : 'cadet_admin';
    await base44.entities.User.update(targetUser.id, { user_role: newRole });
    await base44.entities.AuditLog.create({
      action: `${newRole === 'cadet_admin' ? 'appointed' : 'removed'}_cadet_admin`,
      category: 'admin',
      details: `${formatRankName(targetUser.rank, targetUser.full_name)} role changed to ${newRole}`,
      performed_by: user?.email,
      unit: user?.unit,
      target_id: targetUser.id,
    });
    qc.invalidateQueries({ queryKey: ['all-users', user?.unit] });
    setSaving(false);
    setConfirming(null);
    toast.success(`${targetUser.display_name || targetUser.full_name} is now ${newRole === 'cadet_admin' ? 'a Cadet Admin' : 'a Cadet'}`);
  };

  return (
    <div>
      <PageHeader title="Appoint Cadet Admin" backTo="/admin" subtitle="Grant limited admin access to cadets" />
      <div className="px-4 py-4 space-y-4">
        <Alert className="py-2 border-primary/20 bg-primary/5">
          <Star className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs text-primary">
            Cadet Admins can view all movement logs and send the parade state.
          </AlertDescription>
        </Alert>

        {isLoading && (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        )}

        {cadets.map((u) => {
          const isCurrentAdmin = u.user_role === 'cadet_admin';
          const isConfirming = confirming === u.id;
          return (
            <Card key={u.id}>
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{formatRankName(u.rank, u.display_name || u.full_name)}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                {isCurrentAdmin && (
                  <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200 mr-1">Admin</Badge>
                )}
                {!isConfirming ? (
                  <Button
                    size="sm"
                    variant={isCurrentAdmin ? 'outline' : 'default'}
                    className="text-xs shrink-0"
                    onClick={() => setConfirming(u.id)}
                  >
                    {isCurrentAdmin ? 'Remove' : 'Appoint'}
                  </Button>
                ) : (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className={`text-xs h-8 ${isCurrentAdmin ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                      onClick={() => handleAppoint(u)}
                      disabled={saving}
                    >
                      <Check className="h-3 w-3 mr-1" /> Confirm
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {!isLoading && cadets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No cadets found in your unit.</p>
          </div>
        )}
      </div>
    </div>
  );
}