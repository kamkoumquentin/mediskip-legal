import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useCompactBarMetrics() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const barHeight = Math.min(72, Math.max(52, height * 0.07));
  const horizontalMargin = Math.min(20, Math.max(10, width * 0.03));
  const barWidth = Math.min(520, width - horizontalMargin * 2);
  const dynamicBottom = Math.max(insets.bottom, 16) + 12;

  return {
    barHeight,
    horizontalMargin,
    barWidth,
    left: (width - barWidth) / 2,
    dynamicBottom,
    cameraPaddingBottom: barHeight + dynamicBottom + 8,
  };
}
