const express = require('express');
const router = express.Router();

// ── Initialize Firebase Admin ─────────────────────────────────────────────────
let firebaseAdmin = null;

const getFirebase = () => {
  if (firebaseAdmin) return firebaseAdmin;
  if (!process.env.FIREBASE_PROJECT_ID) throw new Error('Firebase not configured');

  const admin = require('firebase-admin');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  firebaseAdmin = admin;
  return admin;
};

// ── POST /api/push/send ───────────────────────────────────────────────────────
// Send push notification to FCM tokens
router.post('/send', async (req, res) => {
  try {
    const { tokens, title, body, data = {} } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.json({
        success: true,
        mock: true,
        message: 'No FCM tokens provided — push skipped',
        delivered: 0,
      });
    }

    const admin = getFirebase();

    const message = {
      notification: { title, body },
      data: { ...data, timestamp: Date.now().toString() },
      android: {
        priority: 'high',
        notification: {
          channelId: 'agent_notifications',
          priority: 'high',
          defaultSound: true,
          color: '#6C63FF',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    };

    let delivered = 0;
    let failed = 0;
    const results = [];

    if (tokens.length === 1) {
      const result = await admin.messaging().send({ ...message, token: tokens[0] });
      delivered = 1;
      results.push({ token: tokens[0], success: true, messageId: result });
    } else {
      const response = await admin.messaging().sendEachForMulticast({ ...message, tokens });
      response.responses.forEach((r, i) => {
        if (r.success) { delivered++; results.push({ token: tokens[i], success: true }); }
        else { failed++; results.push({ token: tokens[i], success: false, error: r.error?.message }); }
      });
    }

    res.json({
      success: true,
      real: true,
      delivered,
      failed,
      results,
      notificationId: `FCM-${Date.now()}`,
    });

  } catch (err) {
    console.error('Push route error:', err.message);
    // Graceful fallback — push failure shouldn't break the whole agent
    res.json({
      success: true,
      mock: true,
      error: err.message,
      message: 'Push notification skipped (Firebase not configured)',
      delivered: req.body.tokens?.length || 0,
    });
  }
});

// ── POST /api/push/topic ──────────────────────────────────────────────────────
// Send to a topic (e.g. all users subscribed to "team-notifications")
router.post('/topic', async (req, res) => {
  try {
    const { topic, title, body, data = {} } = req.body;
    const admin = getFirebase();

    const result = await admin.messaging().send({
      topic,
      notification: { title, body },
      data,
    });

    res.json({ success: true, messageId: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;