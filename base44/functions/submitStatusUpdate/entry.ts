import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Cadet submits a post-consultation diagnosis/outcome for their approved RSO/RSI.
// Runs as service role so the cadet can update their report and broadcast the
// outcome notification (Notification.create is restricted to instructors via RLS).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reportId, diagnosis, status_category, start_date, end_date, duration_text, notes, outcomeMsg, outcomes } = await req.json();
    if (!reportId || !diagnosis || !status_category || !start_date || !end_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the report belongs to this user
    const found = await base44.asServiceRole.entities.StatusReport.filter({ id: reportId });
    const target = found[0];
    if (!target) return Response.json({ error: 'Report not found' }, { status: 404 });
    if (target.personnel_id !== user.id) {
      return Response.json({ error: 'You can only update your own report' }, { status: 403 });
    }

    await base44.asServiceRole.entities.StatusReport.update(reportId, {
      diagnosis: diagnosis.toUpperCase(),
      status_category,
      outcomes: Array.isArray(outcomes) ? outcomes : [],
      start_date,
      end_date,
      duration_text,
      details: notes || target.details || '',
      status: 'active',
    });

    try {
      await base44.asServiceRole.entities.Notification.create({
        title: `${target.type} Outcome Updated`,
        message: outcomeMsg,
        type: 'info',
        category: 'status',
        recipient_unit: user.unit,
      });
    } catch (_) {}

    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: `status_update_${target.type.toLowerCase()}`,
        category: 'status',
        details: outcomeMsg,
        performed_by: user.email,
        unit: user.unit,
      });
    } catch (_) {}

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});