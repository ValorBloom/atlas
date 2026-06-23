import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Saves a CET record (create or update) and broadcasts it to every member of the unit.
// Runs as service role so the write + per-member notifications always fire together,
// independent of per-row RLS quirks. Instructors / cadet admins only.
//
// Returns a delivery report (total members targeted, delivered, failed) which is
// also persisted on the CET record so instructors can audit distribution later.
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

    // ── 1. Save the CET record FIRST so persistence is never blocked by notifications ──
    const basePayload = { ...record, unit, sent_by: user.email, is_published: true };

    let savedId = existingId;
    if (existingId) {
      await base44.asServiceRole.entities.CETRecord.update(existingId, basePayload);
    } else {
      const created = await base44.asServiceRole.entities.CETRecord.create(basePayload);
      savedId = created?.id;
    }

    // ── 2. Optional unit-wide announcement (best-effort) ──
    let announcementError = null;
    if (announcement) {
      try {
        await base44.asServiceRole.entities.Announcement.create({
          title: announcement.title,
          content: announcement.content,
          unit,
          target_role: 'all',
          is_active: true,
          sent_by: user.email,
        });
      } catch (e) {
        announcementError = e.message;
      }
    }

    // ── 3. Fan out a notification to every member of the unit + track delivery ──
    const delivery = {
      total_members: 0,
      delivered: 0,
      failed: 0,
      failures: [],
      sent_at: new Date().toISOString(),
    };

    if (notification) {
      // All members of the unit (the people who should receive the CET).
      const members = await base44.asServiceRole.entities.User.filter({ unit });
      const recipients = members.filter((m) => m.email);
      delivery.total_members = recipients.length;

      // Per-member fan-out: each member gets their own targeted notification so we can
      // measure delivery precisely (avoids duplicating a separate unit-wide broadcast).
      for (const m of recipients) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info',
            category: notification.category || 'announcement',
            recipient_unit: unit,
            recipient_email: m.email,
          });
          delivery.delivered += 1;
        } catch (_e) {
          delivery.failed += 1;
          delivery.failures.push(m.email);
        }
      }
    }

    // ── 4. Persist the delivery report on the CET record ──
    if (savedId) {
      try {
        await base44.asServiceRole.entities.CETRecord.update(savedId, { delivery });
      } catch (_e) {
        // Non-fatal — the report is still returned to the caller below.
      }
    }

    return Response.json({
      success: true,
      id: savedId,
      delivery,
      announcementError,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});