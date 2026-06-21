import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Creates a status report and fires a notification to the cadet's unit (instructors + cadet_admins see it)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reportData, notifMessage, upperType } = body;

    // user.unit is the top-level field set via base44.auth.updateMe during setup
    const userUnit = user.unit;
    if (!userUnit) {
      return Response.json({ error: 'User has no unit assigned' }, { status: 400 });
    }
    if (reportData.unit !== userUnit) {
      return Response.json({ error: 'Unit mismatch' }, { status: 403 });
    }

    // Create the status report as the user (RLS allows this)
    const created = await base44.entities.StatusReport.create(reportData);

    // Notify via service role so all instructors + cadet_admins in this unit see it
    try {
      await base44.asServiceRole.entities.Notification.create({
        title: `New ${upperType} Request`,
        message: notifMessage,
        type: 'warning',
        category: 'approval',
        recipient_unit: userUnit,
      });
    } catch (_) {}

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: `status_report_${upperType.toLowerCase()}`,
        category: 'status',
        details: notifMessage,
        performed_by: user.email,
        unit: userUnit,
      });
    } catch (_) {}

    return Response.json({ success: true, id: created?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});