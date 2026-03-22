// src/theme/colors.js
export const colors = {
  primary: '#1B3A6B',
  primaryLight: '#2A5298',
  primaryDark: '#0F2040',
  accent: '#00BFA5',
  accentLight: '#4DD0C4',
  accentDark: '#008B7A',
  success: '#27AE60',
  successLight: '#EAFAF1',
  warning: '#F39C12',
  warningLight: '#FEF9E7',
  danger: '#E74C3C',
  dangerLight: '#FDEDEC',
  background: '#EEF2F7',
  card: '#FFFFFF',
  text: '#1A202C',
  textSecondary: '#4A5568',
  textMuted: '#A0AEC0',
  border: '#E2E8F0',
  white: '#FFFFFF',
  black: '#000000',
  pending: '#F39C12',
  pendingLight: '#FEF9E7',
  completed: '#27AE60',
  completedLight: '#EAFAF1',
  cancelled: '#E74C3C',
  cancelledLight: '#FDEDEC',
};

export const STATUS_COLORS = {
  pending: { bg: colors.pendingLight, text: colors.warning, label: 'Pendente' },
  completed: { bg: colors.completedLight, text: colors.success, label: 'Concluído' },
  cancelled: { bg: colors.cancelledLight, text: colors.danger, label: 'Cancelado' },
};

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];
