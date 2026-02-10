export interface NotificationSetting {
  id: string;
  icon: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface NotificationPreferences {
  notifications: NotificationSetting[];
  sound: boolean;
  vibration: boolean;
}

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

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
