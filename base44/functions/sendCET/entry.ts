import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Saves a CET record (create or update) and broadcasts it to the entire unit.
// Runs as service role so the write + notification always fire together,
// independent of per-row RLS quirks. Instructors / cadet admins only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.user_role;
    if (role !== 'instructor' && role !== 'cadet_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const unit = user.unit || user.data?.unit;
    if (!unit) return Response.json({ error: 'No unit on user' }, { status: 400 });

    const { record, existingId, announcement, notification } = await req.json();

    const payload = { ...record, unit, sent_by: user.email, is_published: true };

    let saved;
    if (existingId) {
      saved = await base44.asServiceRole.entities.CETRecord.update(existingId, payload);
    } else {
      saved = await base44.asServiceRole.entities.CETRecord.create(payload);
    }

    if (announcement) {
      await base44.asServiceRole.entities.Announcement.create({
        title: announcement.title,
        content: announcement.content,
        unit,
        target_role: 'all',
        is_active: true,
        sent_by: user.email,
      });
    }

    if (notification) {
      await base44.asServiceRole.entities.Notification.create({
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        category: notification.category || 'announcement',
        recipient_unit: unit,
      });
    }

    return Response.json({ success: true, id: saved?.id || existingId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});