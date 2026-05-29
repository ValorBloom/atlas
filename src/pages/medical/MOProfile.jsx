import React from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, LogOut, Mail, Shield } from 'lucide-react';

export default function MOProfile({ user }) {
  return (
    <div className="px-4 py-6 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Profile</p>

      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Stethoscope className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground truncate">{user?.full_name || '—'}</p>
            <p className="text-xs text-primary font-medium mt-0.5">Medical Officer</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Email</p>
              <p className="text-sm font-medium truncate">{user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Role</p>
              <p className="text-sm font-medium">Medical Officer</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 gap-2"
        onClick={() => base44.auth.logout('/')}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}