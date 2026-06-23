import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Returns CET records for the caller's unit. Uses service role so unit-wide
// training programmes are reliably visible to every member of the unit,
// independent of per-field RLS template resolution.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const unit = user.unit || user.data?.unit;
    if (!unit) return Response.json({ records: [] });

    const records = await base44.asServiceRole.entities.CETRecord.filter(
      { unit },
      '-date',
      60
    );

    return Response.json({ records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});