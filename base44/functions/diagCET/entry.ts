import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// TEMP diagnostic: reports what the CURRENT caller sees for CET under RLS.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // RLS-respecting read (acts as the caller)
    const rlsRecs = await base44.entities.CETRecord.filter({ unit: user.unit }, '-date', 30);
    // service-role read (ground truth)
    const allRecs = await base44.asServiceRole.entities.CETRecord.filter({ unit: user.unit }, '-date', 30);

    return Response.json({
      caller: { email: user.email, role: user.user_role, unit: user.unit },
      rlsCount: rlsRecs.length,
      rlsDates: rlsRecs.map(r => ({ date: r.date, pub: r.is_published })),
      groundTruthCount: allRecs.length,
      groundTruthDates: allRecs.map(r => ({ date: r.date, pub: r.is_published })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});