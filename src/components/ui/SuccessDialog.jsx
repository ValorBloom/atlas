import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * A simple confirmation popup shown after an action completes successfully.
 * Pass `open`, `onClose`, a `title` and an optional `message`.
 */
export default function SuccessDialog({ open, onClose, title = 'Success', message }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="max-w-[320px] rounded-2xl text-center">
        <div className="flex flex-col items-center pt-2 pb-1">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {message && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{message}</p>
          )}
          <Button className="w-full mt-5 h-10" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}