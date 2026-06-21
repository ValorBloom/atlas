import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Fetches all pending_approval StatusReports for the caller's unit via service role (bypasses RLS)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = user.user_role;
    if (userRole !== 'instructor' && userRole !== 'cadet_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userUnit = user.unit;
    if (!userUnit) {
      return Response.json({ error: 'User has no unit assigned' }, { status: 400 });
    }

    // Service role bypasses RLS — filter by unit and status
    const reports = await base44.asServiceRole.entities.StatusReport.filter(
      { unit: userUnit, status: 'pending_approval' },
      '-created_date',
      200
    );

    return Response.json({ reports, unit: userUnit, userRole });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});