import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, TextInput, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { decomposeTask, decomposeTaskFallback, AgentExecutor } from '../services/agentEngine';
import { useFCMToken } from '../../App';

const DEFAULT_CONFIG = {
  meetingTitle: 'Team Sync',
  date: 'Tomorrow, 2:00 PM',
  duration: 60,
  teamMembers: ['Alice Chen', 'Bob Kumar', 'Carol Smith', 'David Lee'],
  teamEmails: ['alice.chen@gmail.com', 'bob.kumar@gmail.com', 'carol.smith@gmail.com', 'david.lee@gmail.com'],
  slackChannel: 'team-general',
  organizer: 'You',
  agenda: 'Weekly team sync and project updates',
};

const STATUS_META = {
  pending:  { icon: 'ellipse-outline',     getColor: t => t.text5 },
  running:  { icon: 'sync',                getColor: t => t.accent },
  retrying: { icon: 'refresh',             getColor: t => t.orange },
  success:  { icon: 'checkmark-circle',    getColor: t => t.green },
  failed:   { icon: 'close-circle',        getColor: t => t.red },
};

export default function AgentScreen({ navigation, route }) {
  const { theme } = useTheme();
  const fcmToken = useFCMToken();
  const taskLabel = route?.params?.task || 'Book meeting and notify team';
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, fcmTokens: fcmToken ? [fcmToken] : [] });
  const [steps, setSteps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [phase, setPhase] = useState('config');
  const [activeTab, setActiveTab] = useState('steps');
  const [configModal, setConfigModal] = useState(false);
  const [summary, setSummary] = useState(null);
  const executorRef = useRef(null);
  const scrollRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSteps(decomposeTaskFallback(taskLabel, config));
  }, [config]);

  const updateStep = (id, updates) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addLog = (log) => {
    setLogs(prev => [log, ...prev]);
  };

  const animateProgress = (val) => {
    Animated.timing(progressAnim, { toValue: val, duration: 400, useNativeDriver: false }).start();
  };

  const runAgent = async () => {
    setPhase('running');
    setLogs([]);
    progressAnim.setValue(0);

    const executor = new AgentExecutor(config, updateStep, addLog);
    executorRef.current = executor;

    // Use Gemini to plan steps (async), falls back to rule-based
    const freshSteps = await decomposeTask(taskLabel, config, addLog);
    setSteps(freshSteps);

    let completed = 0;
    try {
      for (const step of freshSteps) {
        await executor.executeWithRetry(step);
        completed++;
        animateProgress(completed / freshSteps.length);
      }
      setSummary({ success: true, completed, total: freshSteps.length });
      setPhase('done');
    } catch (err) {
      setSummary({ success: false, error: err.message, completed, total: freshSteps.length });
      setPhase('error');
    }
  };

  const abortAgent = () => {
    executorRef.current?.abort();
    setPhase('error');
    setSummary({ success: false, error: 'Aborted by user', completed: 0, total: steps.length });
  };

  const reset = () => {
    setPhase('config');
    setLogs([]);
    setSummary(null);
    progressAnim.setValue(0);
    setSteps(decomposeTaskFallback(taskLabel, config));
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const successCount = steps.filter(s => s.status === 'success').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;
  const totalRetries = steps.reduce((a, s) => a + (s.retries || 0), 0);
  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={theme.gradientBg} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={theme.text3} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>AI Agent</Text>
          <View style={s.phaseChip}>
            <View style={[s.phaseDot, {
              backgroundColor:
                phase === 'running' ? theme.accent :
                phase === 'done' ? theme.green :
                phase === 'error' ? theme.red : theme.orange
            }]} />
            <Text style={s.phaseText}>{phase.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setConfigModal(true)} style={s.iconBtn}>
          <Ionicons name="settings-outline" size={20} color={theme.text3} />
        </TouchableOpacity>
      </View>

      {/* Task Banner */}
      <View style={s.taskBanner}>
        <Ionicons name="terminal-outline" size={13} color={theme.accent} />
        <Text style={s.taskBannerText} numberOfLines={1}>{taskLabel}</Text>
      </View>

      {/* Progress Bar */}
      {phase !== 'config' && (
        <View style={s.progressBar}>
          <Animated.View style={[s.progressFill, {
            width: progressWidth,
            backgroundColor: phase === 'error' ? theme.red : theme.accent,
          }]} />
        </View>
      )}

      {/* Stats Row */}
      {phase !== 'config' && (
        <View style={s.statsRow}>
          {[
            { num: steps.length, label: 'Total', color: theme.text },
            { num: successCount, label: 'Done', color: theme.green },
            { num: failedCount, label: 'Failed', color: theme.red },
            { num: totalRetries, label: 'Retries', color: theme.orange },
          ].map((st, i) => (
            <View key={i} style={s.statItem}>
              <Text style={[s.statNum, { color: st.color }]}>{st.num}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tab Bar */}
      {phase !== 'config' && (
        <View style={s.tabBar}>
          {['steps', 'logs'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons name={tab === 'steps' ? 'list-outline' : 'terminal-outline'} size={14}
                color={activeTab === tab ? theme.accent : theme.text4} />
              <Text style={[s.tabLabel, activeTab === tab && { color: theme.accent }]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Content */}
      <ScrollView ref={scrollRef} style={s.content} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Config Phase */}
        {phase === 'config' && (
          <View>
            <View style={s.configHero}>
              <View style={s.configIconWrap}>
                <Ionicons name="flash" size={30} color={theme.accent} />
              </View>
              <Text style={s.configTitle}>Ready to Execute</Text>
              <Text style={s.configSub}>
                Agent will decompose your task into {steps.length} steps with full retry support
              </Text>
            </View>
            <Text style={s.sectionLabel}>EXECUTION PLAN</Text>
            {steps.map((step, i) => (
              <StepCard key={step.id} step={step} index={i} total={steps.length} theme={theme} />
            ))}
            <View style={s.configInfoCard}>
              <Text style={s.sectionLabel}>CONFIGURATION</Text>
              <ConfigRow icon="person-outline" label="Meeting" value={config.meetingTitle} theme={theme} />
              <ConfigRow icon="calendar-outline" label="Date" value={config.date} theme={theme} />
              <ConfigRow icon="people-outline" label="Team" value={`${config.teamMembers.length} members`} theme={theme} />
              <ConfigRow icon="mail-outline" label="Emails" value={`${config.teamEmails.length} recipients`} theme={theme} />
              <ConfigRow icon="chatbubble-outline" label="Slack" value={`#${config.slackChannel}`} theme={theme} />
              <TouchableOpacity style={s.editBtn} onPress={() => setConfigModal(true)}>
                <Ionicons name="pencil-outline" size={14} color={theme.accent} />
                <Text style={[s.editBtnText, { color: theme.accent }]}>Edit Configuration</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Steps Tab */}
        {phase !== 'config' && activeTab === 'steps' && steps.map((step, i) => (
          <StepCard key={step.id} step={step} index={i} total={steps.length} theme={theme} />
        ))}

        {/* Logs Tab */}
        {phase !== 'config' && activeTab === 'logs' && (
          <View style={s.logContainer}>
            {logs.length === 0 && <Text style={s.emptyLogs}>No logs yet...</Text>}
            {logs.map((log, i) => <LogEntry key={i} log={log} theme={theme} />)}
          </View>
        )}

        {/* Summary */}
        {(phase === 'done' || phase === 'error') && summary && (
          <SummaryCard summary={summary} config={config} theme={theme} />
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={s.bottomAction}>
        {phase === 'config' && (
          <TouchableOpacity onPress={runAgent} style={s.runOuter} activeOpacity={0.85}>
            <LinearGradient colors={[theme.accent, theme.accent2]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.runBtn}>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={s.runBtnText}>Execute Agent</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {phase === 'running' && (
          <TouchableOpacity onPress={abortAgent} style={[s.abortBtn, { borderColor: theme.red + '44', backgroundColor: theme.red + '15' }]}>
            <Ionicons name="stop-circle" size={20} color={theme.red} />
            <Text style={[s.abortText, { color: theme.red }]}>Abort Execution</Text>
          </TouchableOpacity>
        )}
        {(phase === 'done' || phase === 'error') && (
          <View style={s.doneRow}>
            <TouchableOpacity onPress={reset} style={[s.resetBtn, { backgroundColor: theme.accent + '20', borderColor: theme.accent + '44' }]}>
              <Ionicons name="refresh" size={18} color={theme.accent} />
              <Text style={[s.resetText, { color: theme.accent }]}>Run Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[s.homeBtn, { backgroundColor: theme.card2 }]}>
              <Ionicons name="home-outline" size={18} color={theme.text3} />
              <Text style={[s.homeText, { color: theme.text3 }]}>Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ConfigModal visible={configModal} config={config}
        onSave={c => { setConfig(c); setConfigModal(false); }}
        onClose={() => setConfigModal(false)} theme={theme} />
    </SafeAreaView>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ step, index, total, theme }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const meta = STATUS_META[step.status] || STATUS_META.pending;
  const color = meta.getColor(theme);

  useEffect(() => {
    if (step.status === 'running' || step.status === 'retrying') {
      Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })).start();
    } else spinAnim.setValue(0);
  }, [step.status]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{
      flexDirection: 'row', borderWidth: 1, borderRadius: 16, marginBottom: 10,
      padding: 14, gap: 12,
      borderColor: color + '44',
      backgroundColor: step.status === 'pending' ? theme.card : color + '12',
    }}>
      <View style={{ alignItems: 'center', width: 28 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: color + '66', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color }}>{index + 1}</Text>
        </View>
        {index < total - 1 && <View style={{ width: 1, flex: 1, minHeight: 10, marginTop: 4, backgroundColor: color + '33' }} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Ionicons name={step.icon} size={15} color={color} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: step.status === 'pending' ? theme.text3 : theme.text }}>
            {step.name}
          </Text>
          {(step.status === 'running' || step.status === 'retrying') && (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="sync" size={14} color={color} />
            </Animated.View>
          )}
          {(step.status === 'success' || step.status === 'failed') && (
            <Ionicons name={meta.icon} size={16} color={color} />
          )}
        </View>
        <Text style={{ color: theme.text3, fontSize: 12, lineHeight: 18, marginBottom: 8 }}>{step.description}</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <View style={{ borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderColor: color + '44' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color }}>{step.tool}</Text>
          </View>
          {(step.retries || 0) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.orange + '20', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Ionicons name="refresh" size={10} color={theme.orange} />
              <Text style={{ color: theme.orange, fontSize: 10, fontWeight: '600' }}>{step.retries} retries</Text>
            </View>
          )}
          {step.result?.mock && (
            <View style={{ backgroundColor: theme.orange + '15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: theme.orange, fontSize: 10 }}>MOCK</Text>
            </View>
          )}
          {step.result?.real && (
            <View style={{ backgroundColor: theme.green + '15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: theme.green, fontSize: 10 }}>✓ REAL</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Log Entry ─────────────────────────────────────────────────────────────────
function LogEntry({ log, theme }) {
  const colors = { info: theme.text3, success: theme.green, error: theme.red, warning: theme.orange };
  const color = colors[log.type] || theme.text3;
  const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false });
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <Text style={{ fontSize: 11, color: color + '99', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', minWidth: 70 }}>{time}</Text>
      <Text style={{ fontSize: 12, flex: 1, color, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 18 }}>{log.message}</Text>
    </View>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ summary, config, theme }) {
  const color = summary.success ? theme.green : theme.red;
  return (
    <View style={{ borderWidth: 1, borderRadius: 20, padding: 20, marginTop: 16, backgroundColor: theme.card, borderColor: color + '44' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Ionicons name={summary.success ? 'checkmark-circle' : 'close-circle'} size={28} color={color} />
        <Text style={{ fontSize: 20, fontWeight: '800', color }}>{summary.success ? 'Task Completed!' : 'Execution Failed'}</Text>
      </View>
      {summary.success ? (
        <View>
          {[
            { icon: 'calendar-outline', label: 'Meeting Booked', value: '✓ Confirmed', color: theme.green },
            { icon: 'mail-outline', label: 'Email Invites', value: `${config.teamEmails.length} sent`, color: theme.green },
            { icon: 'chatbubble-outline', label: 'Slack Notified', value: `#${config.slackChannel}`, color: theme.green },
            { icon: 'notifications-outline', label: 'Push Alerts', value: `${config.teamMembers.length} devices`, color: theme.green },
            { icon: 'checkmark-circle-outline', label: 'Steps Done', value: `${summary.completed}/${summary.total}`, color: theme.accent },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Ionicons name={row.icon} size={16} color={row.color} />
              <Text style={{ flex: 1, color: theme.text3, fontSize: 13 }}>{row.label}</Text>
              <Text style={{ color: row.color, fontSize: 13, fontWeight: '700' }}>{row.value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.red + '15', borderRadius: 10, padding: 12 }}>
          <Ionicons name="warning-outline" size={16} color={theme.red} />
          <Text style={{ color: theme.red, fontSize: 13, flex: 1 }}>{summary.error}</Text>
        </View>
      )}
    </View>
  );
}

function ConfigRow({ icon, label, value, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <Ionicons name={icon} size={14} color={theme.text4} />
      <Text style={{ color: theme.text4, fontSize: 13, flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.text2, fontSize: 13, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

// ── Config Modal ──────────────────────────────────────────────────────────────
function ConfigModal({ visible, config, onSave, onClose, theme }) {
  const [local, setLocal] = useState(config);
  const [membersText, setMembersText] = useState(config.teamMembers.join(', '));
  const [emailsText, setEmailsText] = useState(config.teamEmails.join(', '));

  const save = () => {
    const members = membersText.split(',').map(m => m.trim()).filter(Boolean);
    const emails = emailsText.split(',').map(e => e.trim()).filter(Boolean);
    onSave({ ...local, teamMembers: members, teamEmails: emails });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.bg2, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '88%' }}>
          <View style={{ width: 40, height: 4, backgroundColor: theme.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 18 }}>Configure Agent</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'Meeting Title', key: 'meetingTitle', value: local.meetingTitle },
              { label: 'Date & Time', key: 'date', value: local.date },
              { label: 'Slack Channel', key: 'slackChannel', value: local.slackChannel },
              { label: 'Organizer', key: 'organizer', value: local.organizer },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 14 }}>
                <Text style={{ color: theme.text4, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>{f.label.toUpperCase()}</Text>
                <TextInput
                  style={{ backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 13, color: theme.text, fontSize: 15 }}
                  value={f.value}
                  onChangeText={v => setLocal({ ...local, [f.key]: v })}
                />
              </View>
            ))}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: theme.text4, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>TEAM MEMBER NAMES</Text>
              <TextInput
                style={{ backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 13, color: theme.text, fontSize: 15, height: 70, textAlignVertical: 'top' }}
                value={membersText} onChangeText={setMembersText} multiline
                placeholder="Alice, Bob, Carol..."
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: theme.text4, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>TEAM EMAILS (for real sending)</Text>
              <TextInput
                style={{ backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.accent + '55', borderRadius: 12, padding: 13, color: theme.text, fontSize: 14, height: 80, textAlignVertical: 'top' }}
                value={emailsText} onChangeText={setEmailsText} multiline
                placeholder="alice@gmail.com, bob@gmail.com..."
                placeholderTextColor={theme.placeholder}
                keyboardType="email-address"
              />
              <Text style={{ color: theme.accent, fontSize: 11, marginTop: 4 }}>
                ✦ Real emails sent when EmailJS is configured in mockAPIs.js
              </Text>
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, paddingBottom: 20 }}>
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: theme.card2, borderRadius: 14 }} onPress={onClose}>
              <Text style={{ color: theme.text3, fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 2, borderRadius: 14, overflow: 'hidden' }} onPress={save}>
              <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Save & Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  phaseChip: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  phaseDot: { width: 6, height: 6, borderRadius: 3 },
  phaseText: { color: theme.text4, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  taskBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.accent + '12', marginHorizontal: 16, marginTop: 12, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.accent + '33' },
  taskBannerText: { color: theme.accent, fontSize: 13, flex: 1 },

  progressBar: { height: 3, backgroundColor: theme.border, marginHorizontal: 16, marginTop: 12, borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },

  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 8 },
  statItem: { flex: 1, backgroundColor: theme.card, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLbl: { color: theme.text4, fontSize: 10, marginTop: 1 },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, backgroundColor: theme.card, borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },
  tabActive: { backgroundColor: theme.accent + '20' },
  tabLabel: { color: theme.text4, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  content: { flex: 1, paddingHorizontal: 16, marginTop: 12 },

  configHero: { alignItems: 'center', marginBottom: 22, paddingTop: 8 },
  configIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.accent + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.accent + '44', marginBottom: 14 },
  configTitle: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  configSub: { color: theme.text3, fontSize: 14, textAlign: 'center', lineHeight: 21 },

  sectionLabel: { color: theme.sectionLabel, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10, marginTop: 4 },

  configInfoCard: { backgroundColor: theme.card, borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: theme.border },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' },
  editBtnText: { fontSize: 13 },

  logContainer: { backgroundColor: theme.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.border },
  emptyLogs: { color: theme.text4, textAlign: 'center', paddingVertical: 20, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border, padding: 16, paddingBottom: 28 },
  runOuter: { borderRadius: 16, overflow: 'hidden' },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  runBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  abortBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  abortText: { fontSize: 16, fontWeight: '700' },
  doneRow: { flexDirection: 'row', gap: 12 },
  resetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  resetText: { fontSize: 15, fontWeight: '700' },
  homeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  homeText: { fontSize: 15 },
});