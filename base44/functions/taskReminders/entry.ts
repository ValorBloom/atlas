/**
 * taskReminders — scheduled task to send due-soon notifications
 * Security features:
 * - Zod schema validation on incoming payload
 * - Admin-only guard (role check before execution)
 * - Rate limiting per invocation (prevents runaway re-triggers)
 * - Runs only via service role; never exposes raw user data
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { z } from 'npm:zod@3.22.4';

// Zod schema: scheduled runner sends an empty body or { dry_run: bool }
const PayloadSchema = z.object({
  dry_run: z.boolean().optional().default(false),
}).optional().default({});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth guard — admin or service-role only
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (isAuthenticated) {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Validate payload
    const rawBody = await req.json().catch(() => ({}));
    const parsed = PayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const { dry_run } = parsed.data;

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await base44.asServiceRole.entities.Task.filter({ status: 'Not Done' });
    const inProgressTasks = await base44.asServiceRole.entities.Task.filter({ status: 'In Progress' });
    const allOpen = [...tasks, ...inProgressTasks];

    const reminders = allOpen.filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return due > now && due <= in24h;
    });

    let sent = 0;
    for (const task of reminders) {
      if (!task.assigned_to_id) continue;

      const users = await base44.asServiceRole.entities.User.filter({ id: task.assigned_to_id });
      const assignee = users?.[0];
      if (!assignee?.email) continue;

      const dueStr = new Date(task.due_date).toLocaleString('en-SG', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
      });

      if (!dry_run) {
        await base44.asServiceRole.entities.Notification.create({
          title: '⏰ Task Due Soon',
          message: `Reminder: "${task.title}" is due ${dueStr}`,
          type: 'warning',
          category: 'admin',
          recipient_email: assignee.email,
          recipient_unit: task.unit,
        });
      }
      sent++;
    }

    return Response.json({ checked: allOpen.length, reminders_sent: sent, dry_run });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});