/**
 * pengaturan.ts — Types for Settings & Notifications
 * ---------------------------------------------------------------------------
 * UPDATED for new NotificationService (Expo SDK 53)
 * • ✅ NotificationPreferences now supports meal reminders, health tips, weekly summary
 * • ✅ Backward compatible — existing NotificationSetting[] still works for UI toggles
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Notification Setting (UI toggle items)
// ---------------------------------------------------------------------------

export interface NotificationSetting {
  id: string;
  icon: string;
  label: string;
  description: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Time & Schedule Config
// ---------------------------------------------------------------------------

export interface TimeConfig {
  hour: number;
  minute: number;
}

export interface MealReminderTimes {
  breakfast?: TimeConfig;
  lunch?: TimeConfig;
  dinner?: TimeConfig;
}

// ---------------------------------------------------------------------------
// Notification Preferences (stored in AsyncStorage)
// ---------------------------------------------------------------------------

export interface NotificationPreferences {
  /** UI toggle list — used by settings screen to render switches */
  notifications: NotificationSetting[];

  /** Global sound setting */
  sound: boolean;

  /** Global vibration setting */
  vibration: boolean;

  /** Single daily scan reminder (e.g. "Jangan lupa scan makanan!") */
  dailyReminder?: {
    enabled: boolean;
    hour?: number;   // default 12
    minute?: number;  // default 0
  };

  /** Per-meal reminders (breakfast, lunch, dinner) */
  mealReminders?: {
    enabled: boolean;
    times?: MealReminderTimes;
  };

  /** Daily health tip notification */
  healthTips?: {
    enabled: boolean;
    hour?: number;   // default 8
    minute?: number;  // default 30
  };

  /** Weekly nutrition summary reminder */
  weeklySummary?: {
    enabled: boolean;
    weekday?: number;  // 1=Sunday ... 7=Saturday, default 1
    hour?: number;     // default 9
    minute?: number;   // default 0
  };
}

// ---------------------------------------------------------------------------
// Push Notification Data (for immediate notifications)
// ---------------------------------------------------------------------------

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Scheduled Notification (legacy — kept for backward compat)
// ---------------------------------------------------------------------------

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  trigger: {
    hour: number;
    minute: number;
    repeats: boolean;
  };
}

// ---------------------------------------------------------------------------
// Settings Screen Types
// ---------------------------------------------------------------------------

export interface SettingItem {
  iconLib: 'Ionicons' | 'MaterialIcons';
  iconName: string;
  label: string;
  description: string;
  onPress?: () => void;
}

export interface SettingsGroup {
  title: string;
  items: SettingItem[];
}

// ---------------------------------------------------------------------------
// Default Preferences (helper)
// ---------------------------------------------------------------------------

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notifications: [
    {
      id: 'daily-reminder',
      icon: 'notifications-outline',
      label: 'Pengingat Harian',
      description: 'Ingatkan untuk scan makanan setiap hari',
      enabled: true,
    },
    {
      id: 'meal-reminders',
      icon: 'restaurant-outline',
      label: 'Pengingat Waktu Makan',
      description: 'Ingatkan saat sarapan, makan siang, dan makan malam',
      enabled: true,
    },
    {
      id: 'health-tips',
      icon: 'heart-outline',
      label: 'Tips Kesehatan',
      description: 'Tips nutrisi dan kesehatan harian',
      enabled: true,
    },
    {
      id: 'weekly-summary',
      icon: 'bar-chart-outline',
      label: 'Ringkasan Mingguan',
      description: 'Ringkasan nutrisi setiap hari Minggu',
      enabled: false,
    },
    {
      id: 'scan-complete',
      icon: 'checkmark-circle-outline',
      label: 'Hasil Scan',
      description: 'Notifikasi saat pemindaian makanan selesai',
      enabled: true,
    },
  ],
  sound: true,
  vibration: true,
  dailyReminder: { enabled: true, hour: 12, minute: 0 },
  mealReminders: {
    enabled: true,
    times: {
      breakfast: { hour: 7, minute: 0 },
      lunch: { hour: 12, minute: 0 },
      dinner: { hour: 18, minute: 30 },
    },
  },
  healthTips: { enabled: true, hour: 8, minute: 30 },
  weeklySummary: { enabled: false, weekday: 1, hour: 9, minute: 0 },
};