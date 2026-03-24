import React, { useEffect, useState, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import HomeScreen from './src/screens/HomeScreen';
import AgentScreen from './src/screens/AgentScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// FCM Token Context — shares device FCM token across the app
export const FCMContext = createContext(null);
export const useFCMToken = () => useContext(FCMContext);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabBar({ state, descriptors, navigation }) {
  const { theme } = useTheme();
  const tabs = [
    { name: 'Home', icon: 'flash', label: 'Agent' },
    { name: 'History', icon: 'time', label: 'History' },
    { name: 'Settings', icon: 'settings', label: 'Settings' },
  ];
  return (
    <View style={[styles.tabBar, { backgroundColor: theme.tabBar, borderTopColor: theme.tabBarBorder }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = tabs[index];
        return (
          <TouchableOpacity key={route.key} style={styles.tabItem}
            onPress={() => navigation.navigate(route.name)} activeOpacity={0.7}>
            <View style={[styles.tabIconWrap, focused && { backgroundColor: theme.accent + '20' }]}>
              <Ionicons name={focused ? tab.icon : `${tab.icon}-outline`} size={22}
                color={focused ? theme.accent : theme.text4} />
            </View>
            <Text style={[styles.tabLabel, {
              color: focused ? theme.accent : theme.text4,
              fontWeight: focused ? '700' : '400',
            }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.statusBar} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Agent" component={AgentScreen}
            options={{ animation: 'slide_from_right' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    // Try to get FCM token — works in standalone/EAS builds
    // Gracefully skipped in Expo Go (firebase/messaging not available)
    const initFCM = async () => {
      try {
        const { getFCMToken, setupForegroundListener } = await import('./src/services/fcmService');
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
          console.log('[App] FCM Token obtained:', token.substring(0, 20) + '...');
        }
        // Listen for foreground push notifications
        const unsub = setupForegroundListener();
        return unsub;
      } catch (err) {
        // firebase/messaging not available in Expo Go — that's expected
        console.log('[App] FCM not available in Expo Go — will work in APK build');
      }
    };

    let cleanup;
    initFCM().then(unsub => { cleanup = unsub; });
    return () => { if (cleanup) cleanup(); };
  }, []);

  return (
    <SafeAreaProvider>
      <FCMContext.Provider value={fcmToken}>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </FCMContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 20, paddingTop: 8, paddingHorizontal: 10 },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabIconWrap: { width: 44, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 11, letterSpacing: 0.3 },
});