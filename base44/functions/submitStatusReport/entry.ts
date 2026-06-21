import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Creates a status report and fires a notification to the cadet's unit (instructors + cadet_admins see it)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reportData, notifMessage, upperType } = body;

    // Unit may be stored at top-level user.unit OR legacy user.data.unit
    const userUnit = user.unit || user.data?.unit;
    if (!userUnit) {
      return Response.json({ error: 'User has no unit assigned' }, { status: 400 });
    }

    // Stamp the report with the authoritative unit and reporter, then create
    // via service role to bypass RLS unit-field mismatches (user.unit vs user.data.unit)
    const finalReport = {
      ...reportData,
      unit: userUnit,
      personnel_id: reportData.personnel_id || user.id,
      reported_by: reportData.reported_by || user.email,
    };
    const created = await base44.asServiceRole.entities.StatusReport.create(finalReport);

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