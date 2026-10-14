import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Platform, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Ellipse, G, Rect, Path, Circle, Text as SvgText } from 'react-native-svg';
import { formatDistance } from '@/utils/geo';
import { WhatsAppColors } from '@/constants/theme';
import { useCompactBarMetrics } from '@/hooks/use-compact-bar-metrics';

interface ResultsPanelProps {
  isVisible: boolean;
  isCompact: boolean;
  allResultsVisible: boolean;
  isLoading: boolean;
  searchResults: any[];
  totalResults: number;
  isLoadingMoreResults: boolean;
  selectedOffer: any | null;
  isPopupOpen?: boolean;
  searchedQuery?: string;
  onSelectPharmacy: (item: any) => void;
  onShowAllResultsOnMap: () => void;
  onExpandPanel: () => void;
  onClearMap: () => void;
  onClosePanel: () => void;
  onReducePanel: () => void;
  onLoadMoreResults: () => void;
  onClosePopup?: () => void;
  onOpenPharmacyModal?: (name: string, photo: string) => void;
  onOpenMedicineModal?: (medicineData: any) => void;
}

/**
 * Illustration SVG pour le packaging produit si aucune image distante n'est disponible.
 */
function RenderProductBoxSVG({ name }: { name: string }) {
  const parts = name.split(" ");
  const mainTitle = parts[0] || "Médicament";
  const dosage = parts.slice(1).join(" ");

  return (
    <Svg viewBox="0 0 500 280" width="100%" height="100%">
      <Defs>
        <LinearGradient id="resMedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="100%" stopColor="#f1f5f9" />
        </LinearGradient>
        <LinearGradient id="resAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#075E54" />
          <Stop offset="100%" stopColor="#008069" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="250" cy="260" rx="170" ry="10" fill="#0f172a" opacity="0.08" />
      <G>
        <Rect x="75" y="30" width="320" height="175" rx="14" fill="url(#resMedGrad)" stroke="#cbd5e1" strokeWidth="2" />
        <Path d="M 76,135 Q 200,115 394,155 L 394,191 A 14,14 0 0,1 380,204 L 90,204 A 14,14 0 0,1 76,191 Z" fill="url(#resAccentGrad)" />
        <Circle cx="345" cy="100" r="22" fill="#008069" />
        <Path d="M 335,110 L 355,90" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
        <SvgText x="105" y="65" fontFamily="System" fontSize="11" fontWeight="700" fill="#64748b" letterSpacing="0.05em">20 COMPRIMÉS</SvgText>
        <SvgText x="105" y="100" fontFamily="System" fontSize="26" fontWeight="900" fill="#0f172a" letterSpacing="-0.02em">{mainTitle.toUpperCase()}</SvgText>
        <SvgText x="105" y="125" fontFamily="System" fontSize="20" fontWeight="800" fill="#008069">{dosage}</SvgText>
        <SvgText x="105" y="175" fontFamily="System" fontSize="13" fontWeight="600" fill="#ffffff">Douleurs et Fièvre • Kamsoft</SvgText>
      </G>
    </Svg>
  );
}

export default function ResultsPanel({
  isVisible,
  isCompact,
  allResultsVisible,
  isLoading,
  searchResults = [],
  totalResults,
  isLoadingMoreResults,
  selectedOffer = null,
  isPopupOpen = true,
  searchedQuery,
  onSelectPharmacy,
  onShowAllResultsOnMap,
  onExpandPanel,
  onClearMap,
  onClosePanel,
  onReducePanel,
  onLoadMoreResults,
  onClosePopup,
  onOpenPharmacyModal,
  onOpenMedicineModal
}: ResultsPanelProps) {
  const compactBarMetrics = useCompactBarMetrics();
  const dynamicBottom = compactBarMetrics.dynamicBottom;
  const { height: windowHeight } = useWindowDimensions();
  const maxPanelHeight = windowHeight * 0.6;

  const activeSearchTitle = searchedQuery || searchResults[0]?.medicament?.nom || searchResults[0]?.nom || "Recherche";

  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const slideAnim = React.useRef(new Animated.Value(500)).current;

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [isVisible, slideAnim]);

  // LISTE DES PHARMACIES
  if (!shouldRender) return null;
  if (isCompact && isPopupOpen) return null;

  if (isCompact) {
    const compactTitle = selectedOffer?.pharmacie?.nom || selectedOffer?.boutique || activeSearchTitle;

    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            bottom: compactBarMetrics.dynamicBottom,
            height: compactBarMetrics.barHeight,
            left: compactBarMetrics.left,
            width: compactBarMetrics.barWidth,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.compactBarPressable}
          onPress={onExpandPanel}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir la liste des résultats"
        >
          <View style={styles.compactInfo}>
            <Text
              style={styles.compactTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.2}
            >
              {compactTitle}
            </Text>
            <Text style={styles.compactCount} maxFontSizeMultiplier={1.2}>
              {totalResults} résultat{totalResults === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.compactOpenAction}>
            <Ionicons name="chevron-up" size={17} color="#FFFFFF" />
            <Text style={styles.compactOpenText} maxFontSizeMultiplier={1.2}>Ouvrir</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.cardContainer, { bottom: dynamicBottom, maxHeight: maxPanelHeight, transform: [{ translateY: slideAnim }] }]}>
      {/* Drag handle */}
      <View style={styles.dragHandle} />

      {/* Header de la liste */}
      <View style={styles.listHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle} numberOfLines={1}>{activeSearchTitle}</Text>
          <Text style={styles.listSubtitle}>
            {isLoading 
              ? 'Recherche en cours...' 
              : `${totalResults} pharmacie${totalResults > 1 ? 's' : ''} trouvée${totalResults > 1 ? 's' : ''} (triée${totalResults > 1 ? 's' : ''} par distance)`
            }
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.closeListButton}
            onPress={onClosePanel}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color="#111B21" />
          </TouchableOpacity>
        </View>
      </View>

      {searchResults.length > 0 && !isLoading && (!allResultsVisible || selectedOffer) && (
        <TouchableOpacity
          style={styles.showAllOnMapButton}
          onPress={onShowAllResultsOnMap}
          disabled={isLoadingMoreResults}
          activeOpacity={0.85}
        >
          {isLoadingMoreResults ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name={allResultsVisible ? 'pin-outline' : 'map-outline'} size={17} color="#FFFFFF" />
          )}
          <Text style={styles.showAllOnMapText}>
            {isLoadingMoreResults
              ? 'Chargement...'
              : allResultsVisible ? 'Ne garder que la sélection' : 'Voir tous les résultats sur la carte'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Liste des pharmacies triées par distance croissante */}
      <FlatList
        data={isLoading ? [] : searchResults}
        keyExtractor={(item) => String(item.id ?? item.id_offre ?? item.id_pharmacie)}
        renderItem={({ item }) => {
          const pharmacyName = item?.pharmacie?.nom || item?.boutique || "Pharmacie";
          const locationName = item?.pharmacie?.emplacement;
          const isAvailable = item?.disponibilite !== 'rupture';
          const formatPrix = typeof item?.prix === 'number' ? `${item.prix.toLocaleString('fr-FR')} FCFA` : item?.prix;
          const distanceText = item?.distance !== undefined && item?.distance !== null
            ? formatDistance(item.distance)
            : null;

          return (
            <TouchableOpacity
              style={styles.pharmacyCardItem}
              onPress={() => onSelectPharmacy(item)}
              activeOpacity={0.85}
            >
              <View style={styles.itemAvatarWrapper}>
                {item?.pharmacie?.photo ? (
                  <Image source={{ uri: item.pharmacie.photo }} style={styles.itemAvatar} />
                ) : (
                  <View style={styles.itemAvatarFallback}>
                    <Ionicons name="medkit" size={22} color={WhatsAppColors.whatsappGreen} />
                  </View>
                )}
              </View>

              <View style={styles.itemMainInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{pharmacyName}</Text>
                {!!locationName && <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color="#667781" />
                  <Text style={styles.itemLocation} numberOfLines={1}>{locationName}</Text>
                </View>}
                {distanceText && (
                  <View style={styles.locationRow}>
                    <Ionicons name="navigate-outline" size={12} color="#008069" />
                    <Text style={styles.itemDistance}>{distanceText}</Text>
                  </View>
                )}
                <View style={[styles.dispoBadge, isAvailable ? styles.dispoBadgeIn : styles.dispoBadgeOut, { alignSelf: 'flex-start', marginTop: 4 }]}>
                  <View style={[styles.dispoDot, isAvailable ? styles.dispoDotIn : styles.dispoDotOut]} />
                  <Text style={[styles.dispoText, isAvailable ? styles.dispoTextIn : styles.dispoTextOut]}>
                    {isAvailable ? 'En stock' : 'Rupture'}
                  </Text>
                </View>
              </View>

              {!!formatPrix && <View style={styles.itemPriceBadge}>
                <Text style={styles.itemPriceText}>{formatPrix}</Text>
              </View>}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={WhatsAppColors.whatsappGreen} />
            <Text style={styles.loadingText}>
              Recherche des officines à proximité...
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={32} color="#8696A0" />
            <Text style={styles.emptyText}>Aucune pharmacie ne propose ce médicament.</Text>
          </View>
        )}
        ListFooterComponent={isLoadingMoreResults ? (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={WhatsAppColors.whatsappGreen} />
            <Text style={styles.loadingText}>Chargement de la suite...</Text>
          </View>
        ) : null}
        onEndReached={onLoadMoreResults}
        onEndReachedThreshold={0.5}
        nestedScrollEnabled
        style={styles.listScroll}
        contentContainerStyle={styles.listScrollContent}
      />

      {/* Pied de panneau */}
      <View style={styles.listFooter}>
        <Text style={styles.footerHint}>Toucher une pharmacie pour voir son offre</Text>
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.reduceListButton}
            onPress={onReducePanel}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-down" size={18} color="#111B21" />
            <Text style={styles.reduceListText}>Réduire</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────
// CARTE DU PRODUIT / MÉDICAMENT (S'OUVRE AU CLIC SUR LE MARQUEUR OU SÉLECTION)
// ─────────────────────────────────────────────────────────

export function MedicineProductCard({
  item,
  activeSearchTitle,
  onClearMap,
  onClosePopup,
  onOpenPharmacyModal,
  onOpenMedicineModal,
}: {
  item: any;
  activeSearchTitle?: string;
  onClearMap?: () => void;
  onClosePopup?: () => void;
  onOpenPharmacyModal?: (name: string, photo: string) => void;
  onOpenMedicineModal?: (data: any) => void;
}) {
  const medName = item?.medicament?.nom || item?.nom || activeSearchTitle || 'Médicament';
  const pharmacyName = item?.pharmacie?.nom || item?.boutique || 'Pharmacie';
  const pharmacyPhoto = item?.pharmacie?.photo || 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=400';
  const formatPrix = typeof item?.prix === 'number' ? `${item.prix.toLocaleString('fr-FR')} FCFA` : item?.prix;

  const formattedPharmacy = pharmacyName.charAt(0).toUpperCase() + pharmacyName.slice(1);

  return (
    <View style={productCardStyles.cardContainer}>
      {/* Section Image avec overlay bouton fermer & bouton loupe */}
      <View style={productCardStyles.imageSection}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={0.9}
          onPress={() => onOpenMedicineModal?.({ name: medName, image: item?.image, item })}
        >
          {item?.image ? (
            <Image source={{ uri: item.image }} style={productCardStyles.productImage} resizeMode="cover" />
          ) : (
            <View style={productCardStyles.svgWrapper}>
              <RenderProductBoxSVG name={medName} />
            </View>
          )}
        </TouchableOpacity>

        {/* Bouton Fermer (X) en haut à droite */}
        <TouchableOpacity
          style={productCardStyles.topCloseButton}
          onPress={() => onClosePopup ? onClosePopup() : onClearMap?.()}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Bouton Loupe Bleue en bas à droite de l'image */}
        <TouchableOpacity
          style={productCardStyles.blueZoomButton}
          onPress={() => onOpenMedicineModal?.({ name: medName, image: item?.image, item })}
          activeOpacity={0.85}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="search" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Ligne séparatrice légère */}
      <View style={productCardStyles.hairlineDivider} />

      {/* Section texte inférieure avec Avatar Pharmacie à cheval sur le bord droit */}
      <View style={productCardStyles.bodySection}>
        {/* Subtitle / Nom de la pharmacie */}
        <Text style={productCardStyles.pharmacySubtitle} numberOfLines={1}>
          {formattedPharmacy}
        </Text>

        {/* Title / Nom du médicament */}
        <Text style={productCardStyles.medTitle} numberOfLines={2}>
          {medName.toUpperCase()}
        </Text>

        {/* Price / Prix du médicament */}
        <Text style={productCardStyles.priceText}>
          {formatPrix.toUpperCase()}
        </Text>

        {/* Avatar Pharmacie avec bordure dorée (#D4AF37) sur le bord droit */}
        <TouchableOpacity
          style={productCardStyles.goldAvatarButton}
          onPress={() => onOpenPharmacyModal?.(pharmacyName, pharmacyPhoto)}
          activeOpacity={0.85}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image source={{ uri: pharmacyPhoto }} style={productCardStyles.goldAvatarImage} resizeMode="cover" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────

const productCardStyles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  imageSection: {
    height: 200,
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  svgWrapper: {
    width: '100%',
    height: '100%',
  },
  topCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  blueZoomButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D70B8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    width: '100%',
  },
  bodySection: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
  },
  pharmacySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  medTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  priceText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  goldAvatarButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3.2,
    borderColor: '#D4AF37',
    transform: [{ translateY: -26 }],
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  goldAvatarImage: {
    width: '100%',
    height: '100%',
  },
});

const styles = StyleSheet.create({
  compactContainer: {
    position: 'absolute',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    zIndex: 50,
    borderWidth: 1,
    borderColor: '#E9EDEF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  compactBarPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  compactInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTitle: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800', color: '#111B21' },
  compactCount: { flexShrink: 0, fontSize: 12, fontWeight: '700', color: '#667781' },
  compactOpenAction: {
    minHeight: 40,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: WhatsAppColors.whatsappGreen,
  },
  compactOpenText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  cardContainer: {
    position: 'absolute',
    bottom: 24, left: 12, right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24, overflow: 'hidden', zIndex: 50,
    borderWidth: 1, borderColor: '#E9EDEF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E9EDEF',
    alignSelf: 'center', marginTop: 8,
  },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E9EDEF',
    backgroundColor: '#FFFFFF',
  },
  listTitle: { fontSize: 18, fontWeight: '900', color: '#111B21' },
  listSubtitle: { fontSize: 12, color: '#667781', fontWeight: '600', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  reduceListButton: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#F0F2F5',
  },
  reduceListText: { fontSize: 12, fontWeight: '700', color: '#111B21' },
  showAllOnMapButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 12, marginBottom: 4, paddingVertical: 10, borderRadius: 12,
    backgroundColor: WhatsAppColors.whatsappGreen,
  },
  showAllOnMapText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  closeListButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0F2F5',
    alignItems: 'center', justifyContent: 'center',
  },
  listScroll: { flex: 1, minHeight: 0, backgroundColor: '#FFFFFF' },
  listScrollContent: { padding: 12, gap: 10 },
  loadingContainer: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 13, fontWeight: '600', color: '#667781' },
  emptyContainer: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: '#667781', textAlign: 'center' },
  pharmacyCardItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EDEF',
    borderRadius: 16, padding: 10, gap: 12,
  },
  itemAvatarWrapper: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  itemAvatar: { width: '100%', height: '100%' },
  itemAvatarFallback: { width: '100%', height: '100%', backgroundColor: '#E7FCE3', alignItems: 'center', justifyContent: 'center' },
  itemMainInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '800', color: '#111B21' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  itemLocation: { fontSize: 12, color: '#667781', fontWeight: '500' },
  itemDistance: { fontSize: 12, color: '#008069', fontWeight: '700' },
  dispoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
  dispoBadgeIn: { backgroundColor: '#E7FCE3' },
  dispoBadgeOut: { backgroundColor: '#FCE8E6' },
  dispoDot: { width: 6, height: 6, borderRadius: 3 },
  dispoDotIn: { backgroundColor: '#25D366' },
  dispoDotOut: { backgroundColor: '#EA4335' },
  dispoText: { fontSize: 11, fontWeight: '700' },
  dispoTextIn: { color: '#008069' },
  dispoTextOut: { color: '#C5221F' },
  itemPriceBadge: { backgroundColor: '#F0F2F5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  itemPriceText: { fontSize: 13, fontWeight: '900', color: '#111B21' },
  listFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F0F2F5', borderTopWidth: 1, borderTopColor: '#E9EDEF',
  },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingMoreContainer: { padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerHint: { fontSize: 11, color: '#667781', fontWeight: '500', flex: 1 },
});
