import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const QUICK_TASKS = [
  { label: 'Book Meeting & Notify Team', icon: 'calendar', color: '#6C63FF' },
  { label: 'Schedule Daily Standup', icon: 'people', color: '#00B894' },
  { label: 'Send Project Update', icon: 'send', color: '#FF6B6B' },
  { label: 'Team Retrospective', icon: 'refresh-circle', color: '#FFB347' },
];

export default function HomeScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const [taskInput, setTaskInput] = useState('Book meeting and notify team');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0, duration: 300, useNativeDriver: false,
    }).start();
  }, [isDark]);

  const handleLaunch = () => {
    if (taskInput.trim()) navigation.navigate('Agent', { task: taskInput });
  };

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={theme.gradientBg} style={StyleSheet.absoluteFill} />
      <View style={[s.orb1, { backgroundColor: theme.orb1 }]} />
      <View style={[s.orb2, { backgroundColor: theme.orb2 }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Animated.View style={[s.agentDot, { transform: [{ scale: pulseAnim }] }]}>
                <View style={s.agentDotInner} />
              </Animated.View>
              <Text style={s.agentLabel}>AGENT ONLINE</Text>
            </View>

            {/* Theme Toggle */}
            <TouchableOpacity onPress={toggleTheme} style={s.themeToggle} activeOpacity={0.8}>
              <View style={[s.themeTrack, { backgroundColor: isDark ? theme.accent + '40' : '#FFB34740' }]}>
                <Animated.View style={[s.themeThumb, {
                  backgroundColor: isDark ? theme.accent : '#FFB347',
                  transform: [{
                    translateX: themeAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] })
                  }],
                }]} />
              </View>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={16}
                color={isDark ? theme.accent : '#FFB347'}
              />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <View style={s.titleSection}>
            <Text style={s.title}>Autonomous</Text>
            <Text style={s.titleAccent}>AI Agent</Text>
            <Text style={s.subtitle}>
              Decompose complex tasks into actionable steps with intelligent tool usage & retry logic
            </Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { value: '8', label: 'Tools', icon: 'construct-outline' },
              { value: '3x', label: 'Retry', icon: 'refresh-outline' },
              { value: '100%', label: 'Auto', icon: 'flash-outline' },
            ].map((stat, i) => (
              <View key={i} style={s.statCard}>
                <Ionicons name={stat.icon} size={16} color={theme.accent} style={{ marginBottom: 4 }} />
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Task Input */}
          <View style={s.inputSection}>
            <Text style={s.sectionLabel}>TASK INPUT</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="terminal-outline" size={18} color={theme.accent} style={{ marginTop: 2 }} />
              <TextInput
                style={s.input}
                value={taskInput}
                onChangeText={setTaskInput}
                placeholder="Describe your task..."
                placeholderTextColor={theme.placeholder}
                multiline
              />
            </View>
          </View>

          {/* Quick Tasks */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>QUICK TASKS</Text>
            {QUICK_TASKS.map((task, i) => (
              <TouchableOpacity
                key={i}
                style={[s.taskCard, taskInput === task.label && {
                  borderColor: task.color + '88', backgroundColor: task.color + '10'
                }]}
                onPress={() => setTaskInput(task.label)}
                activeOpacity={0.7}
              >
                <View style={[s.taskIcon, { backgroundColor: task.color + '22' }]}>
                  <Ionicons name={task.icon} size={18} color={task.color} />
                </View>
                <Text style={s.taskLabel}>{task.label}</Text>
                {taskInput === task.label
                  ? <Ionicons name="checkmark-circle" size={18} color={task.color} />
                  : <Ionicons name="chevron-forward" size={16} color={theme.text5} />
                }
              </TouchableOpacity>
            ))}
          </View>

          {/* Launch Button */}
          <TouchableOpacity onPress={handleLaunch} activeOpacity={0.85} style={s.launchOuter}>
            <LinearGradient
              colors={[theme.accent, theme.accent2, theme.accent]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.launchBtn}
            >
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={s.launchText}>Launch Agent</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 },
  orb1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.06, top: -80, right: -100 },
  orb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.05, bottom: 200, left: -60 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginBottom: 28 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  agentDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.green + '22', alignItems: 'center', justifyContent: 'center' },
  agentDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.green },
  agentLabel: { color: theme.green, fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  themeToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeTrack: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  themeThumb: { width: 22, height: 22, borderRadius: 11, position: 'absolute' },

  titleSection: { marginBottom: 24 },
  title: { fontSize: 40, fontWeight: '800', color: theme.text, lineHeight: 46 },
  titleAccent: { fontSize: 40, fontWeight: '800', lineHeight: 46, color: theme.accent },
  subtitle: { color: theme.text3, fontSize: 14, lineHeight: 21, marginTop: 10 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: theme.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statValue: { color: theme.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: theme.text4, fontSize: 10, marginTop: 1, letterSpacing: 1 },

  inputSection: { marginBottom: 22 },
  sectionLabel: { color: theme.sectionLabel, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  inputWrapper: { backgroundColor: theme.inputBg, borderRadius: 16, borderWidth: 1.5, borderColor: theme.accent + '55', flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  input: { flex: 1, color: theme.text, fontSize: 15, lineHeight: 22, minHeight: 48 },

  section: { marginBottom: 24 },
  taskCard: { backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, marginBottom: 8 },
  taskIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  taskLabel: { flex: 1, color: theme.text2, fontSize: 14 },

  launchOuter: { borderRadius: 18, overflow: 'hidden', marginBottom: 8 },
  launchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  launchText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
});
