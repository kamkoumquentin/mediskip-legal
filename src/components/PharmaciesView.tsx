import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WhatsAppColors } from '@/constants/theme';
import { calculateDistance, formatDistance } from '@/utils/geo';
import { getToutesPharmaciesActives, type Pharmacie } from '@/utils/supabaseClient';

import PharmacyMedicinesView from './PharmacyMedicinesView';

const PAGE_SIZE = 20;

type PharmacieAvecDistance = Pharmacie & { distance?: number | null };

/**
 * Valide des coordonnées GPS : rejette null/undefined/vide/non-numérique,
 * les valeurs hors plage et le couple (0,0). Renvoie les coords numériques
 * valides, ou null (la pharmacie ne doit alors jamais passer dans
 * `calculateDistance`).
 */
function coordonneesValides(lat: unknown, lon: unknown): { lat: number; lon: number } | null {
  const la = typeof lat === 'number' ? lat : parseFloat(String(lat ?? ''));
  const lo = typeof lon === 'number' ? lon : parseFloat(String(lon ?? ''));
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90) return null;
  if (lo < -180 || lo > 180) return null;
  if (la === 0 && lo === 0) return null;
  return { lat: la, lon: lo };
}

interface PharmaciesViewProps {
  userLocationCoords: [number, number] | null;
  onLocatePharmacy: (pharmacie: Pharmacie) => void;
  onBack: () => void;
  registerBack: (handler: (() => boolean) | null) => void;
}

export default function PharmaciesView({
  userLocationCoords,
  onLocatePharmacy,
  onBack,
  registerBack,
}: PharmaciesViewProps) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'android' ? 24 : 44) + 8;
  const bottomPadding = Math.max(insets.bottom, 24) + 16;

  const [query, setQuery] = useState('');
  const [pharmacies, setPharmacies] = useState<PharmacieAvecDistance[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacie | null>(null);

  // Garde anti-course : seule la dernière requête déclenchée peut écrire l'état.
  const generationRef = useRef(0);

  const userLatitude = userLocationCoords?.[1] ?? null;
  const userLongitude = userLocationCoords?.[0] ?? null;

  const avecPosition = userLatitude !== null && userLongitude !== null;

  const trier = useCallback((liste: PharmacieAvecDistance[]) => {
    return [...liste].sort((a, b) => {
      if (avecPosition) {
        const da = a.distance ?? null;
        const db = b.distance ?? null;
        if (da !== null && db !== null) return da - db;
        if (da !== null && db === null) return -1;
        if (da === null && db !== null) return 1;
      }
      return (a.nom || '').localeCompare(b.nom || '');
    });
  }, [avecPosition]);

  const charger = useCallback(async (nom: string) => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError(false);
    try {
      const data = await getToutesPharmaciesActives(nom);
      if (generation !== generationRef.current) return; // réponse périmée ignorée
      const avecDistance: PharmacieAvecDistance[] = data.map((p) => {
        const coords = coordonneesValides(p.latitude, p.longitude);
        const distance = coords && avecPosition
          ? calculateDistance(userLatitude, userLongitude, coords.lat, coords.lon)
          : null;
        return { ...p, distance };
      });
      setPharmacies(trier(avecDistance));
      setVisibleCount(PAGE_SIZE);
    } catch {
      if (generation === generationRef.current) setError(true);
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [avecPosition, userLatitude, userLongitude, trier]);

  // Recherche avec debounce + premier chargement
  useEffect(() => {
    const handle = setTimeout(() => {
      void charger(query);
    }, query ? 400 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Retour Android : médicaments → liste (renvoie true si géré)
  useEffect(() => {
    registerBack(() => {
      if (selectedPharmacy) {
        setSelectedPharmacy(null);
        return true;
      }
      return false;
    });
    return () => registerBack(null);
  }, [selectedPharmacy, registerBack]);

  if (selectedPharmacy) {
    return (
      <PharmacyMedicinesView
        pharmacie={selectedPharmacy}
        onLocatePharmacy={() => onLocatePharmacy(selectedPharmacy)}
        onBack={() => setSelectedPharmacy(null)}
      />
    );
  }

  const displayed = pharmacies.slice(0, visibleCount);

  const onEndReached = () => {
    if (loading || error) return;
    if (visibleCount >= pharmacies.length) return;
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, pharmacies.length));
  };

  const onRefresh = () => {
    setRefreshing(true);
    void charger(query);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pharmacies</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#667781" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher par nom"
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
        data={displayed}
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
          const distanceText = item.distance !== undefined && item.distance !== null
            ? formatDistance(item.distance)
            : null;
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => setSelectedPharmacy(item)}
            >
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={styles.logo} />
              ) : (
                <View style={styles.logoFallback}>
                  <Ionicons name="medkit" size={22} color={WhatsAppColors.whatsappGreen} />
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.nom || 'Pharmacie'}</Text>
                {!!item.emplacement && (
                  <View style={styles.miniRow}>
                    <Ionicons name="location-outline" size={12} color="#667781" />
                    <Text style={styles.cardLocation} numberOfLines={1}>{item.emplacement}</Text>
                  </View>
                )}
                {distanceText && (
                  <View style={styles.miniRow}>
                    <Ionicons name="navigate-outline" size={12} color={WhatsAppColors.whatsappGreen} />
                    <Text style={styles.cardDistance}>{distanceText}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8696A0" />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.state}>
              <ActivityIndicator size="large" color={WhatsAppColors.whatsappGreen} />
              <Text style={styles.stateText}>Chargement des pharmacies...</Text>
            </View>
          ) : error ? (
            <View style={styles.state}>
              <Ionicons name="alert-circle-outline" size={40} color="#8696A0" />
              <Text style={styles.stateText}>Impossible de charger les pharmacies.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => charger(query)}>
                <Text style={styles.retryText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.state}>
              <Ionicons name="business-outline" size={40} color="#8696A0" />
              <Text style={styles.stateText}>Aucune pharmacie disponible</Text>
            </View>
          )
        }
        ListFooterComponent={
          !loading && !error && displayed.length < pharmacies.length ? (
            <View style={styles.footerLoading}>
              <Text style={styles.stateText}>
                {displayed.length} / {pharmacies.length} pharmacie{pharmacies.length > 1 ? 's' : ''}
              </Text>
            </View>
          ) : null
        }
      />
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
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
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
  logo: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EAF4F1' },
  logoFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7FCE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '800', color: '#111B21' },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardLocation: { fontSize: 12, color: '#667781', fontWeight: '500', flexShrink: 1 },
  cardDistance: { fontSize: 12, color: WhatsAppColors.whatsappGreen, fontWeight: '700' },
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
});
