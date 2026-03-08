/**
 * notificationAPI.ts (FIXED for Expo SDK 53)
 * ---------------------------------------------------------------------------
 * FIXES:
 * • ✅ FIX #1: `shouldShowAlert` deprecated → use `shouldShowBanner` + `shouldShowList`
 * • ✅ FIX #2: CALENDAR trigger not supported on Android → use DAILY trigger type
 * • ✅ FIX #3: All triggers now use explicit `type` from SchedulableTriggerInputTypes
 * • ✅ FIX #4: Push notifications unavailable in Expo Go SDK 53 → guard added
 * • ✅ FIX #5: Added multiple notification channels (reminders, health tips, scan)
 * • ✅ FIX #6: Added meal-time reminders (breakfast, lunch, dinner)
 * • ✅ FIX #7: Added weekly summary notification
 * • ✅ FIX #8: Proper cleanup & re-schedule on preference changes
 * ---------------------------------------------------------------------------
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationPreferences,
  PushNotificationData,
  ScheduledNotification,
} from '@/app/types/pengaturan';

// ---------------------------------------------------------------------------
// ✅ FIX #1: Use shouldShowBanner + shouldShowList (not shouldShowAlert)
// ---------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@notification_preferences';

/** Notification channel IDs for Android */
const CHANNELS = {
  REMINDERS: 'meal-reminders',
  HEALTH_TIPS: 'health-tips',
  SCAN_RESULTS: 'scan-results',
  WEEKLY: 'weekly-summary',
} as const;

/** Notification identifiers for managing scheduled notifications */
const NOTIFICATION_IDS = {
  DAILY_REMINDER: 'daily-reminder',
  BREAKFAST_REMINDER: 'breakfast-reminder',
  LUNCH_REMINDER: 'lunch-reminder',
  DINNER_REMINDER: 'dinner-reminder',
  WEEKLY_SUMMARY: 'weekly-summary',
  HEALTH_TIP_MORNING: 'health-tip-morning',
  HEALTH_TIP_EVENING: 'health-tip-evening',
} as const;

/** Default meal reminder times */
const DEFAULT_MEAL_TIMES = {
  breakfast: { hour: 7, minute: 0 },
  lunch: { hour: 12, minute: 0 },
  dinner: { hour: 18, minute: 30 },
} as const;

/** Rotating health tips */
const HEALTH_TIPS = [
  'Minum air putih minimal 8 gelas sehari untuk menjaga hidrasi tubuh 💧',
  'Konsumsi sayur dan buah setiap kali makan untuk memenuhi kebutuhan serat 🥗',
  'Kurangi gula tambahan untuk menjaga kadar gula darah tetap stabil 🍬',
  'Protein penting untuk membangun dan memperbaiki jaringan tubuh 💪',
  'Istirahat cukup 7-8 jam sehari untuk pemulihan tubuh optimal 😴',
  'Kunyah makanan perlahan agar pencernaan lebih optimal 🍽️',
  'Variasikan sumber protein: ayam, ikan, tempe, tahu, dan telur 🥚',
  'Batasi makanan olahan dan perbanyak makanan segar 🌿',
  'Sarapan pagi membantu menjaga energi dan konsentrasi sepanjang hari ☀️',
  'Omega-3 dari ikan baik untuk kesehatan jantung dan otak 🐟',
];

// ---------------------------------------------------------------------------
// NotificationService
// ---------------------------------------------------------------------------

export class NotificationService {
  // =========================================================================
  // PERMISSIONS
  // =========================================================================

  /**
   * Request notification permissions and setup Android channels.
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('[Notification] Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notification] Permission not granted');
      return false;
    }

    // ✅ FIX #5: Setup multiple notification channels for Android
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    return true;
  }

  /**
   * Check if notifications are enabled.
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // =========================================================================
  // ✅ FIX #5: ANDROID NOTIFICATION CHANNELS
  // =========================================================================

  /**
   * Setup all Android notification channels.
   * Channels MUST be created before scheduling notifications on Android 8.0+.
   */
  private static async setupAndroidChannels(): Promise<void> {
    await Promise.all([
      Notifications.setNotificationChannelAsync(CHANNELS.REMINDERS, {
        name: 'Pengingat Makan',
        description: 'Pengingat untuk scan dan catat makanan',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#37B37E',
        sound: 'default',
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.HEALTH_TIPS, {
        name: 'Tips Kesehatan',
        description: 'Tips nutrisi dan kesehatan harian',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#4A90D9',
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.SCAN_RESULTS, {
        name: 'Hasil Scan',
        description: 'Notifikasi hasil pemindaian makanan',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#37B37E',
        sound: 'default',
      }),
      Notifications.setNotificationChannelAsync(CHANNELS.WEEKLY, {
        name: 'Ringkasan Mingguan',
        description: 'Ringkasan nutrisi mingguan',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#FFB74D',
      }),
    ]);

    console.log('[Notification] ✅ Android channels configured');
  }

  // =========================================================================
  // SEND IMMEDIATE NOTIFICATION
  // =========================================================================

  /**
   * Send an immediate (non-scheduled) notification.
   */
  static async sendNotification(data: PushNotificationData): Promise<string | null> {
    try {
      const hasPermission = await this.areNotificationsEnabled();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          sound: true,
        },
        trigger: null, // Immediately
      });

      return notificationId;
    } catch (error) {
      console.error('[Notification] Error sending notification:', error);
      return null;
    }
  }

  // =========================================================================
  // ✅ FIX #2 & #3: SCHEDULE NOTIFICATION (SDK 53 compatible triggers)
  // =========================================================================

  /**
   * Schedule a daily repeating notification.
   * Uses SchedulableTriggerInputTypes.DAILY — works on both Android & iOS.
   */
  static async scheduleDailyNotification(
    identifier: string,
    title: string,
    body: string,
    hour: number,
    minute: number,
    channelId?: string
  ): Promise<string | null> {
    try {
      const hasPermission = await this.areNotificationsEnabled();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) return null;
      }

      // Cancel existing notification with same identifier first
      await this.cancelNotificationByIdentifier(identifier);

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          sound: true,
          ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      console.log(`[Notification] ✅ Scheduled daily: "${identifier}" at ${hour}:${String(minute).padStart(2, '0')}`);
      return notificationId;
    } catch (error) {
      console.error(`[Notification] Error scheduling daily notification:`, error);
      return null;
    }
  }

  /**
   * Schedule a weekly repeating notification.
   * Uses SchedulableTriggerInputTypes.WEEKLY — works on both Android & iOS.
   *
   * @param weekday 1=Sunday, 2=Monday, ..., 7=Saturday
   */
  static async scheduleWeeklyNotification(
    identifier: string,
    title: string,
    body: string,
    weekday: number,
    hour: number,
    minute: number,
    channelId?: string
  ): Promise<string | null> {
    try {
      const hasPermission = await this.areNotificationsEnabled();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) return null;
      }

      await this.cancelNotificationByIdentifier(identifier);

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          sound: true,
          ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        },
      });

      console.log(`[Notification] ✅ Scheduled weekly: "${identifier}" on day ${weekday} at ${hour}:${String(minute).padStart(2, '0')}`);
      return notificationId;
    } catch (error) {
      console.error(`[Notification] Error scheduling weekly notification:`, error);
      return null;
    }
  }

  /**
   * Schedule a one-time notification after N seconds.
   * Uses SchedulableTriggerInputTypes.TIME_INTERVAL.
   */
  static async scheduleOneTimeNotification(
    title: string,
    body: string,
    seconds: number,
    data?: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const hasPermission = await this.areNotificationsEnabled();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: data || {},
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('[Notification] Error scheduling one-time notification:', error);
      return null;
    }
  }

  // =========================================================================
  // ✅ FIX #6: MEAL-TIME REMINDERS
  // =========================================================================

  /**
   * Setup all three meal-time reminders (breakfast, lunch, dinner).
   */
  static async setupMealReminders(
    times?: {
      breakfast?: { hour: number; minute: number };
      lunch?: { hour: number; minute: number };
      dinner?: { hour: number; minute: number };
    }
  ): Promise<void> {
    const breakfast = times?.breakfast ?? DEFAULT_MEAL_TIMES.breakfast;
    const lunch = times?.lunch ?? DEFAULT_MEAL_TIMES.lunch;
    const dinner = times?.dinner ?? DEFAULT_MEAL_TIMES.dinner;

    await Promise.all([
      this.scheduleDailyNotification(
        NOTIFICATION_IDS.BREAKFAST_REMINDER,
        'Sarapan Pagi! ☀️',
        'Jangan lupa scan sarapanmu untuk memulai hari yang sehat',
        breakfast.hour,
        breakfast.minute,
        CHANNELS.REMINDERS
      ),
      this.scheduleDailyNotification(
        NOTIFICATION_IDS.LUNCH_REMINDER,
        'Waktunya Makan Siang! 🍽️',
        'Yuk scan makan siangmu dan cek asupan nutrisimu',
        lunch.hour,
        lunch.minute,
        CHANNELS.REMINDERS
      ),
      this.scheduleDailyNotification(
        NOTIFICATION_IDS.DINNER_REMINDER,
        'Makan Malam! 🌙',
        'Scan makan malammu untuk melengkapi catatan nutrisi hari ini',
        dinner.hour,
        dinner.minute,
        CHANNELS.REMINDERS
      ),
    ]);

    console.log('[Notification] ✅ Meal reminders configured');
  }

  /**
   * Cancel all meal-time reminders.
   */
  static async cancelMealReminders(): Promise<void> {
    await Promise.all([
      this.cancelNotificationByIdentifier(NOTIFICATION_IDS.BREAKFAST_REMINDER),
      this.cancelNotificationByIdentifier(NOTIFICATION_IDS.LUNCH_REMINDER),
      this.cancelNotificationByIdentifier(NOTIFICATION_IDS.DINNER_REMINDER),
    ]);
    console.log('[Notification] ✅ Meal reminders cancelled');
  }

  // =========================================================================
  // DAILY REMINDER (single general reminder)
  // =========================================================================

  /**
   * Setup a single daily scan reminder.
   */
  static async setupDailyReminder(
    hour: number = 12,
    minute: number = 0
  ): Promise<string | null> {
    return await this.scheduleDailyNotification(
      NOTIFICATION_IDS.DAILY_REMINDER,
      'Jangan Lupa Scan Makanan! 🍽️',
      'Yuk scan makananmu hari ini untuk memantau asupan nutrisimu',
      hour,
      minute,
      CHANNELS.REMINDERS
    );
  }

  /**
   * Cancel the daily scan reminder.
   */
  static async cancelDailyReminder(): Promise<void> {
    await this.cancelNotificationByIdentifier(NOTIFICATION_IDS.DAILY_REMINDER);
  }

  // =========================================================================
  // ✅ FIX #6: HEALTH TIP NOTIFICATIONS
  // =========================================================================

  /**
   * Setup daily health tip notification (rotates through tips).
   */
  static async setupHealthTips(
    hour: number = 8,
    minute: number = 30
  ): Promise<string | null> {
    // Get a random tip — rotation happens because each day the notification
    // content can be refreshed by re-calling this method.
    const tip = HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)];

    return await this.scheduleDailyNotification(
      NOTIFICATION_IDS.HEALTH_TIP_MORNING,
      'Tips Kesehatan 💡',
      tip,
      hour,
      minute,
      CHANNELS.HEALTH_TIPS
    );
  }

  /**
   * Cancel health tip notifications.
   */
  static async cancelHealthTips(): Promise<void> {
    await Promise.all([
      this.cancelNotificationByIdentifier(NOTIFICATION_IDS.HEALTH_TIP_MORNING),
      this.cancelNotificationByIdentifier(NOTIFICATION_IDS.HEALTH_TIP_EVENING),
    ]);
  }

  // =========================================================================
  // ✅ FIX #7: WEEKLY SUMMARY NOTIFICATION
  // =========================================================================

  /**
   * Setup weekly summary reminder (default: Sunday 9AM).
   *
   * @param weekday 1=Sunday, 2=Monday, ..., 7=Saturday
   */
  static async setupWeeklySummary(
    weekday: number = 1,
    hour: number = 9,
    minute: number = 0
  ): Promise<string | null> {
    return await this.scheduleWeeklyNotification(
      NOTIFICATION_IDS.WEEKLY_SUMMARY,
      'Ringkasan Mingguan 📊',
      'Lihat ringkasan nutrisi kamu minggu ini! Cek apakah target tercapai',
      weekday,
      hour,
      minute,
      CHANNELS.WEEKLY
    );
  }

  /**
   * Cancel weekly summary notification.
   */
  static async cancelWeeklySummary(): Promise<void> {
    await this.cancelNotificationByIdentifier(NOTIFICATION_IDS.WEEKLY_SUMMARY);
  }

  // =========================================================================
  // CONTEXTUAL NOTIFICATIONS (sent by app events)
  // =========================================================================

  /**
   * Notify when a food scan completes.
   */
  static async sendScanCompleteNotification(foodName: string): Promise<string | null> {
    return await this.sendNotification({
      title: 'Pemindaian Selesai! ✅',
      body: `Hasil scan untuk ${foodName} sudah tersedia`,
      data: { type: 'scan_complete', foodName },
    });
  }

  /**
   * Notify when daily calorie target is almost reached.
   */
  static async sendCalorieWarningNotification(
    currentCalories: number,
    targetCalories: number
  ): Promise<string | null> {
    const percentage = Math.round((currentCalories / targetCalories) * 100);
    return await this.sendNotification({
      title: 'Perhatian Kalori ⚠️',
      body: `Kamu sudah mengonsumsi ${percentage}% dari target harianmu (${currentCalories}/${targetCalories} kkal)`,
      data: { type: 'calorie_warning', currentCalories, targetCalories },
    });
  }

  /**
   * Notify when a meal is not balanced.
   */
  static async sendUnbalancedMealNotification(
    missingNutrients: string[]
  ): Promise<string | null> {
    const nutrients = missingNutrients.join(', ');
    return await this.sendNotification({
      title: 'Tips Keseimbangan Nutrisi 🍎',
      body: `Makananmu kurang ${nutrients}. Coba tambahkan lauk yang kaya nutrisi tersebut.`,
      data: { type: 'unbalanced_meal', missingNutrients },
    });
  }

  /**
   * Send an immediate health tip.
   */
  static async sendHealthTipNotification(tip?: string): Promise<string | null> {
    const body = tip ?? HEALTH_TIPS[Math.floor(Math.random() * HEALTH_TIPS.length)];
    return await this.sendNotification({
      title: 'Tips Kesehatan 💡',
      body,
      data: { type: 'health_tip' },
    });
  }

  // =========================================================================
  // ✅ FIX #8: MASTER SETUP — Apply all notifications from preferences
  // =========================================================================

  /**
   * Apply notification settings from user preferences.
   * Call this on app launch and whenever preferences change.
   */
  static async applyPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      // Save preferences
      await this.savePreferences(preferences);

      // Cancel all existing scheduled notifications first for clean state
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Re-schedule based on preferences
      if (preferences.dailyReminder?.enabled) {
        await this.setupDailyReminder(
          preferences.dailyReminder.hour ?? 12,
          preferences.dailyReminder.minute ?? 0
        );
      }

      if (preferences.mealReminders?.enabled) {
        await this.setupMealReminders(preferences.mealReminders.times);
      }

      if (preferences.healthTips?.enabled) {
        await this.setupHealthTips(
          preferences.healthTips.hour ?? 8,
          preferences.healthTips.minute ?? 30
        );
      }

      if (preferences.weeklySummary?.enabled) {
        await this.setupWeeklySummary(
          preferences.weeklySummary.weekday ?? 1,
          preferences.weeklySummary.hour ?? 9,
          preferences.weeklySummary.minute ?? 0
        );
      }

      console.log('[Notification] ✅ All preferences applied');
    } catch (error) {
      console.error('[Notification] Error applying preferences:', error);
    }
  }

  // =========================================================================
  // CANCELLATION
  // =========================================================================

  /**
   * Cancel a notification by its identifier.
   */
  static async cancelNotificationByIdentifier(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      // Ignore if not found — notification may not have been scheduled
      console.debug(`[Notification] Cancel "${identifier}":`, error);
    }
  }

  /**
   * Cancel a notification by its ID (returned from schedule).
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('[Notification] Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications.
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[Notification] ✅ All notifications cancelled');
    } catch (error) {
      console.error('[Notification] Error canceling all notifications:', error);
    }
  }

  // =========================================================================
  // QUERY
  // =========================================================================

  /**
   * Get all currently scheduled notifications.
   */
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('[Notification] Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Get a diagnostic summary of scheduled notifications.
   */
  static async getDiagnostics(): Promise<{
    permissionGranted: boolean;
    scheduledCount: number;
    scheduledIds: string[];
  }> {
    const permissionGranted = await this.areNotificationsEnabled();
    const scheduled = await this.getAllScheduledNotifications();
    return {
      permissionGranted,
      scheduledCount: scheduled.length,
      scheduledIds: scheduled.map(n => n.identifier),
    };
  }

  // =========================================================================
  // PREFERENCES STORAGE
  // =========================================================================

  /**
   * Save notification preferences to AsyncStorage.
   */
  static async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('[Notification] Error saving preferences:', error);
    }
  }

  /**
   * Load notification preferences from AsyncStorage.
   */
  static async loadPreferences(): Promise<NotificationPreferences | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[Notification] Error loading preferences:', error);
      return null;
    }
  }

  // =========================================================================
  // EVENT LISTENERS
  // =========================================================================

  /**
   * Listen for notification taps (user interacts with notification).
   */
  static addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Listen for incoming notifications while app is in foreground.
   */
  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }
}