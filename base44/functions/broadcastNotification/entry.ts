import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Shared helper: creates a unit notification (and optional audit log) as service role.
// Used by cadet-initiated flows (movement, reached, SFT) since Notification.create
// and AuditLog.create are restricted to instructors/admins by RLS.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { notification, audit } = await req.json();

    const userUnit = user.unit || user.data?.unit;

    if (notification) {
      await base44.asServiceRole.entities.Notification.create({
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        category: notification.category || 'system',
        recipient_unit: userUnit,
        ...(notification.recipient_email ? { recipient_email: notification.recipient_email } : {}),
        ...(notification.link ? { link: notification.link } : {}),
      });
    }

    if (audit) {
      await base44.asServiceRole.entities.AuditLog.create({
        action: audit.action,
        category: audit.category || 'admin',
        details: audit.details || '',
        performed_by: user.email,
        unit: userUnit,
        ...(audit.target_entity ? { target_entity: audit.target_entity } : {}),
        ...(audit.target_id ? { target_id: audit.target_id } : {}),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});