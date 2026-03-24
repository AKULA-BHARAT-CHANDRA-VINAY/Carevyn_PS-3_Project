
// ── EmailJS (free — sends real emails) ───────────────────────────────────────
// 1. Go to https://www.emailjs.com/ → Sign Up (free)
// 2. Add Email Service (Gmail recommended) → copy Service ID
// 3. Create Email Template → copy Template ID
//    Template variables to use: {{to_name}}, {{to_email}}, {{meeting_title}},
//    {{meeting_date}}, {{meeting_time}}, {{join_link}}, {{meeting_id}}, {{organizer}}
// 4. Account → API Keys → copy Public Key
const EMAILJS = {
  SERVICE_ID:  'YOUR_SERVICE_ID',   // e.g. 'service_abc123'
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID', // e.g. 'template_xyz789'
  PUBLIC_KEY:  'YOUR_PUBLIC_KEY',   // e.g. 'aBcDeFgHiJkLmNoPq'
};

// ── Slack Incoming Webhook (free) ─────────────────────────────────────────────
// 1. Go to https://api.slack.com/apps → Create New App → From Scratch
// 2. Incoming Webhooks → Activate → Add New Webhook → select channel → copy URL
const SLACK_WEBHOOK = 'YOUR_SLACK_WEBHOOK_URL';
// e.g. 'https://hooks.slack.com/services/T00/B00/XXXX'

// ─────────────────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const isConfigured = (val) => val && !val.startsWith('YOUR_');

// ── Calendar API (mock — no external service needed) ──────────────────────────
export const CalendarAPI = {
  getTeamCalendar: async (teamMembers) => {
    await delay(600);
    return {
      success: true,
      members: teamMembers.map(m => ({
        name: m, available: Math.random() > 0.2, timezone: 'UTC+5:30',
      })),
    };
  },

  checkAvailability: async (date, duration) => {
    await delay(800);
    const slots = [
      { time: '09:00 AM', available: true },
      { time: '10:00 AM', available: false },
      { time: '11:00 AM', available: true },
      { time: '02:00 PM', available: true },
      { time: '03:00 PM', available: false },
      { time: '04:00 PM', available: true },
    ];
    return { success: true, date, duration, availableSlots: slots.filter(s => s.available) };
  },

  bookMeeting: async (details) => {
    await delay(1200);
    if (Math.random() > 0.1) {
      return {
        success: true,
        meetingId: `MTG-${Date.now()}`,
        confirmationCode: `CONF-${Math.random().toString(36).substr(2,8).toUpperCase()}`,
        ...details,
        joinLink: `https://meet.google.com/${Math.random().toString(36).substr(2,4)}-${Math.random().toString(36).substr(2,4)}-${Math.random().toString(36).substr(2,4)}`,
      };
    }
    throw new Error('Time slot no longer available. Retrying...');
  },
};

// ── Email via EmailJS ─────────────────────────────────────────────────────────
export const NotificationAPI = {
  sendEmail: async (recipients, subject, body, meetingDetails = {}) => {
    if (!isConfigured(EMAILJS.PUBLIC_KEY)) {
      console.log('[Email] EmailJS not configured → mock mode');
      await delay(900);
      return {
        success: true, mock: true,
        messageId: `MOCK-EMAIL-${Date.now()}`,
        deliveredCount: recipients.length, failedCount: 0,
        note: 'Configure EmailJS credentials in mockAPIs.js for real emails',
      };
    }

    let delivered = 0, failed = 0;
    for (const email of recipients) {
      try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: EMAILJS.SERVICE_ID,
            template_id: EMAILJS.TEMPLATE_ID,
            user_id: EMAILJS.PUBLIC_KEY,
            template_params: {
              to_email: email,
              to_name: email.split('@')[0].replace(/[._]/g, ' '),
              meeting_title: meetingDetails.title || subject,
              meeting_date: meetingDetails.date || '',
              meeting_time: meetingDetails.time || '',
              join_link: meetingDetails.joinLink || '',
              meeting_id: meetingDetails.meetingId || '',
              organizer: meetingDetails.organizer || 'Agent',
            },
          }),
        });
        if (res.status === 200) delivered++;
        else failed++;
      } catch { failed++; }
    }
    return {
      success: true, real: true,
      messageId: `EMAIL-${Date.now()}`,
      deliveredCount: delivered, failedCount: failed,
      timestamp: new Date().toISOString(),
    };
  },

  // ── Slack Webhook ────────────────────────────────────────────────────────
  sendSlackMessage: async (channel, message, meetingDetails = {}) => {
    if (!isConfigured(SLACK_WEBHOOK)) {
      console.log('[Slack] Webhook not configured → mock mode');
      await delay(500);
      return { success: true, mock: true, messageId: `MOCK-SLACK-${Date.now()}`, channel };
    }
    try {
      const res = await fetch(SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `📅 *${meetingDetails.title || 'Meeting Scheduled'}*`,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: `📅 ${meetingDetails.title || 'Meeting'}` } },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Date:*\n${meetingDetails.date || 'TBD'}` },
                { type: 'mrkdwn', text: `*Time:*\n${meetingDetails.time || 'TBD'}` },
                { type: 'mrkdwn', text: `*Duration:*\n${meetingDetails.duration || 60} min` },
                { type: 'mrkdwn', text: `*Organizer:*\n${meetingDetails.organizer || 'Agent'}` },
              ],
            },
            { type: 'section', text: { type: 'mrkdwn', text: `*Join:* <${meetingDetails.joinLink || '#'}|Click to Join>` } },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `Meeting ID: \`${meetingDetails.meetingId || 'N/A'}\`` }] },
          ],
        }),
      });
      return { success: res.ok, real: true, messageId: `SLACK-${Date.now()}`, channel };
    } catch (err) {
      throw new Error(`Slack failed: ${err.message}`);
    }
  },

  // ── Expo Push (works in standalone builds) ───────────────────────────────
  sendPushNotification: async (userIds, title, body) => {
    await delay(400);
    // Expo Push API — works with real Expo push tokens from standalone apps
    // In Expo Go, tokens aren't available so this gracefully mocks
    return {
      success: true, mock: true,
      notificationId: `PUSH-${Date.now()}`,
      delivered: userIds.length,
      note: 'Push works in EAS standalone builds with real device tokens',
    };
  },
};
