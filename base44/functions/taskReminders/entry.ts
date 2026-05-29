import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Runs on a schedule — sends reminders for tasks due within 24 hours
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Fetch all open tasks using service role (scheduled task has no user context)
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

    await base44.asServiceRole.entities.Notification.create({
      title: '⏰ Task Due Soon',
      message: `Reminder: "${task.title}" is due ${dueStr}`,
      type: 'warning',
      category: 'admin',
      recipient_email: assignee.email,
      recipient_unit: task.unit,
    });
    sent++;
  }

  return Response.json({ checked: allOpen.length, reminders_sent: sent });
});