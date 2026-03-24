import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';

// ── Request notification permission & get FCM token ───────────────────────────
export const getFCMToken = async () => {
  try {
    // Request permission (required on iOS, recommended on Android 13+)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[FCM] Permission denied');
      return null;
    }

    // Get FCM token
    const token = await messaging().getToken();
    console.log('[FCM] Token:', token);
    return token;

  } catch (err) {
    console.error('[FCM] Error getting token:', err.message);
    return null;
  }
};

// ── Listen for foreground messages ────────────────────────────────────────────
export const setupForegroundListener = () => {
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    Alert.alert(
      remoteMessage.notification?.title || 'Notification',
      remoteMessage.notification?.body || '',
    );
  });
  return unsubscribe; // call this to stop listening
};

// ── Subscribe device to a topic ───────────────────────────────────────────────
export const subscribeToTopic = async (topic) => {
  try {
    await messaging().subscribeToTopic(topic);
    console.log(`[FCM] Subscribed to topic: ${topic}`);
  } catch (err) {
    console.error('[FCM] Subscribe error:', err.message);
  }
};