import React from 'react';
import PageHeader from '@/components/layout/PageHeader';
import QuickAction from '@/components/home/QuickAction';
import { FileText, FilePlus, RefreshCw } from 'lucide-react';

export default function StatusMenu() {
  return (
    <div>
      <PageHeader title="Status Reporting" backTo="/" subtitle="RSO / MA / RSI" />
      <div className="px-4 py-5 space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report New</h2>
        <QuickAction to="/actions/status/report/RSO" icon={FilePlus} label="Report RSO" description="Report Sick Out" />
        <QuickAction to="/actions/status/report/MA" icon={FilePlus} label="Report MA" description="Medical Appointment" />
        <QuickAction to="/actions/status/report/RSI" icon={FilePlus} label="Report RSI" description="Report Sick In" />

        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6">Update Existing</h2>
        <QuickAction to="/actions/status/update/RSO" icon={RefreshCw} label="Update RSO" description="Post-consultation — add diagnosis & outcome" />
      </div>
    </div>
  );
}