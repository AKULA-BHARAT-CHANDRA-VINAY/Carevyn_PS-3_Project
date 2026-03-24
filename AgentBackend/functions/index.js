const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

// ── Initialize Firebase Admin (automatic in Functions — no credentials needed) 
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ── Get config values set via: firebase functions:config:set ─────────────────
// Run these commands once in your terminal:
// firebase functions:config:set email.user="you@gmail.com"
// firebase functions:config:set email.pass="your-app-password"
// firebase functions:config:set gemini.key="your-gemini-key"

const getConfig = () => {
  try {
    return functions.config();
  } catch {
    return {
      email: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      gemini: { key: process.env.GEMINI_API_KEY },
    };
  }
};

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const config = getConfig();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      email: !!config.email?.user,
      gemini: !!config.gemini?.key,
      push: true, // Always available in Firebase Functions
    },
    platform: 'Firebase Functions',
  });
});

// ── EMAIL ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, meetingDetails } = req.body;
    const config = getConfig();

    if (!config.email?.user || !config.email?.pass) {
      return res.status(503).json({ error: 'Email not configured. Run: firebase functions:config:set email.user="x" email.pass="y"' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    const recipients = Array.isArray(to) ? to : [to];
    const results = [];

    for (const recipient of recipients) {
      try {
        await transporter.sendMail({
          from: `"AI Agent" <${config.email.user}>`,
          to: recipient,
          subject,
          html: buildEmailHTML(meetingDetails, subject),
        });
        results.push({ email: recipient, success: true });
        console.log(`✅ Email sent to ${recipient}`);
      } catch (err) {
        results.push({ email: recipient, success: false, error: err.message });
        console.error(`❌ Failed: ${recipient}`, err.message);
      }
    }

    const delivered = results.filter(r => r.success).length;
    res.json({
      success: delivered > 0,
      real: true,
      deliveredCount: delivered,
      failedCount: results.filter(r => !r.success).length,
      results,
      messageId: `EMAIL-${Date.now()}`,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/email/test', async (req, res) => {
  try {
    const config = getConfig();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.email?.user, pass: config.email?.pass },
    });
    await transporter.verify();
    res.json({ success: true, message: 'Gmail connected ✅', user: config.email?.user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GEMINI ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/gemini/decompose', async (req, res) => {
  try {
    const { task, config: taskConfig } = req.body;
    const config = getConfig();

    if (!config.gemini?.key) {
      return res.status(503).json({ error: 'Gemini not configured', fallback: true });
    }

    const genAI = new GoogleGenerativeAI(config.gemini.key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an autonomous AI agent task planner. Decompose this task into executable steps.

TASK: "${task}"
CONFIGURATION:
- Meeting Title: ${taskConfig?.meetingTitle || 'Team Meeting'}
- Date: ${taskConfig?.date || 'Tomorrow'}
- Duration: ${taskConfig?.duration || 60} minutes
- Team Members: ${taskConfig?.teamMembers?.join(', ') || 'Team'}
- Team Emails: ${taskConfig?.teamEmails?.join(', ') || 'N/A'}
- Slack Channel: #${taskConfig?.slackChannel || 'general'}
- Organizer: ${taskConfig?.organizer || 'User'}

Return a JSON array of steps. Each step must have:
{
  "id": "unique_snake_case_id",
  "name": "Short Step Name",
  "description": "Specific description for this task",
  "icon": "one of: shield-checkmark-outline, calendar-outline, time-outline, checkmark-circle-outline, mail-outline, notifications-outline, document-text-outline, people-outline",
  "tool": "one of: VALIDATOR, CALENDAR_API, SCHEDULER, EMAIL_API, FCM_API, GEMINI_AI, REPORTER",
  "maxRetries": 2,
  "reasoning": "Why this step is needed"
}

Rules: Start with validation, end with summary, 5-8 steps total.
Return ONLY valid JSON array, no markdown.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g, '').trim();
    const steps = JSON.parse(text);

    res.json({
      success: true,
      steps: steps.map(s => ({ ...s, status: 'pending', retries: 0 })),
      model: 'gemini-1.5-flash',
    });

  } catch (err) {
    console.error('Gemini decompose error:', err.message);
    res.status(500).json({ error: err.message, fallback: true });
  }
});

app.post('/api/gemini/reason', async (req, res) => {
  try {
    const { task, completedSteps, currentContext, failedStep } = req.body;
    const config = getConfig();
    if (!config.gemini?.key) return res.status(503).json({ error: 'Gemini not configured' });

    const genAI = new GoogleGenerativeAI(config.gemini.key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an autonomous AI agent. Analyze the current execution state.
TASK: "${task}"
COMPLETED: ${completedSteps?.map(s => `${s.name}: ${s.status}`).join(', ')}
${failedStep ? `FAILED STEP: "${failedStep.name}" — Error: "${failedStep.error}"` : ''}

Respond in JSON:
{"assessment": "one sentence", "recommendation": "what to do", "shouldRetry": true/false, "shouldAbort": true/false, "confidence": 0.0-1.0, "insight": "brief insight"}
Return ONLY valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g, '').trim();
    res.json({ success: true, reasoning: JSON.parse(text) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gemini/summary', async (req, res) => {
  try {
    const { task, steps, config: taskConfig, meetingDetails } = req.body;
    const config = getConfig();
    if (!config.gemini?.key) return res.status(503).json({ error: 'Gemini not configured' });

    const genAI = new GoogleGenerativeAI(config.gemini.key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Write a concise, friendly 2-3 sentence summary of what this AI agent just completed.
TASK: "${task}"
TEAM: ${taskConfig?.teamMembers?.join(', ')}
MEETING: ${meetingDetails?.title || taskConfig?.meetingTitle} on ${taskConfig?.date}
MEETING ID: ${meetingDetails?.meetingId || 'N/A'}
STEPS: ${steps?.map(s => `${s.name}: ${s.status}`).join(', ')}
Be specific, mention meeting ID and how many people notified. Plain text only, no markdown.`;

    const result = await model.generateContent(prompt);
    res.json({ success: true, summary: result.response.text().trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gemini/test', async (req, res) => {
  try {
    const config = getConfig();
    if (!config.gemini?.key) return res.status(503).json({ error: 'Gemini not configured' });
    const genAI = new GoogleGenerativeAI(config.gemini.key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say "Gemini connected successfully" exactly.');
    res.json({ success: true, message: result.response.text().trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUSH NOTIFICATION ROUTES ──────────────────────────────────────────────────
app.post('/api/push/send', async (req, res) => {
  try {
    const { tokens, title, body, data = {} } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.json({ success: true, mock: true, message: 'No tokens provided', delivered: 0 });
    }

    const message = {
      notification: { title, body },
      data: { ...data, timestamp: Date.now().toString() },
      android: {
        priority: 'high',
        notification: { channelId: 'agent_notifications', color: '#6C63FF', defaultSound: true },
      },
    };

    let delivered = 0, failed = 0;

    if (tokens.length === 1) {
      await admin.messaging().send({ ...message, token: tokens[0] });
      delivered = 1;
    } else {
      const response = await admin.messaging().sendEachForMulticast({ ...message, tokens });
      delivered = response.successCount;
      failed = response.failureCount;
    }

    res.json({ success: true, real: true, delivered, failed, notificationId: `FCM-${Date.now()}` });

  } catch (err) {
    console.error('Push error:', err.message);
    res.json({ success: true, mock: true, error: err.message, delivered: 0 });
  }
});

app.post('/api/push/topic', async (req, res) => {
  try {
    const { topic, title, body, data = {} } = req.body;
    const result = await admin.messaging().send({ topic, notification: { title, body }, data });
    res.json({ success: true, messageId: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── EMAIL HTML TEMPLATE ───────────────────────────────────────────────────────
function buildEmailHTML(details = {}, subject = 'Meeting Invite') {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f0f2ff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(108,99,255,0.12);">
<tr><td style="background:linear-gradient(135deg,#6C63FF,#A855F7);padding:36px 40px;text-align:center;">
  <div style="font-size:40px;margin-bottom:10px;">📅</div>
  <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">Meeting Invite</h1>
  <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">${details.title || subject}</p>
</td></tr>
<tr><td style="padding:36px 40px;">
  <table width="100%">
    ${details.date ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f2ff;"><span style="color:#888;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">DATE</span><br><span style="color:#0A0A2E;font-size:16px;font-weight:600;">${details.date}</span></td></tr>` : ''}
    ${details.time ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f2ff;"><span style="color:#888;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">TIME</span><br><span style="color:#0A0A2E;font-size:16px;font-weight:600;">${details.time}</span></td></tr>` : ''}
    ${details.duration ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f2ff;"><span style="color:#888;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">DURATION</span><br><span style="color:#0A0A2E;font-size:16px;font-weight:600;">${details.duration} minutes</span></td></tr>` : ''}
    ${details.organizer ? `<tr><td style="padding:10px 0;border-bottom:1px solid #f0f2ff;"><span style="color:#888;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">ORGANIZER</span><br><span style="color:#0A0A2E;font-size:16px;font-weight:600;">${details.organizer}</span></td></tr>` : ''}
    ${details.meetingId ? `<tr><td style="padding:10px 0;"><span style="color:#888;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">MEETING ID</span><br><span style="color:#6C63FF;font-size:14px;font-family:monospace;font-weight:600;">${details.meetingId}</span></td></tr>` : ''}
  </table>
  ${details.joinLink ? `<div style="text-align:center;margin-top:28px;"><a href="${details.joinLink}" style="background:linear-gradient(135deg,#6C63FF,#A855F7);color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:700;font-size:16px;display:inline-block;">🎥 Join Meeting</a></div>` : ''}
</td></tr>
<tr><td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaff;">
  <p style="color:#888;font-size:12px;margin:0;">Sent by <strong>Autonomous AI Agent</strong> • Powered by Gemini AI</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

// ── Export as Firebase Function ───────────────────────────────────────────────
exports.api = functions.https.onRequest(app);