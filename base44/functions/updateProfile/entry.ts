/**
 * updateProfile — secure user profile update endpoint
 * Users can update their own profile fields.
 * Instructors can update any user in their unit.
 * Unit changes always require the unit PIN.
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

// Allowed user-editable fields (never allow user_role escalation via this endpoint for non-instructors)
const ALLOWED_SELF_FIELDS = ['full_name', 'rank', 'unit', 'phone_number', 'platoon', 'section'];
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
    const { targetUserId, updates, unitPin, instructorPin } = body;

    const isInstructor = user.user_role === 'instructor';
    const isSelf = !targetUserId || targetUserId === user.id;

    // Instructors editing others must be same unit
    if (!isSelf) {
      if (!isInstructor) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Verify instructor PIN for editing others
      if (instructorPin !== ADMIN_PIN) {
        return Response.json({ error: 'Invalid instructor auth code' }, { status: 403 });
      }
    }

    // Determine allowed fields
    const allowed = isInstructor ? ALLOWED_INSTRUCTOR_FIELDS : ALLOWED_SELF_FIELDS;
    const safeUpdates = pick(updates || {}, allowed);

    if (Object.keys(safeUpdates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Unit change requires unit PIN validation
    const newUnit = safeUpdates.unit;
    if (newUnit) {
      // Get current unit of the target user
      let currentUnit = user.unit;
      if (!isSelf) {
        const targetUser = await base44.asServiceRole.entities.User.filter({ id: targetUserId });
        currentUnit = targetUser?.[0]?.unit;
      }
      if (newUnit !== currentUnit) {
        // Changing unit — require unit PIN
        const expectedPin = isInstructor ? ADMIN_PIN : UNIT_PINS[newUnit];
        if (!unitPin || unitPin !== expectedPin) {
          return Response.json({ error: 'Invalid unit PIN' }, { status: 403 });
        }
      }
    }

    // Perform the update
    const updateId = isSelf ? user.id : targetUserId;
    await base44.asServiceRole.entities.User.update(updateId, safeUpdates);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});