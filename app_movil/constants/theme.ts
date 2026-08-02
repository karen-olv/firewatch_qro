/**
 * FireWatch QRO - Tema profesional (combina con el dashboard web).
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B2016',
    background: '#F5F2EC',
    tint: '#C7361B',
    icon: '#687076',
    tabIconDefault: '#8F9680',
    tabIconSelected: '#C7361B',
    card: '#FFFFFF',
    border: '#D8D3C8',
    muted: '#6B7280',
    primary: '#C7361B',
    secondary: '#FF6A3D',
    danger: '#C7361B',
    success: '#2E7D32',
    warning: '#B45309',
  },
  dark: {
    text: '#E6EDF3',
    background: '#0B1D33',
    tint: '#FF6A3D',
    icon: '#9BA1A6',
    tabIconDefault: '#5C6B7A',
    tabIconSelected: '#FF6A3D',
    card: '#122A47',
    border: '#1F3A5F',
    muted: '#9DB1C7',
    primary: '#FF6A3D',
    secondary: '#F97316',
    danger: '#EF4444',
    success: '#4ADE80',
    warning: '#FBBF24',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

