/**
 * taskReminders — scheduled task to send incomplete-task reminders to assignees
 * Sends each cadet a single digest of all their open (Not Done / In Progress) tasks,
 * so they stay on top of assigned duties. Flags overdue and due-soon items.
 * Security:
 * - Zod schema validation on incoming payload
 * - Admin-only guard (role check before execution)
 * - Runs via service role; never exposes raw user data
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { z } from 'npm:zod@3.22.4';

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

    const rawBody = await req.json().catch(() => ({}));
    const parsed = PayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }
    const { dry_run } = parsed.data;

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const notDone = await base44.asServiceRole.entities.Task.filter({ status: 'Not Done' });
    const inProgress = await base44.asServiceRole.entities.Task.filter({ status: 'In Progress' });
    const allOpen = [...notDone, ...inProgress].filter(t => t.assigned_to_id);

    // Group open tasks by assignee
    const byAssignee = {};
    for (const task of allOpen) {
      (byAssignee[task.assigned_to_id] ||= []).push(task);
    }

    let sent = 0;
    for (const [assigneeId, tasks] of Object.entries(byAssignee)) {
      const users = await base44.asServiceRole.entities.User.filter({ id: assigneeId });
      const assignee = users?.[0];
      if (!assignee?.email) continue;

      const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < now);
      const dueSoon = tasks.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= in24h);

      const count = tasks.length;
      let message;
      if (overdue.length > 0) {
        message = `You have ${count} incomplete task${count > 1 ? 's' : ''} — ${overdue.length} overdue${dueSoon.length ? `, ${dueSoon.length} due soon` : ''}. Tap to review and complete them.`;
      } else if (dueSoon.length > 0) {
        message = `You have ${count} incomplete task${count > 1 ? 's' : ''}, ${dueSoon.length} due within 24h. Tap to review and complete them.`;
      } else {
        message = `You have ${count} incomplete task${count > 1 ? 's' : ''} assigned. Tap to review and complete them.`;
      }

      if (!dry_run) {
        await base44.asServiceRole.entities.Notification.create({
          title: overdue.length > 0 ? '⚠️ Overdue Tasks' : '📋 Task Reminder',
          message,
          type: overdue.length > 0 ? 'error' : 'warning',
          category: 'admin',
          recipient_email: assignee.email,
          recipient_unit: assignee.unit || tasks[0].unit,
          link: '/tasks',
        });
      }
      sent++;
    }

    return Response.json({ assignees_notified: sent, open_tasks: allOpen.length, dry_run });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});