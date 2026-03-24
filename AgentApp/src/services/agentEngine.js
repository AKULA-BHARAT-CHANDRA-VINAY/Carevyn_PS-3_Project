import { CalendarAPI, EmailAPI, PushAPI, GeminiAPI } from './apiService';

// ─── Task Decomposer — Gemini first, rule-based fallback ──────────────────────
export const decomposeTask = async (taskInput, config, onLog) => {
  try {
    onLog?.({ message: '🧠 Asking Gemini AI to plan task...', type: 'info', timestamp: new Date().toISOString() });
    const result = await GeminiAPI.decompose(taskInput, config);
    if (result.success && result.steps?.length > 0) {
      onLog?.({ message: `✓ Gemini planned ${result.steps.length} steps`, type: 'success', timestamp: new Date().toISOString() });
      return result.steps;
    }
  } catch (err) {
    onLog?.({ message: `⚠ Gemini unavailable — using built-in planner`, type: 'warning', timestamp: new Date().toISOString() });
  }
  return decomposeTaskFallback(taskInput, config);
};

export const decomposeTaskFallback = (taskInput, config) => {
  const task = taskInput.toLowerCase();
  const steps = [];

  steps.push({ id: 'validate', name: 'Validate Inputs', description: `Checking ${config.teamMembers?.length || 0} team members and task parameters`, icon: 'shield-checkmark-outline', tool: 'VALIDATOR', status: 'pending', retries: 0, maxRetries: 2 });

  if (task.includes('meeting') || task.includes('book') || task.includes('schedule') || task.includes('standup') || task.includes('retrospective')) {
    steps.push({ id: 'check_availability', name: 'Check Availability', description: `Fetching team calendar for ${config.teamMembers?.length || 0} members`, icon: 'calendar-outline', tool: 'CALENDAR_API', status: 'pending', retries: 0, maxRetries: 3 });
    steps.push({ id: 'find_slot', name: 'Find Best Time Slot', description: 'Analyzing schedules to find optimal meeting time', icon: 'time-outline', tool: 'SCHEDULER', status: 'pending', retries: 0, maxRetries: 2 });
    steps.push({ id: 'book_meeting', name: 'Book Meeting', description: `Reserving ${config.duration || 60}-min slot`, icon: 'checkmark-circle-outline', tool: 'CALENDAR_API', status: 'pending', retries: 0, maxRetries: 3 });
  }

  if (task.includes('notify') || task.includes('team') || task.includes('send') || task.includes('update')) {
    steps.push({ id: 'send_email', name: 'Send Email Invites', description: `Real Gmail emails to ${config.teamEmails?.length || config.teamMembers?.length || 0} recipients via nodemailer`, icon: 'mail-outline', tool: 'NODEMAILER', status: 'pending', retries: 0, maxRetries: 3 });
    steps.push({ id: 'send_push', name: 'Push Notifications', description: `FCM alerts to ${config.teamMembers?.length || 0} devices`, icon: 'notifications-outline', tool: 'FCM_API', status: 'pending', retries: 0, maxRetries: 2 });
  }

  steps.push({ id: 'confirm', name: 'AI Summary', description: 'Gemini writes execution report', icon: 'document-text-outline', tool: 'GEMINI_AI', status: 'pending', retries: 0, maxRetries: 1 });
  return steps;
};

// ─── Agent Executor ───────────────────────────────────────────────────────────
export class AgentExecutor {
  constructor(config, onStepUpdate, onLog) {
    this.config = config;
    this.onStepUpdate = onStepUpdate;
    this.onLog = onLog;
    this.context = {};
    this.aborted = false;
    this.completedSteps = [];
  }

  abort() { this.aborted = true; }

  log(message, type = 'info') {
    this.onLog({ message, type, timestamp: new Date().toISOString() });
  }

  async executeStep(step) {
    if (this.aborted) throw new Error('Execution aborted by user.');
    this.onStepUpdate(step.id, { status: 'running' });
    this.log(`▶ ${step.name}`, 'info');

    let result;
    switch (step.id) {
      case 'validate':           result = await this.validateInputs(); break;
      case 'check_availability': result = await this.checkAvailability(); break;
      case 'find_slot':          result = await this.findBestSlot(); break;
      case 'book_meeting':       result = await this.bookMeeting(); break;
      case 'send_email':         result = await this.sendEmailInvites(); break;
      case 'send_push':          result = await this.sendPushNotifications(); break;
      case 'confirm':            result = await this.generateSummary(); break;
      default:                   result = await this.executeGenericStep(step); break;
    }

    this.onStepUpdate(step.id, { status: 'success', result });
    this.completedSteps.push({ ...step, status: 'success', result });
    this.log(`✓ ${step.name}`, 'success');
    return result;
  }

  async executeWithRetry(step) {
    let attempt = 0;
    while (attempt <= (step.maxRetries || 2)) {
      try {
        if (attempt > 0) {
          this.log(`↻ Retry ${attempt}/${step.maxRetries}: ${step.name}`, 'warning');
          this.onStepUpdate(step.id, { status: 'retrying', retries: attempt });
          await delay(1000 * attempt);
        }
        return await this.executeStep(step);
      } catch (error) {
        attempt++;

        // Gemini reasoning on first failure
        if (attempt === 1) {
          try {
            const r = await GeminiAPI.reason(this.config.meetingTitle, this.completedSteps, this.context, { name: step.name, error: error.message });
            if (r?.reasoning?.insight) this.log(`🧠 ${r.reasoning.insight}`, 'info');
            if (r?.reasoning?.shouldAbort) {
              this.onStepUpdate(step.id, { status: 'failed', error: error.message, retries: attempt - 1 });
              throw error;
            }
          } catch (ge) { /* silent */ }
        }

        if (attempt > (step.maxRetries || 2)) {
          this.onStepUpdate(step.id, { status: 'failed', error: error.message, retries: attempt - 1 });
          throw error;
        }
      }
    }
  }

  async validateInputs() {
    await delay(400);
    const { teamMembers, meetingTitle } = this.config;
    if (!teamMembers?.length) throw new Error('No team members specified');
    if (!meetingTitle) throw new Error('Meeting title is required');
    this.log(`  ${teamMembers.length} members, title: "${meetingTitle}"`, 'info');
    this.context.validated = true;
    return { validated: true };
  }

  async checkAvailability() {
    const result = await CalendarAPI.getTeamCalendar(this.config.teamMembers);
    this.context.teamAvailability = result.members;
    const avail = result.members.filter(m => m.available).length;
    this.log(`  ${avail}/${result.members.length} available`, 'info');
    return result;
  }

  async findBestSlot() {
    const result = await CalendarAPI.checkAvailability(this.config.date, this.config.duration || 60);
    if (!result.availableSlots.length) throw new Error('No available time slots found');
    this.context.selectedSlot = result.availableSlots[0];
    this.log(`  Slot: ${this.context.selectedSlot.time}`, 'info');
    return { selectedSlot: this.context.selectedSlot };
  }

  async bookMeeting() {
    const details = {
      title: this.config.meetingTitle, date: this.config.date,
      time: this.context.selectedSlot?.time || '10:00 AM',
      duration: this.config.duration || 60,
      attendees: this.config.teamMembers,
      organizer: this.config.organizer || 'Agent',
      agenda: this.config.agenda || '',
    };
    const result = await CalendarAPI.bookMeeting(details);
    this.context.meeting = result;
    this.log(`  ID: ${result.meetingId}`, 'success');
    this.log(`  Join: ${result.joinLink}`, 'info');
    return result;
  }

  async sendEmailInvites() {
    const meeting = this.context.meeting || {};
    const emails = this.config.teamEmails?.filter(e => e.includes('@')) || [];

    if (emails.length === 0) {
      this.log(`  ⚠ No valid emails in config — skipping real send`, 'warning');
      return { success: true, mock: true, deliveredCount: 0, failedCount: 0 };
    }

    const meetingDetails = {
      title: this.config.meetingTitle, date: this.config.date,
      time: meeting.time || this.context.selectedSlot?.time || 'TBD',
      duration: this.config.duration || 60,
      organizer: this.config.organizer || 'Agent',
      agenda: this.config.agenda || '',
      joinLink: meeting.joinLink || '',
      meetingId: meeting.meetingId || '',
    };

    const result = await EmailAPI.send(emails, `📅 Meeting Invite: ${this.config.meetingTitle}`, meetingDetails);
    this.log(`  📧 ${result.deliveredCount}/${emails.length} emails sent via Gmail`, result.deliveredCount > 0 ? 'success' : 'warning');
    if (result.failedCount > 0) this.log(`  ⚠ ${result.failedCount} failed`, 'warning');
    return result;
  }

  async sendPushNotifications() {
    const meeting = this.context.meeting || {};
    const result = await PushAPI.send(
      this.config.fcmTokens || [],
      `📅 ${this.config.meetingTitle}`,
      `${this.config.date} at ${meeting.time || 'TBD'}`,
      { meetingId: meeting.meetingId || '' }
    );
    this.log(`  🔔 Push: ${result.real ? `${result.delivered} sent via FCM` : result.message || 'mock'}`, 'info');
    return result;
  }

  async generateSummary() {
    let summaryText = '';
    try {
      const result = await GeminiAPI.summary(this.config.meetingTitle, this.completedSteps, this.config, this.context.meeting);
      summaryText = result.summary;
      this.log(`🧠 ${summaryText}`, 'success');
    } catch {
      summaryText = `Meeting "${this.config.meetingTitle}" scheduled for ${this.config.date}. ${this.config.teamMembers.length} team members notified.`;
      this.log(`  Summary ready`, 'success');
    }
    this.context.summaryText = summaryText;
    return { summary: summaryText, completedAt: new Date().toISOString() };
  }

  async executeGenericStep(step) {
    this.log(`  ${step.description}`, 'info');
    await delay(700);
    return { success: true, stepId: step.id };
  }
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));