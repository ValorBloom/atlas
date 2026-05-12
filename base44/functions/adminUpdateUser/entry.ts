/**
 * adminUpdateUser — instructor-only endpoint to update any user's profile fields.
 * full_name is handled separately via asServiceRole since it's a built-in field.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_FIELDS = ['rank', 'unit', 'platoon', 'section', 'user_role'];
const ALLOWED_WITH_NAME = ['rank', 'unit', 'platoon', 'section', 'user_role', 'full_name'];

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.user_role !== 'instructor') return Response.json({ error: 'Forbidden: Instructors only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { userId, updates } = body;

    if (!userId) return Response.json({ error: 'userId required' }, { status: 400 });

    const safeUpdates = pick(updates || {}, ALLOWED_WITH_NAME);
    if (Object.keys(safeUpdates).length === 0) return Response.json({ error: 'No valid fields' }, { status: 400 });

    // Extract full_name before updating entity fields
    const { full_name, ...entityUpdates } = safeUpdates;

    // Update entity fields (rank, platoon, etc.)
    if (Object.keys(entityUpdates).length > 0) {
      await base44.asServiceRole.entities.User.update(userId, entityUpdates);
    }

    // Update full_name via a separate mechanism — store in entity data
    // Since full_name is a built-in field, we update it via the entity too
    if (full_name) {
      await base44.asServiceRole.entities.User.update(userId, { full_name });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});