/**
 * useToast.tsx
 * ---------------------------------------------------------------------------
 * Custom toast system — pengganti Alert.alert() native.
 * FULL INLINE STYLE — menghindari css-interop crash NavigationContext.
 *
 * Penggunaan:
 *   const { showToast, ToastContainer } = useToast();
 *
 *   showToast({
 *     type: 'error',
 *     title: 'Analisis Gagal',
 *     message: 'Tidak dapat memproses foto.',
 *     actions: [
 *       { label: 'Coba Lagi', onPress: retry },
 *       { label: 'Batal', variant: 'ghost' },
 *     ],
 *   });
 *
 *   // Di JSX (paling bawah): <ToastContainer />
 * ---------------------------------------------------------------------------
 */

import { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
}

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  actions?: ToastAction[];
  /** ms. Default: 3000 (tanpa actions), 0 = tidak auto-dismiss */
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: string;
}

// ---------------------------------------------------------------------------
// Per-type style/color maps
// ---------------------------------------------------------------------------

const TOAST_THEMES: Record<ToastType, {
  bg: string;
  border: string;
  titleColor: string;
  messageColor: string;
  actionBg: string;
  actionText: string;
  iconColor: string;
}> = {
  success: {
    bg: '#FFFFFF',
    border: '#37B37E',
    titleColor: '#37B37E',
    messageColor: '#37B37E',
    actionBg: '#37B37E',
    actionText: '#FFFFFF',
    iconColor: '#37B37E',
  },
  error: {
    bg: '#FEF2F2',
    border: '#ef4444',
    titleColor: '#ef4444',
    messageColor: '#ef4444',
    actionBg: '#ef4444',
    actionText: '#FFFFFF',
    iconColor: '#ef4444',
  },
  warning: {
    bg: '#FEFCE8',
    border: '#ffa726',
    titleColor: '#ffa726',
    messageColor: '#ffa726',
    actionBg: '#ffa726',
    actionText: '#FFFFFF',
    iconColor: '#ffa726',
  },
  info: {
    bg: '#F0F6FF',
    border: '#1F78FF',
    titleColor: '#1F78FF',
    messageColor: '#1F78FF',
    actionBg: '#1F78FF',
    actionText: '#FFFFFF',
    iconColor: '#1F78FF',
  },
};

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

// ---------------------------------------------------------------------------
// Single Toast Item — FULL INLINE STYLE
// ---------------------------------------------------------------------------

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const type = toast.type ?? 'info';
  const theme = TOAST_THEMES[type];

  // Enter animation
  Animated.parallel([
    Animated.spring(translateY, {
      toValue: 0,
      damping: 18,
      stiffness: 200,
      useNativeDriver: true,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }),
  ]).start();

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  }, [toast.id, onDismiss]);

  return (
    <Animated.View
      style={[
        {
          width: '100%',
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.bg,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        },
        { transform: [{ translateY }], opacity },
      ]}
    >
      {/* Icon + Content + Close */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Ionicons
          name={ICON_MAP[type]}
          size={22}
          color={theme.iconColor}
          style={{ marginRight: 10, marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              fontWeight: '600',
              color: theme.titleColor,
            }}
          >
            {toast.title}
          </Text>
          {toast.message ? (
            <Text
              style={{
                fontSize: 12,
                lineHeight: 16,
                marginTop: 2,
                color: theme.messageColor,
                opacity: 0.8,
              }}
            >
              {toast.message}
            </Text>
          ) : null}
        </View>
        {!toast.actions?.length && (
          <TouchableOpacity
            onPress={dismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color={theme.iconColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Actions */}
      {toast.actions?.length ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          {toast.actions.map((action, i) => {
            const isGhost = action.variant === 'ghost';
            return (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  action.onPress?.();
                  dismiss();
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: isGhost ? 'transparent' : theme.actionBg,
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: isGhost ? theme.titleColor : theme.actionText,
                  }}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timerRefs.current[id]);
    delete timerRefs.current[id];
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const toast: ToastState = { ...options, id };

      setToasts((prev) => [toast, ...prev].slice(0, 3));

      const duration = options.duration ?? (!options.actions?.length ? 3000 : 0);
      if (duration > 0) {
        timerRefs.current[id] = setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const ToastContainer = useCallback(
    () => (
      <View
        style={{
          position: 'absolute',
          top: 56,
          left: 16,
          right: 16,
          gap: 8,
          zIndex: 9999,
        }}
        pointerEvents="box-none"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </View>
    ),
    [toasts, dismiss]
  );

  return { showToast, dismissToast: dismiss, ToastContainer };
}