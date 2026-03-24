import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [autoRetry, setAutoRetry] = useState(true);
  const [verboseLogs, setVerboseLogs] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [maxRetries, setMaxRetries] = useState(3);

  const openLink = (url) => Linking.openURL(url).catch(() =>
    Alert.alert('Cannot open link', url)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientBg} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* Fixed Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 4 }}>Settings</Text>
        <Text style={{ color: theme.text3, fontSize: 13 }}>Configure your AI Agent</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Agent Card */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: theme.accent + '33', marginTop: 12, marginBottom: 20 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accent + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.accent + '44' }}>
            <Ionicons name="flash" size={28} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>Autonomous AI Agent</Text>
            <Text style={{ color: theme.text3, fontSize: 12, marginTop: 2 }}>Version 1.0.0 • Multi-step executor</Text>
          </View>
        </View>

        {/* Theme Toggle */}
        <SectionLabel label="APPEARANCE" theme={theme} />
        <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: isDark ? theme.accent + '20' : '#FFB34720', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? theme.accent : '#FFB347'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
              <Text style={{ color: theme.text4, fontSize: 12, marginTop: 1 }}>Switch between dark and light theme</Text>
            </View>
            <Switch
              value={isDark} onValueChange={toggleTheme}
              trackColor={{ false: '#E0E4FF', true: theme.accent + '66' }}
              thumbColor={isDark ? theme.accent : '#8888AA'}
            />
          </View>
        </View>

        {/* Execution */}
        <SectionLabel label="EXECUTION" theme={theme} />
        <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20, overflow: 'hidden' }}>
          <ToggleRow icon="refresh-circle-outline" label="Auto Retry on Failure" sub="Retry failed steps automatically"
            value={autoRetry} onChange={setAutoRetry} theme={theme} />
          <ToggleRow icon="document-text-outline" label="Verbose Logs" sub="Show detailed execution logs"
            value={verboseLogs} onChange={setVerboseLogs} theme={theme} />
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: theme.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="sync-outline" size={16} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>Max Retries</Text>
              <Text style={{ color: theme.text4, fontSize: 12 }}>Per step retry limit</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity onPress={() => setMaxRetries(Math.max(1, maxRetries - 1))}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.accent + '30', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="remove" size={16} color={theme.accent} />
              </TouchableOpacity>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', minWidth: 20, textAlign: 'center' }}>{maxRetries}</Text>
              <TouchableOpacity onPress={() => setMaxRetries(Math.min(5, maxRetries + 1))}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.accent + '30', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="add" size={16} color={theme.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Connected Tools */}
        <SectionLabel label="CONNECTED TOOLS" theme={theme} />
        <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20, overflow: 'hidden' }}>
          {[
            { name: 'Calendar API', icon: 'calendar-outline', color: theme.green, status: 'Mock (built-in)' },
            { name: 'EmailJS', icon: 'mail-outline', color: theme.accent, status: 'Configure credentials' },
            { name: 'Slack Webhook', icon: 'chatbubble-outline', color: '#FFB347', status: 'Configure webhook' },
            { name: 'Expo Push', icon: 'notifications-outline', color: theme.red, status: 'EAS build required' },
          ].map((tool, i, arr) => (
            <View key={tool.name} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: theme.border }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: tool.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={tool.icon} size={16} color={tool.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{tool.name}</Text>
                <Text style={{ color: theme.text4, fontSize: 11, marginTop: 1 }}>{tool.status}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tool.color + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tool.color }} />
                <Text style={{ color: tool.color, fontSize: 11, fontWeight: '700' }}>Ready</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Real Services Setup */}
        <SectionLabel label="ENABLE REAL NOTIFICATIONS" theme={theme} />
        <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.accent + '44', marginBottom: 20, padding: 16 }}>
          <Text style={{ color: theme.text3, fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
            To send real emails and Slack messages, configure these free services in{' '}
            <Text style={{ color: theme.accent, fontWeight: '700' }}>src/services/mockAPIs.js</Text>
          </Text>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.accent + '15', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.accent + '33' }}
            onPress={() => openLink('https://www.emailjs.com/')}
          >
            <Ionicons name="mail" size={18} color={theme.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>1. Setup EmailJS (Free)</Text>
              <Text style={{ color: theme.text4, fontSize: 12 }}>emailjs.com → get Service ID, Template ID, Public Key</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={theme.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFB34715', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FFB34733' }}
            onPress={() => openLink('https://api.slack.com/apps')}
          >
            <Ionicons name="chatbubble" size={18} color="#FFB347" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>2. Setup Slack Webhook (Free)</Text>
              <Text style={{ color: theme.text4, fontSize: 12 }}>api.slack.com → Incoming Webhooks → copy URL</Text>
            </View>
            <Ionicons name="open-outline" size={16} color="#FFB347" />
          </TouchableOpacity>

          <View style={{ backgroundColor: theme.green + '10', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.green + '33' }}>
            <Text style={{ color: theme.green, fontSize: 12, lineHeight: 18 }}>
              ✦ Both services are completely free{'\n'}
              ✦ EmailJS: 200 emails/month free tier{'\n'}
              ✦ Slack: Unlimited with free workspace{'\n'}
              ✦ No backend server needed
            </Text>
          </View>
        </View>

        {/* About */}
        <SectionLabel label="ABOUT" theme={theme} />
        <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 20, overflow: 'hidden' }}>
          {[
            { label: 'Architecture', value: 'Multi-step Agent' },
            { label: 'Task Decomposer', value: 'Rule-based + LLM-ready' },
            { label: 'Retry Strategy', value: 'Exponential backoff' },
            { label: 'Email Service', value: 'EmailJS REST API' },
            { label: 'Notification', value: 'Slack Webhooks' },
            { label: 'Built With', value: 'React Native + Expo' },
          ].map((row, i, arr) => (
            <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: theme.border }}>
              <Text style={{ flex: 1, color: theme.text3, fontSize: 13 }}>{row.label}</Text>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{row.value}</Text>
            </View>
          ))}
        </View>

        <Text style={{ color: theme.text5, fontSize: 12, textAlign: 'center', lineHeight: 20 }}>
          Autonomous AI Agent • Problem Statement 3{'\n'}Built with React Native & Expo SDK 54
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label, theme }) {
  return <Text style={{ color: theme.sectionLabel, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10, marginTop: 4 }}>{label}</Text>;
}

function ToggleRow({ icon, label, sub, value, onChange, theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: value ? theme.accent + '20' : theme.card2, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={value ? theme.accent : theme.text4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: theme.text4, fontSize: 12, marginTop: 1 }}>{sub}</Text>
      </View>
      <Switch
        value={value} onValueChange={onChange}
        trackColor={{ false: theme.border2, true: theme.accent + '66' }}
        thumbColor={value ? theme.accent : theme.text4}
      />
    </View>
  );
}
