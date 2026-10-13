/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111B21',
    background: '#ffffff',
    backgroundElement: '#F0F2F5',
    backgroundSelected: '#E9EDEF',
    textSecondary: '#667781',
  },
  dark: {
    text: '#ffffff',
    background: '#111B21',
    backgroundElement: '#202C33',
    backgroundSelected: '#2A3942',
    textSecondary: '#8696A0',
  },
} as const;

export const WhatsAppColors = {
  whatsappTeal: '#075E54',
  whatsappGreen: '#008069',
  whatsappAccent: '#00A884',
  whatsappLightGreen: '#E7FCE3',
  whatsappBg: '#F0F2F5',
  whatsappCardBg: '#FFFFFF',
  whatsappMuted: '#667781',
  whatsappDark: '#111B21',
  teal: '#075E54',
  green: '#008069',
  accent: '#00A884',
  brightGreen: '#25D366',
  lightGreen: '#E7FCE3',
  lightGreenBg: '#D9FDD3',
  bg: '#F0F2F5',
  cardBg: '#FFFFFF',
  textDark: '#111B21',
  textMuted: '#667781',
  border: '#E9EDEF',
  badge: '#25D366',
} as const;


export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
