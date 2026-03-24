const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// ── Initialize Gemini ─────────────────────────────────────────────────────────
const getGemini = () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

// ── POST /api/gemini/decompose ────────────────────────────────────────────────
// Real AI task decomposition — Gemini figures out the steps
router.post('/decompose', async (req, res) => {
  try {
    const { task, config } = req.body;
    if (!task) return res.status(400).json({ error: 'task is required' });

    const model = getGemini();

    const prompt = `
You are an autonomous AI agent task planner. Given a task and configuration, 
decompose it into specific executable steps.

TASK: "${task}"

CONFIGURATION:
- Meeting Title: ${config?.meetingTitle || 'Team Meeting'}
- Date: ${config?.date || 'Tomorrow'}
- Duration: ${config?.duration || 60} minutes
- Team Members: ${config?.teamMembers?.join(', ') || 'Team'}
- Team Emails: ${config?.teamEmails?.join(', ') || 'N/A'}
- Slack Channel: #${config?.slackChannel || 'general'}
- Organizer: ${config?.organizer || 'User'}

Return a JSON array of steps. Each step must have these exact fields:
{
  "id": "unique_snake_case_id",
  "name": "Short Step Name",
  "description": "What this step does specifically for this task",
  "icon": "one of: shield-checkmark-outline, calendar-outline, time-outline, checkmark-circle-outline, mail-outline, chatbubble-outline, notifications-outline, document-text-outline, people-outline, search-outline",
  "tool": "one of: VALIDATOR, CALENDAR_API, SCHEDULER, EMAIL_API, SLACK_API, PUSH_API, REPORTER",
  "maxRetries": 2,
  "reasoning": "Why this step is needed"
}

Rules:
- Always start with a validation step
- Always end with a summary/report step  
- Include 5-9 steps total
- Make descriptions specific to the actual task and team
- Return ONLY valid JSON array, no markdown, no explanation
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown if Gemini wraps it
    const clean = text.replace(/```json|```/g, '').trim();
    const steps = JSON.parse(clean);

    // Add runtime fields
    const enriched = steps.map(step => ({
      ...step,
      status: 'pending',
      retries: 0,
    }));

    res.json({ success: true, steps: enriched, model: 'gemini-1.5-flash' });

  } catch (err) {
    console.error('Gemini decompose error:', err.message);
    res.status(500).json({ error: err.message, fallback: true });
  }
});

// ── POST /api/gemini/reason ───────────────────────────────────────────────────
// Gemini reasons about a step result and decides next action
router.post('/reason', async (req, res) => {
  try {
    const { task, completedSteps, currentContext, failedStep } = req.body;

    const model = getGemini();

    const prompt = `
You are an autonomous AI agent. A task is being executed and you need to reason about the current state.

ORIGINAL TASK: "${task}"

COMPLETED STEPS:
${completedSteps?.map(s => `- ${s.name}: ${s.status} ${s.result ? JSON.stringify(s.result).substring(0, 100) : ''}`).join('\n') || 'None'}

CURRENT CONTEXT:
${JSON.stringify(currentContext || {}, null, 2)}

${failedStep ? `FAILED STEP: "${failedStep.name}" — Error: "${failedStep.error}"` : ''}

Based on this state, provide a brief analysis in JSON:
{
  "assessment": "one sentence about current execution state",
  "recommendation": "what to do next",
  "shouldRetry": true/false,
  "shouldAbort": true/false,
  "confidence": 0.0-1.0,
  "insight": "any insight about the task progress"
}

Return ONLY valid JSON, no markdown.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g, '').trim();
    const reasoning = JSON.parse(text);

    res.json({ success: true, reasoning });

  } catch (err) {
    console.error('Gemini reason error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/gemini/summary ──────────────────────────────────────────────────
// Gemini generates a natural language execution summary
router.post('/summary', async (req, res) => {
  try {
    const { task, steps, config, meetingDetails } = req.body;

    const model = getGemini();

    const prompt = `
You are an AI agent that just completed a task. Write a concise, friendly execution summary.

TASK: "${task}"
TEAM: ${config?.teamMembers?.join(', ')}
MEETING: ${meetingDetails?.title || config?.meetingTitle} on ${config?.date}
MEETING ID: ${meetingDetails?.meetingId || 'N/A'}
JOIN LINK: ${meetingDetails?.joinLink || 'N/A'}

STEPS COMPLETED:
${steps?.map(s => `- ${s.name}: ${s.status}${s.retries > 0 ? ` (${s.retries} retries)` : ''}`).join('\n')}

Write a 2-3 sentence summary of what the agent accomplished. Be specific about what was done.
Mention the meeting ID and how many people were notified.
Keep it professional but friendly. No markdown, plain text only.
`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text().trim();

    res.json({ success: true, summary });

  } catch (err) {
    console.error('Gemini summary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/gemini/test ──────────────────────────────────────────────────────
router.get('/test', async (req, res) => {
  try {
    const model = getGemini();
    const result = await model.generateContent('Say "Gemini AI connected successfully" in exactly those words.');
    res.json({ success: true, message: result.response.text().trim() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;