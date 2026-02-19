import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPreferences, PushNotificationData, ScheduledNotification } from '@/app/types/pengaturan';

// Configure notification handler

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,   
    shouldShowList: true,      
  }),
});

const STORAGE_KEY = '@notification_preferences';

export class NotificationService {
  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permission not granted for notifications');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#37B37E',
      });
    }

    return true;
  }

  /**
   * Check if notifications are enabled
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Send immediate notification
   */
  static async sendNotification(data: PushNotificationData): Promise<string | null> {
    try {
      const hasPermission = await this.areNotificationsEnabled();
      if (!hasPermission) {
        await this.requestPermissions();
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          sound: true,
        },
        trigger: null, // Send immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Schedule a notification
   */
  static async scheduleNotification(
    notification: ScheduledNotification
  ): Promise<string | null> {
    try {
      const hasPermission = await this.areNotificationsEnabled();
      if (!hasPermission) {
        await this.requestPermissions();
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: true,
        },
        trigger: {
  type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
  hour: notification.trigger.hour,
  minute: notification.trigger.minute,
  repeats: notification.trigger.repeats,
}
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Save notification preferences to storage
   */
  static async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }

  /**
   * Load notification preferences from storage
   */
  static async loadPreferences(): Promise<NotificationPreferences | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      return null;
    }
  }

  /**
   * Setup daily reminder notification
   */
  static async setupDailyReminder(hour: number = 12, minute: number = 0): Promise<string | null> {
    return await this.scheduleNotification({
      id: 'daily-reminder',
      title: 'Jangan Lupa Scan Makanan! 🍽️',
      body: 'Yuk scan makananmu hari ini untuk mendapatkan informasi nutrisi',
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }

  /**
   * Send scan completion notification
   */
  static async sendScanCompleteNotification(foodName: string): Promise<string | null> {
    return await this.sendNotification({
      title: 'Pemindaian Selesai! ✅',
      body: `Hasil scan untuk ${foodName} sudah tersedia`,
      data: { type: 'scan_complete', foodName },
    });
  }

  /**
   * Send health tip notification
   */
  static async sendHealthTipNotification(tip: string): Promise<string | null> {
    return await this.sendNotification({
      title: 'Tips Kesehatan 💡',
      body: tip,
      data: { type: 'health_tip' },
    });
  }

  /**
   * Add notification response listener
   */
  static addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Add notification received listener
   */
  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }
}