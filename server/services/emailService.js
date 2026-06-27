/**
 * Sends emails using your own Gmail account via nodemailer.
 *
 * Required env vars:
 *   GMAIL_USER          - your full Gmail address, e.g. rosanrosan40559@gmail.com
 *   GMAIL_APP_PASSWORD  - a 16-character App Password from your Google Account
 *                         (NOT your normal Gmail password — see setup steps in README)
 *
 * This can send to ANY recipient email address, unlike Resend's free-tier
 * "only your own email" restriction — so real users signing up with their
 * own emails will actually receive reminders.
 */
const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const t = getTransporter();
  const from = process.env.GMAIL_USER;

  if (!t) {
    console.warn("[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping send. Would have sent:", { to, subject });
    return { skipped: true };
  }

  try {
    const info = await t.sendMail({
      from: `TaskLedger <${from}>`,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    throw new Error(`Gmail send failed: ${err.message}`);
  }
}

function renderReminderEmail(user, tasks) {
  const rows = tasks
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #DAD3C2;font-family:sans-serif;">${t.title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #DAD3C2;font-family:sans-serif;color:${
          t.priority === "high" ? "#B5482F" : t.priority === "medium" ? "#C8862E" : "#5B5A4E"
        };text-transform:capitalize;">${t.priority}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #DAD3C2;font-family:monospace;">${new Date(
          t.dueDate
        ).toLocaleDateString()}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;background:#F6F3EC;padding:24px;">
      <h2 style="font-family:serif;color:#22271F;">Hi ${user.name}, you've got tasks due soon</h2>
      <p style="color:#5B5A4E;">Here's what's coming up in your TaskLedger:</p>
      <table style="width:100%;background:#FFFDF9;border-radius:8px;border:1px solid #DAD3C2;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 12px;color:#5B5A4E;font-family:sans-serif;">Task</th>
            <th style="text-align:left;padding:8px 12px;color:#5B5A4E;font-family:sans-serif;">Priority</th>
            <th style="text-align:left;padding:8px 12px;color:#5B5A4E;font-family:sans-serif;">Due</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#5B5A4E;font-size:13px;margin-top:16px;">
        Open TaskLedger to mark these done or push back the due date.
      </p>
    </div>
  `;
}

async function sendDueSoonReminder(user, tasks) {
  return sendEmail({
    to: user.email,
    subject: `${tasks.length} task${tasks.length > 1 ? "s" : ""} due soon — TaskLedger`,
    html: renderReminderEmail(user, tasks),
  });
}

module.exports = { sendEmail, sendDueSoonReminder };
