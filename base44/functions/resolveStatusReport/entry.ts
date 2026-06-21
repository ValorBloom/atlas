import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Approves or denies a StatusReport — runs as service role to bypass RLS
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.user_role !== 'instructor') {
      return Response.json({ error: 'Only instructors can approve or deny requests' }, { status: 403 });
    }

    const { reportId, action, notes, instructorDisplayName, unit } = await req.json();
    if (!reportId || !action) return Response.json({ error: 'Missing required fields' }, { status: 400 });

    // Fetch the report via service role to verify it exists and belongs to the instructor's unit
    const report = await base44.asServiceRole.entities.StatusReport.filter({ id: reportId });
    const target = report[0];
    if (!target) return Response.json({ error: 'Report not found' }, { status: 404 });
    if (target.unit !== user.unit) return Response.json({ error: 'Unit mismatch — cannot act on another unit\'s report' }, { status: 403 });

    if (action === 'approve') {
      const isMedical = target.type === 'RSO' || target.type === 'RSI';
      await base44.asServiceRole.entities.StatusReport.update(reportId, {
        status: isMedical ? 'approved' : 'active',
        approved_by: instructorDisplayName,
        approval_date: new Date().toISOString(),
        instructor_notes: notes || '',
      });

      const approvedMsg = notes
        ? `Your ${target.type} request has been approved.\nInstructor notes: ${notes}`
        : `Your ${target.type} request has been approved. ${
            target.type === 'RSO'
              ? 'Please go see the doctor, then update your outcome under Update RSO/RSI.'
              : target.type === 'RSI'
              ? 'Please go see the MO, then update your outcome under Update RSO/RSI.'
              : 'Parade state has been updated.'
          }`;

      try {
        await base44.asServiceRole.entities.Notification.create({
          title: `${target.type} Approved`,
          message: approvedMsg,
          type: 'success',
          category: 'approval',
          recipient_email: target.reported_by,
          recipient_unit: unit,
          ...(isMedical ? { link: `/actions/status/update/medical?id=${reportId}` } : {}),
        });
      } catch (_) {}

    } else if (action === 'deny') {
      await base44.asServiceRole.entities.StatusReport.update(reportId, {
        status: 'rejected',
        instructor_notes: notes || '',
      });

      const deniedMsg = notes
        ? `Your ${target.type} request has been denied.\nReason: ${notes}`
        : `Your ${target.type} request has been denied.`;

      try {
        await base44.asServiceRole.entities.Notification.create({
          title: `${target.type} Denied`,
          message: deniedMsg,
          type: 'error',
          category: 'approval',
          recipient_email: target.reported_by,
          recipient_unit: unit,
        });
      } catch (_) {}
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: `status_${action === 'approve' ? 'approved' : 'denied'}_${target.type}`,
        category: 'approval',
        details: `${instructorDisplayName} ${action === 'approve' ? 'approved' : 'denied'} ${target.type} for ${target.personnel_name} (${target.unit})${notes ? `. Notes: ${notes}` : ''}`,
        target_entity: 'StatusReport',
        target_id: reportId,
        performed_by: instructorDisplayName,
        unit,
      });
    } catch (_) {}

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});