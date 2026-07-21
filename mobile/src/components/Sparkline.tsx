import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme';

interface SparklineProps {
  values: number[];
  height?: number;
  color?: string;
}

export function Sparkline({ values, height = 64, color }: SparklineProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const stroke = color ?? theme.colors.brand;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 6;
  const h = height - pad * 2;

  const coords = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * width : width / 2;
    const y = pad + (h - ((v - min) / range) * h);
    return { x, y };
  });
  const pointsStr = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const last = coords[coords.length - 1];

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && values.length >= 2 ? (
        <Svg width={width} height={height}>
          <Polyline points={pointsStr} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {last ? <Circle cx={last.x} cy={last.y} r={4} fill={stroke} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}
