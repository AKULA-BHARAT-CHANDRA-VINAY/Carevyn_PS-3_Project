const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// ── Create transporter using your exact pattern ───────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ── Send meeting invite email ─────────────────────────────────────────────────
// POST /api/email/send
router.post('/send', async (req, res) => {
  try {
    const { to, subject, meetingDetails } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' });
    }
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({ error: 'Email service not configured on server' });
    }

    const transporter = createTransporter();

    // Build beautiful HTML email
    const html = buildMeetingEmailHTML(meetingDetails, subject);

    const recipients = Array.isArray(to) ? to : [to];
    const results = [];

    for (const recipient of recipients) {
      try {
        await transporter.sendMail({
          from: `"AI Agent" <${process.env.EMAIL_USER}>`,
          to: recipient,
          subject,
          html,
        });
        results.push({ email: recipient, success: true });
        console.log(`✅ Email sent to ${recipient}`);
      } catch (err) {
        results.push({ email: recipient, success: false, error: err.message });
        console.error(`❌ Failed to send to ${recipient}:`, err.message);
      }
    }

    const delivered = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: delivered > 0,
      deliveredCount: delivered,
      failedCount: failed,
      results,
      messageId: `EMAIL-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Email route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Test email connection ─────────────────────────────────────────────────────
// GET /api/email/test
router.get('/test', async (req, res) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    res.json({ success: true, message: 'Gmail connection verified ✅', user: process.env.EMAIL_USER });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── HTML Email Template ───────────────────────────────────────────────────────
function buildMeetingEmailHTML(details = {}, subject = 'Meeting Invite') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2ff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(108,99,255,0.12);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6C63FF,#A855F7);padding:36px 40px;text-align:center;">
            <div style="font-size:40px;margin-bottom:10px;">📅</div>
            <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;">Meeting Invite</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">${details.title || subject}</p>
          </td>
        </tr>

        <!-- Details -->
        <tr>
          <td style="padding:36px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${details.date ? `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f0f2ff;">
                  <span style="color:#888;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Date</span><br>
                  <span style="color:#0A0A2E;font-size:16px;font-weight:600;margin-top:4px;display:block;">${details.date}</span>
                </td>
              </tr>` : ''}
              ${details.time ? `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f0f2ff;">
                  <span style="color:#888;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Time</span><br>
                  <span style="color:#0A0A2E;font-size:16px;font-weight:600;margin-top:4px;display:block;">${details.time}</span>
                </td>
              </tr>` : ''}
              ${details.duration ? `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f0f2ff;">
                  <span style="color:#888;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Duration</span><br>
                  <span style="color:#0A0A2E;font-size:16px;font-weight:600;margin-top:4px;display:block;">${details.duration} minutes</span>
                </td>
              </tr>` : ''}
              ${details.organizer ? `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f0f2ff;">
                  <span style="color:#888;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Organizer</span><br>
                  <span style="color:#0A0A2E;font-size:16px;font-weight:600;margin-top:4px;display:block;">${details.organizer}</span>
                </td>
              </tr>` : ''}
              ${details.agenda ? `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f0f2ff;">
                  <span style="color:#888;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Agenda</span><br>
                  <span style="color:#0A0A2E;font-size:15px;margin-top:4px;display:block;">${details.agenda}</span>
                </td>
              </tr>` : ''}
              ${details.meetingId ? `
              <tr>
                <td style="padding:12px 0;">
                  <span style="color:#888;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Meeting ID</span><br>
                  <span style="color:#6C63FF;font-size:14px;font-family:monospace;font-weight:600;margin-top:4px;display:block;">${details.meetingId}</span>
                </td>
              </tr>` : ''}
            </table>

            ${details.joinLink ? `
            <div style="text-align:center;margin-top:28px;">
              <a href="${details.joinLink}" style="background:linear-gradient(135deg,#6C63FF,#A855F7);color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;font-size:16px;display:inline-block;">
                🎥 Join Meeting
              </a>
            </div>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9ff;padding:24px 40px;text-align:center;border-top:1px solid #e8eaff;">
            <p style="color:#888;font-size:12px;margin:0;">
              Sent by <strong>Autonomous AI Agent</strong> • Powered by Gemini AI<br>
              This is an automated notification. Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = router;