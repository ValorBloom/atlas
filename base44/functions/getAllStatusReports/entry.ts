import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify user is authenticated and is a medical officer
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.user_role !== 'medical_officer') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use service role to read ALL status reports across units
    const reports = await base44.asServiceRole.entities.StatusReport.list('-created_date', 1000);

    return Response.json({ reports });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});