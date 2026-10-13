import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  name: string;
  subtitle?: string;
  onPress: () => void;
};

export function PharmacyCallout({ name, subtitle = 'Voir les détails', onPress }: Props) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${subtitle}`}
      >
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Path
            d="M5 3 L10 8 L5 13"
            stroke="#008069"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 160,
    maxWidth: 220,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d3d0c8',
  },
  texts: { flexShrink: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#1f2a27' },
  subtitle: { fontSize: 12, color: '#6b6a64' },
  tail: {
    width: 10,
    height: 10,
    marginTop: -6,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d3d0c8',
    transform: [{ rotate: '45deg' }],
  },
});
