import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme';
import { Text } from './Text';

interface ProgressRingProps {
  size?: number;
  stroke?: number;
  progress: number; // 0..1
  color?: string;
  trackColor?: string;
  centerLabel?: string;
  centerSub?: string;
}

export function ProgressRing({
  size = 120,
  stroke = 12,
  progress,
  color,
  trackColor,
  centerLabel,
  centerSub,
}: ProgressRingProps) {
  const theme = useTheme();
  const ringColor = color ?? theme.colors.brand;
  const track = trackColor ?? theme.colors.cardMuted;

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dash = circumference * clamped;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash}, ${circumference}`}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {centerLabel ? (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text variant="heading">{centerLabel}</Text>
          {centerSub ? (
            <Text variant="caption" color="textMuted">
              {centerSub}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
