// ─────────────────────────────────────────────────────────────────────────────
//  API SERVICE — connects React Native app to your Node.js backend
// ─────────────────────────────────────────────────────────────────────────────

// !! CHANGE THIS to your computer's local IP when testing on physical device
// Find your IP: Windows → ipconfig | Mac/Linux → ifconfig
// It will look like 192.168.1.x or 10.0.0.x
// Do NOT use 'localhost' — that refers to the phone itself, not your PC
const LOCAL_URL = 'http://192.168.29.230:3001';
const PROD_URL = 'https://carevynps-3project-production.up.railway.app';

// Auto switch (development vs production)
const BACKEND_URL = __DEV__ ? LOCAL_URL : PROD_URL;

const request = async (endpoint, method = 'GET', body = null) => {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BACKEND_URL}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    // If backend is unreachable, throw with helpful message
    if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
      throw new Error(`Cannot reach backend at ${BACKEND_URL}. Make sure server is running.`);
    }
    throw err;
  }
};

// ── Backend health check ──────────────────────────────────────────────────────
export const checkBackendHealth = async () => {
  return request('/health');
};

// ── Gemini AI ─────────────────────────────────────────────────────────────────
export const GeminiAPI = {
  // Ask Gemini to decompose the task into steps
  decompose: async (task, config) => {
    return request('/api/gemini/decompose', 'POST', { task, config });
  },

  // Ask Gemini to reason about current execution state
  reason: async (task, completedSteps, currentContext, failedStep = null) => {
    return request('/api/gemini/reason', 'POST', { task, completedSteps, currentContext, failedStep });
  },

  // Ask Gemini to write execution summary
  summary: async (task, steps, config, meetingDetails) => {
    return request('/api/gemini/summary', 'POST', { task, steps, config, meetingDetails });
  },
};

// ── Email via nodemailer ──────────────────────────────────────────────────────
export const EmailAPI = {
  send: async (to, subject, meetingDetails) => {
    return request('/api/email/send', 'POST', { to, subject, meetingDetails });
  },
  test: async () => {
    return request('/api/email/test');
  },
};

// ── Push Notifications via FCM ────────────────────────────────────────────────
export const PushAPI = {
  send: async (tokens, title, body, data = {}) => {
    return request('/api/push/send', 'POST', { tokens, title, body, data });
  },
};

// ── Calendar API (stays local — no server needed) ─────────────────────────────
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
        confirmationCode: `CONF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        ...details,
        joinLink: `https://meet.google.com/${Math.random().toString(36).substr(2,4)}-${Math.random().toString(36).substr(2,4)}-${Math.random().toString(36).substr(2,4)}`,
      };
    }
    throw new Error('Time slot no longer available. Retrying...');
  },
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));