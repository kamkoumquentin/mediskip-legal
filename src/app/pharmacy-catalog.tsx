import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOffresParPharmacie, type Offre } from '@/utils/supabaseClient';

const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} FCFA`;

export default function PharmacyCatalog() {
  const { id, name, emplacement, photo } = useLocalSearchParams<{ id: string; name?: string; emplacement?: string; photo?: string }>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [offers, setOffers] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadCatalog = useCallback(async () => {
    if (!id || Number.isNaN(Number(id))) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getOffresParPharmacie(Number(id));
      setOffers((data ?? []) as unknown as Offre[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void Promise.resolve().then(loadCatalog); }, [loadCatalog]);

  const visibleOffers = offers.filter((offer) =>
    offer.medicament?.nom?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Retour" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#14332D" />
        </TouchableOpacity>
        {photo ? <Image source={{ uri: photo }} style={styles.pharmacyImage} /> : <View style={styles.pharmacyPlaceholder}><Ionicons name="business" size={22} color="#087E6B" /></View>}
        <View style={styles.pharmacyDetails}>
          <Text style={styles.pharmacyName} numberOfLines={1}>{name || 'Pharmacie'}</Text>
          {!!emplacement && <Text style={styles.location} numberOfLines={1}>{emplacement}</Text>}
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#5F6E69" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un médicament" placeholderTextColor="#7E8A86" style={styles.searchInput} returnKeyType="search" />
        {!!query && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={19} color="#7E8A86" /></TouchableOpacity>}
      </View>

      <View style={styles.titleRow}><Text style={styles.title}>Catalogue</Text><Text style={styles.count}>{visibleOffers.length}</Text></View>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}>
        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color="#087E6B" size="large" />
            <Text style={styles.stateText}>Chargement du catalogue...</Text>
          </View>
        ) : error ? (
          <View style={styles.state}><Text style={styles.stateText}>Le catalogue est indisponible.</Text><TouchableOpacity onPress={loadCatalog}><Text style={styles.retry}>Réessayer</Text></TouchableOpacity></View>
        ) : visibleOffers.length === 0 ? <View style={styles.state}><Text style={styles.stateText}>Aucun médicament disponible dans cette pharmacie.</Text></View> : visibleOffers.map((offer) => (
          <View key={offer.id} style={styles.item}>
            {offer.image ? <Image source={{ uri: offer.image }} style={styles.offerImage} /> : <View style={styles.offerPlaceholder}><Ionicons name="medkit-outline" size={22} color="#087E6B" /></View>}
            <View style={styles.itemDetails}>
              <Text style={styles.medicineName}>{offer.medicament?.nom || 'Médicament'}</Text>
              <Text style={offer.disponibilite === 'rupture' ? styles.unavailable : styles.available}>{offer.disponibilite === 'rupture' ? 'Rupture' : 'En stock'}</Text>
            </View>
            <Text style={styles.price}>{formatPrice(offer.prix)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9F8', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 20, gap: 12 },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  pharmacyImage: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EAF4F1' }, pharmacyPlaceholder: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EAF4F1', alignItems: 'center', justifyContent: 'center' },
  pharmacyDetails: { flex: 1 }, pharmacyName: { color: '#14332D', fontSize: 18, fontWeight: '800' }, location: { color: '#697772', fontSize: 13, marginTop: 3 },
  searchBox: { height: 52, borderRadius: 14, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: '#E3E9E6' }, searchInput: { flex: 1, color: '#14332D', fontSize: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }, title: { color: '#14332D', fontSize: 20, fontWeight: '800' }, count: { color: '#087E6B', fontWeight: '700' }, list: { gap: 10 },
  item: { backgroundColor: '#FFF', minHeight: 82, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, offerImage: { width: 54, height: 54, borderRadius: 10, backgroundColor: '#F0F3F2' }, offerPlaceholder: { width: 54, height: 54, borderRadius: 10, backgroundColor: '#EDF5F2', alignItems: 'center', justifyContent: 'center' },
  itemDetails: { flex: 1 }, medicineName: { color: '#14332D', fontSize: 15, fontWeight: '700' }, available: { color: '#188552', fontSize: 12, fontWeight: '700', marginTop: 5 }, unavailable: { color: '#B3261E', fontSize: 12, fontWeight: '700', marginTop: 5 }, price: { color: '#087E6B', fontSize: 15, fontWeight: '800' },
  state: { paddingVertical: 52, alignItems: 'center', gap: 10 }, stateText: { color: '#697772', textAlign: 'center' }, retry: { color: '#087E6B', fontWeight: '800' },
});
