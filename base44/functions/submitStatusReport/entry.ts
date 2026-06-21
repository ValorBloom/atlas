import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Creates a status report and fires the instructor notification (service-role bypasses Notification RLS)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reportData, notifMessage, upperType } = body;

    // Validate that cadet is only creating for their own unit
    const userUnit = user.unit || user.data?.unit;
    if (reportData.unit !== userUnit) {
      return Response.json({ error: 'Unit mismatch' }, { status: 403 });
    }

    // Create the status report as the user
    const created = await base44.entities.StatusReport.create(reportData);

    // Notify instructors via service role (bypasses Notification create RLS)
    try {
      await base44.asServiceRole.entities.Notification.create({
        title: `New ${upperType} Request`,
        message: notifMessage,
        type: 'warning',
        category: 'approval',
        recipient_unit: reportData.unit,
      });
    } catch (_) { /* non-critical */ }

    // Audit log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: `status_report_${upperType.toLowerCase()}`,
        category: 'status',
        details: notifMessage,
        performed_by: user.email,
        unit: reportData.unit,
      });
    } catch (_) { /* non-critical */ }

    return Response.json({ success: true, id: created?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});