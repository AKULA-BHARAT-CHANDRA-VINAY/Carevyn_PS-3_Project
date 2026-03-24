require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const emailRouter = require('./routes/email');
const geminiRouter = require('./routes/gemini');
const pushRouter = require('./routes/push');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/email', emailRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/push', pushRouter);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      email: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS,
      gemini: !!process.env.GEMINI_API_KEY,
      push: !!process.env.FIREBASE_PROJECT_ID,
    },
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Agent Backend running on http://localhost:${PORT}`);
  console.log(`   Email:  ${process.env.EMAIL_USER ? '✅ configured' : '❌ not configured'}`);
  console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ not configured'}`);
  console.log(`   Push:   ${process.env.FIREBASE_PROJECT_ID ? '✅ configured' : '❌ not configured'}`);
  console.log('');
});

module.exports = app;