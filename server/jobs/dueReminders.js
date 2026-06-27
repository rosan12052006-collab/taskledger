const cron = require("node-cron");
const Task = require("../models/Task");
const User = require("../models/User");
const { sendDueSoonReminder } = require("../services/emailService");

/**
 * Runs once a day (default 8:00 AM server time, configurable via REMINDER_CRON).
 * Finds tasks that are:
 *   - not done
 *   - due within the next 24 hours (including already-overdue-but-recent ones)
 * Groups them by user and sends one email per user listing all of their
 * upcoming tasks, rather than one email per task.
 */
async function checkDueSoonTasks() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueSoon = await Task.find({
    status: { $ne: "done" },
    dueDate: { $ne: null, $lte: in24h },
  });

  if (dueSoon.length === 0) {
    console.log("[reminders] No tasks due soon.");
    return;
  }

  const byUser = dueSoon.reduce((acc, task) => {
    const key = task.userId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  for (const [userId, tasks] of Object.entries(byUser)) {
    try {
      const user = await User.findById(userId);
      if (!user) continue;
      await sendDueSoonReminder(user, tasks);
      console.log(`[reminders] Sent ${tasks.length} task reminder(s) to ${user.email}`);
    } catch (err) {
      console.error(`[reminders] Failed to email user ${userId}:`, err.message);
    }
  }
}

function startReminderJob() {
  const schedule = process.env.REMINDER_CRON || "0 8 * * *"; // default: 8:00 AM daily
  cron.schedule(schedule, () => {
    checkDueSoonTasks().catch((err) => console.error("[reminders] Job failed:", err));
  });
  console.log(`[reminders] Scheduled with cron pattern "${schedule}"`);
}

module.exports = { startReminderJob, checkDueSoonTasks };
