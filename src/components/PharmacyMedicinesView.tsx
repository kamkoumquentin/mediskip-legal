import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WhatsAppColors } from '@/constants/theme';
import { getValidPharmacyCoordinates } from '@/utils/geo';
import { getOffresParPharmaciePage, type Offre, type Pharmacie } from '@/utils/supabaseClient';

const PAGE_SIZE = 20;

const formatPrice = (price: number) => `${Number(price).toLocaleString('fr-FR')} FCFA`;

interface PharmacyMedicinesViewProps {
  pharmacie: Pharmacie;
  onLocatePharmacy: () => void;
  onBack: () => void;
}

export default function PharmacyMedicinesView({ pharmacie, onLocatePharmacy, onBack }: PharmacyMedicinesViewProps) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'android' ? 24 : 44) + 8;
  const bottomPadding = Math.max(insets.bottom, 24) + 16;

  const [query, setQuery] = useState('');
  const [offres, setOffres] = useState<Offre[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Visionneuse plein écran de la photo du médicament
  const [photoItem, setPhotoItem] = useState<Offre | null>(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const hasValidCoordinates = getValidPharmacyCoordinates(pharmacie.latitude, pharmacie.longitude) !== null;

  const openPhoto = useCallback((item: Offre) => {
    setPhotoLoaded(false);
    setPhotoError(false);
    setPhotoItem(item);
  }, []);

  const closePhoto = useCallback(() => setPhotoItem(null), []);

  const pageRef = useRef(0);
  const loadingRef = useRef(false);

  const charger = useCallback(async (reset: boolean, nom: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const page = reset ? 0 : pageRef.current;
    if (reset) setLoading(true); else setLoadingMore(true);
    setError(false);
    try {
      const { data, count } = await getOffresParPharmaciePage({
        idPharmacie: pharmacie.id,
        recherche: nom.trim() || null,
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setTotal(count);
      pageRef.current = page + 1;
      setOffres((prev) => (reset ? (data as unknown as Offre[]) : [...prev, ...(data as unknown as Offre[])]));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [pharmacie.id]);

  useEffect(() => {
    const handle = setTimeout(() => {
      pageRef.current = 0;
      void charger(true, query);
    }, query ? 400 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pharmacie.id]);

  const onEndReached = () => {
    if (loading || loadingMore || error) return;
    if (offres.length >= total) return;
    void charger(false, query);
  };

  const onRefresh = () => {
    setRefreshing(true);
    pageRef.current = 0;
    void charger(true, query);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle} numberOfLines={1}>{pharmacie.nom || 'Pharmacie'}</Text>
          {!!pharmacie.emplacement && (
            <Text style={styles.headerSub} numberOfLines={1}>{pharmacie.emplacement}</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.locateButton, !hasValidCoordinates && styles.locateButtonDisabled]}
        onPress={onLocatePharmacy}
        disabled={!hasValidCoordinates}
        activeOpacity={0.8}
      >
        <Ionicons
          name="locate-outline"
          size={18}
          color={hasValidCoordinates ? WhatsAppColors.whatsappGreen : '#8696A0'}
        />
        <Text style={[styles.locateButtonText, !hasValidCoordinates && styles.locateButtonTextDisabled]}>
          {hasValidCoordinates ? 'Localiser sur la carte' : 'Position de la pharmacie non disponible'}
        </Text>
      </TouchableOpacity>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#667781" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un médicament"
          placeholderTextColor="#8696A0"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#8696A0" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={offres}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={WhatsAppColors.whatsappGreen}
            colors={[WhatsAppColors.whatsappGreen]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          const isAvailable = item.disponibilite !== 'rupture';
          return (
            <View style={styles.card}>
              {item.image ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => openPhoto(item)}>
                  <Image source={{ uri: item.image }} style={styles.offerImage} />
                </TouchableOpacity>
              ) : (
                <View style={styles.offerPlaceholder}>
                  <Ionicons name="medkit-outline" size={22} color={WhatsAppColors.whatsappGreen} />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.medName} numberOfLines={2}>{item.medicament?.nom || 'Médicament'}</Text>
                <View style={[styles.dispoBadge, isAvailable ? styles.dispoBadgeIn : styles.dispoBadgeOut]}>
                  <View style={[styles.dispoDot, isAvailable ? styles.dispoDotIn : styles.dispoDotOut]} />
                  <Text style={[styles.dispoText, isAvailable ? styles.dispoTextIn : styles.dispoTextOut]}>
                    {isAvailable ? 'En stock' : 'Rupture'}
                  </Text>
                </View>
              </View>
              <Text style={styles.price}>{formatPrice(item.prix)}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.state}>
              <ActivityIndicator size="large" color={WhatsAppColors.whatsappGreen} />
              <Text style={styles.stateText}>Chargement du catalogue...</Text>
            </View>
          ) : error ? (
            <View style={styles.state}>
              <Ionicons name="alert-circle-outline" size={40} color="#8696A0" />
              <Text style={styles.stateText}>Le catalogue est indisponible.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => charger(true, query)}>
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.state}>
              <Ionicons name="medkit-outline" size={40} color="#8696A0" />
              <Text style={styles.stateText}>Aucun médicament disponible dans cette pharmacie.</Text>
            </View>
          )
        }
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator size="small" color={WhatsAppColors.whatsappGreen} />
            <Text style={styles.stateText}>Chargement de la suite...</Text>
          </View>
        ) : null}
      />

      {/* Visionneuse photo plein écran (Modal imbriqué : le retour Android la ferme en premier) */}
      <Modal
        visible={!!photoItem}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePhoto}
      >
        <TouchableWithoutFeedback onPress={closePhoto}>
          <View style={styles.fullScreen}>
            <TouchableOpacity
              style={styles.fullScreenClose}
              onPress={closePhoto}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Fermer la photo"
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.fullScreenImageArea}>
              <TouchableWithoutFeedback>
                <View style={styles.fullScreenImageBox}>
                  {photoItem?.image && !photoError ? (
                    <>
                      {!photoLoaded && (
                        <View style={StyleSheet.absoluteFill} pointerEvents="none">
                          <ActivityIndicator size="large" color="#FFFFFF" />
                        </View>
                      )}
                      <Image
                        source={{ uri: photoItem.image }}
                        style={[styles.fullScreenImage, !photoLoaded && { opacity: 0 }]}
                        resizeMode="contain"
                        onLoadStart={() => { setPhotoLoaded(false); setPhotoError(false); }}
                        onLoadEnd={() => setPhotoLoaded(true)}
                        onError={() => { setPhotoError(true); setPhotoLoaded(true); }}
                      />
                    </>
                  ) : (
                    <View style={styles.fullScreenPlaceholder}>
                      <Ionicons name="image-outline" size={56} color="#8696A0" />
                      <Text style={styles.fullScreenPlaceholderText}>Photo non disponible</Text>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>

            <View style={styles.fullScreenFooter}>
              <Text style={styles.fullScreenName} numberOfLines={2}>
                {photoItem?.medicament?.nom || 'Médicament'}
              </Text>
              {!!photoItem && (
                <Text style={styles.fullScreenPrice}>{formatPrice(photoItem.prix)}</Text>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: {
    backgroundColor: WhatsAppColors.whatsappTeal,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  headerSub: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginTop: 2 },
  locateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EDEF',
  },
  locateButtonDisabled: { opacity: 0.7 },
  locateButtonText: { flex: 1, color: WhatsAppColors.whatsappGreen, fontSize: 13, fontWeight: '700' },
  locateButtonTextDisabled: { color: '#667781' },
  searchBox: {
    height: 48,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EDEF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#111B21', fontSize: 15 },
  listContent: { padding: 12, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EDEF',
    borderRadius: 16,
    padding: 10,
    gap: 12,
  },
  offerImage: { width: 54, height: 54, borderRadius: 10, backgroundColor: '#F0F3F2' },
  offerPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#EDF5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: '700', color: '#111B21' },
  dispoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginTop: 6,
  },
  dispoBadgeIn: { backgroundColor: '#E7FCE3' },
  dispoBadgeOut: { backgroundColor: '#FCE8E6' },
  dispoDot: { width: 6, height: 6, borderRadius: 3 },
  dispoDotIn: { backgroundColor: '#25D366' },
  dispoDotOut: { backgroundColor: '#EA4335' },
  dispoText: { fontSize: 11, fontWeight: '700' },
  dispoTextIn: { color: '#008069' },
  dispoTextOut: { color: '#C5221F' },
  price: { fontSize: 14, fontWeight: '900', color: '#111B21' },
  state: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { fontSize: 13, color: '#667781', textAlign: 'center', fontWeight: '600' },
  retryButton: {
    backgroundColor: WhatsAppColors.whatsappGreen,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  footerLoading: { padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  fullScreen: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  fullScreenImageBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  fullScreenPlaceholderText: {
    color: '#8696A0',
    fontSize: 14,
    fontWeight: '600',
  },
  fullScreenFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 24 : 32,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  fullScreenName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  fullScreenPrice: {
    color: '#4ADE80',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
});
