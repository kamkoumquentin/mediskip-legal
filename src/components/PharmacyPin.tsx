import Svg, { Ellipse, Path } from 'react-native-svg';

const PIN = 'M14 36 C9 29 2 22 2 14 A12 12 0 0 1 26 14 C26 22 19 29 14 36 Z';
const CROSS = 'M12.4 8.8 h3.2 v3.6 h3.6 v3.2 h-3.6 v3.6 h-3.2 v-3.6 h-3.6 v-3.2 h3.6 Z';

type PharmacyPinProps = {
  width?: number;
  color?: string;
};

export function PharmacyPin({ width = 30, color = '#008069' }: PharmacyPinProps) {
  const height = (width * 46) / 34;
  return (
    <Svg width={width} height={height} viewBox="-3 -3 34 46">
      <Ellipse cx={14} cy={36.6} rx={6.5} ry={2} fill="#000" fillOpacity={0.16} />
      <Path d={PIN} fill="#fff" stroke="#fff" strokeWidth={3.5} strokeLinejoin="round" />
      <Path d={PIN} fill={color} />
      <Path d={CROSS} fill="#fff" />
    </Svg>
  );
}
