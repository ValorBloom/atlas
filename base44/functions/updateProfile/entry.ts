/**
 * updateProfile — secure user profile update endpoint
 * Users can update their own profile fields.
 * Unit changes require the unit PIN.
 * Instructors require the ADMIN_PIN to change units.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const UNIT_PINS = {
  Alpha:   "482731",
  Charlie: "615284",
  Delta:   "903617",
  Echo:    "274958",
  Sierra:  "531846",
  Tango:   "768129",
  Air:     "040475",
  Mids:    "050567",
  DIS:     "281022",
};

const ADMIN_PIN = "SAF2040";

const ALLOWED_SELF_FIELDS = ['full_name', 'rank', 'unit', 'platoon', 'section'];
const ALLOWED_INSTRUCTOR_FIELDS = [...ALLOWED_SELF_FIELDS, 'user_role'];

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

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { updates, unitPin } = body;

    const isInstructor = user.user_role === 'instructor';
    const allowed = isInstructor ? ALLOWED_INSTRUCTOR_FIELDS : ALLOWED_SELF_FIELDS;
    const safeUpdates = pick(updates || {}, allowed);

    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Unit change check — only require PIN if unit is actually changing
    const newUnit = safeUpdates.unit;
    const currentUnit = user.unit;

    if (newUnit && newUnit !== currentUnit) {
      const expectedPin = isInstructor ? ADMIN_PIN : UNIT_PINS[newUnit];
      if (!expectedPin) {
        return Response.json({ error: `Unknown unit: ${newUnit}` }, { status: 400 });
      }
      if (!unitPin) {
        return Response.json({ error: `A unit PIN is required to transfer to ${newUnit}` }, { status: 403 });
      }
      if (unitPin !== expectedPin) {
        return Response.json({ error: `Incorrect PIN for ${newUnit}. Please check with your unit admin.` }, { status: 403 });
      }
    }

    // Update all fields via service role entity update
    await base44.asServiceRole.entities.User.update(user.id, safeUpdates);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});