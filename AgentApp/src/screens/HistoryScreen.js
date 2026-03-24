import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const MOCK_HISTORY = [
  { id: 1, task: 'Book meeting and notify team', status: 'success', steps: 8, retries: 1, duration: '12s', timestamp: '2 mins ago', meetingId: 'MTG-1748291', teamSize: 4, emailsSent: 4 },
  { id: 2, task: 'Schedule daily standup', status: 'success', steps: 8, retries: 0, duration: '9s', timestamp: '1 hour ago', meetingId: 'MTG-1748288', teamSize: 6, emailsSent: 6 },
  { id: 3, task: 'Send project update notification', status: 'error', steps: 5, retries: 3, duration: '18s', timestamp: '3 hours ago', meetingId: null, teamSize: 4, emailsSent: 0, error: 'Email service unavailable' },
  { id: 4, task: 'Book meeting and notify team', status: 'success', steps: 8, retries: 2, duration: '15s', timestamp: 'Yesterday', meetingId: 'MTG-1748280', teamSize: 5, emailsSent: 5 },
  { id: 5, task: 'Team retrospective booking', status: 'success', steps: 8, retries: 0, duration: '10s', timestamp: '2 days ago', meetingId: 'MTG-1748270', teamSize: 8, emailsSent: 8 },
];

export default function HistoryScreen() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState('all');
  const filtered = MOCK_HISTORY.filter(h => filter === 'all' || h.status === filter);
  const successCount = MOCK_HISTORY.filter(h => h.status === 'success').length;
  const failCount = MOCK_HISTORY.filter(h => h.status === 'error').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={theme.gradientBg} style={StyleSheet.absoluteFill} />

      {/* Fixed Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '800', marginBottom: 4 }}>History</Text>
        <Text style={{ color: theme.text3, fontSize: 13 }}>Past agent executions</Text>
      </View>

      {/* Summary Cards - Fixed */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12 }}>
        <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{MOCK_HISTORY.length}</Text>
          <Text style={{ color: theme.text4, fontSize: 10, marginTop: 2 }}>Total Runs</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.green + '44' }}>
          <Text style={{ color: theme.green, fontSize: 22, fontWeight: '800' }}>{successCount}</Text>
          <Text style={{ color: theme.text4, fontSize: 10, marginTop: 2 }}>Succeeded</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.red + '44' }}>
          <Text style={{ color: theme.red, fontSize: 22, fontWeight: '800' }}>{failCount}</Text>
          <Text style={{ color: theme.text4, fontSize: 10, marginTop: 2 }}>Failed</Text>
        </View>
      </View>

      {/* Filter Row - Fixed */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 }}>
        {['all', 'success', 'error'].map(f => (
          <TouchableOpacity
            key={f}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
              backgroundColor: filter === f ? theme.accent + '20' : theme.card,
              borderWidth: 1,
              borderColor: filter === f ? theme.accent + '66' : theme.border,
            }}
            onPress={() => setFilter(f)}
          >
            <Text style={{ color: filter === f ? theme.accent : theme.text4, fontSize: 13, fontWeight: filter === f ? '700' : '400' }}>
              {f === 'all' ? 'All' : f === 'success' ? '✓ Succeeded' : '✗ Failed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scrollable List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
        {filtered.map(item => (
          <View key={item.id} style={{
            backgroundColor: theme.card, borderRadius: 18, padding: 16, borderWidth: 1,
            borderColor: item.status === 'success' ? theme.green + '33' : theme.red + '33',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: (item.status === 'success' ? theme.green : theme.red) + '20' }}>
                <Ionicons name={item.status === 'success' ? 'checkmark-circle' : 'close-circle'} size={22}
                  color={item.status === 'success' ? theme.green : theme.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 2 }} numberOfLines={1}>{item.task}</Text>
                <Text style={{ color: theme.text4, fontSize: 12 }}>{item.timestamp}</Text>
              </View>
            </View>

            {item.error && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.red + '12', borderRadius: 8, padding: 8, marginBottom: 10 }}>
                <Ionicons name="warning-outline" size={12} color={theme.red} />
                <Text style={{ color: theme.red, fontSize: 12, flex: 1 }}>{item.error}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[
                { icon: 'list-outline', label: `${item.steps} steps`, color: theme.text4 },
                { icon: 'refresh-outline', label: `${item.retries} retries`, color: item.retries > 0 ? theme.orange : theme.text4 },
                { icon: 'time-outline', label: item.duration, color: theme.text4 },
                { icon: 'people-outline', label: `${item.teamSize} members`, color: theme.text4 },
                { icon: 'mail-outline', label: `${item.emailsSent} emails`, color: item.emailsSent > 0 ? theme.green : theme.text4 },
              ].map((badge, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.card2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}>
                  <Ionicons name={badge.icon} size={11} color={badge.color} />
                  <Text style={{ fontSize: 11, color: badge.color }}>{badge.label}</Text>
                </View>
              ))}
            </View>

            {item.meetingId && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Ionicons name="calendar-outline" size={12} color={theme.accent} />
                <Text style={{ color: theme.accent, fontSize: 12, fontFamily: 'monospace' }}>{item.meetingId}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
