import { WhatsAppColors } from '@/constants/theme';
import { APP_NAME } from '@/constants/app';
import { calculateDistance, getValidPharmacyCoordinates } from '@/utils/geo';
import {
    attendrePreparationOAuth,
    hasOAuthIdentity,
    signInWithFacebook,
    signInWithGoogle,
    synchroniserIdentiteOAuth,
} from '@/utils/oauth';
import {
    attendreProfilUtilisateur,
    connexionUtilisateur,
    enregistrerConsultation,
    enregistrerHistoriqueRecherche,
    inscriptionUtilisateur,
    rechercherOffresMedicaments,
    supabase
} from '@/utils/supabaseClient';
import type { Pharmacie } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { Camera, Map, Marker, UserLocation } from '@maplibre/maplibre-react-native';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import type { User as AuthUser } from '@supabase/supabase-js';
import { FunctionsHttpError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated, Dimensions,
    BackHandler,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MedicineModal from '@/components/MedicineModal';
import PharmacyModal from '@/components/PharmacyModal';
import { PharmacyCallout } from '@/components/PharmacyCallout';
import PharmacyProductSheet from '@/components/PharmacyProductSheet';
import ResultsPanel from '@/components/ResultsPanel';
import SearchBar, { getSearchBarTop, SEARCH_BAR_HEIGHT } from '@/components/SearchBar';
import SideDrawer from '@/components/SideDrawer';
import { PharmacyPin } from '@/components/PharmacyPin';
import { useCompactBarMetrics } from '@/hooks/use-compact-bar-metrics';
import { configuredMapStyle } from '@/config/mapStyle';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface UserType {
  id: number;
  authId: string;
  name: string;
  email?: string;
  photo?: string;
  phone?: string;
}

export interface PharmacyItem {
  id: string;
  boutique: string;
  nom: string;
  longitude: number;
  latitude: number;
  prix: string;
  disponibilite: 'en_stock' | 'rupture';
  colorStart: string;
  colorEnd: string;
  strength: string;
  pharmacie: {
    nom: string;
    emplacement: string;
    photo: string;
  };
  medicament: {
    nom: string;
    forme: string;
    laboratoire: string;
  };
  distance?: number | null;
  image?: string;
  id_offre?: number;
  id_pharmacie?: number;
  id_medicament?: number;
}

type FeaturedPharmacy =
  | { source: 'search'; id: PharmacyItem['id'] }
  | { source: 'located'; id: Pharmacie['id'] };

// ─────────────────────────────────────────────────────────
// CONSTANTES DE CARTE
// ─────────────────────────────────────────────────────────

export default function Home() {
  // ── Navigation & Auth ──────────────────────────────────
  const [user, setUser] = useState<UserType | null>(null);
  const userRef = useRef<UserType | null>(null);
  const promptedOAuthEmailUsers = useRef(new Set<string>());
  userRef.current = user;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState('menu');

  useEffect(() => {
    console.log('[index] mounted');
    return () => {
      console.log('[index] unmounted');
    };
  }, []);

  useEffect(() => {
    console.log('[index] isMenuOpen changed', isMenuOpen);
  }, [isMenuOpen]);

  useEffect(() => {
    console.log('[index] menuView changed', menuView);
  }, [menuView]);

  useEffect(() => {
    if (user && (menuView === 'login' || menuView === 'register')) {
      setMenuView('menu');
    }
  }, [user, menuView]);

  console.log('[index] initial menu state', { isMenuOpen, menuView, hasUser: !!user });

  // ── Recherche & Sélection ──────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PharmacyItem[]>([]);
  const [totalSearchResults, setTotalSearchResults] = useState(0);
  const [isLoadingMoreResults, setIsLoadingMoreResults] = useState(false);
  const loadingMoreResultsRef = useRef(false);
  const searchGenerationRef = useRef(0);
  const activeSearchRef = useRef<{
    query: string;
    latitude: number | null;
    longitude: number | null;
  } | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<PharmacyItem | null>(null);
  const [pharmacieChoisie, setPharmacieChoisie] = useState<PharmacyItem | null>(null);
  const [pharmacieLocalisee, setPharmacieLocalisee] = useState<Pharmacie | null>(null);
  const [featuredPharmacy, setFeaturedPharmacy] = useState<FeaturedPharmacy | null>(null);
  const [toutAfficher, setToutAfficher] = useState(false);
  const [isResultsPanelCompact, setIsResultsPanelCompact] = useState(false);
  const marqueursPharmacie = useMemo(
    () => toutAfficher ? searchResults : pharmacieChoisie ? [pharmacieChoisie] : [],
    [pharmacieChoisie, toutAfficher, searchResults],
  );
  const pharmacieLocaliseeCoords = pharmacieLocalisee
    ? getValidPharmacyCoordinates(pharmacieLocalisee.latitude, pharmacieLocalisee.longitude)
    : null;

  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(true); // Contrôle de la carte du produit
  const [isPanelVisible, setIsPanelVisible] = useState(false); // Contrôle de la liste des pharmacies
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // ── Modales ────────────────────────────────────────────
  const [isPharmacyModalOpen, setIsPharmacyModalOpen] = useState(false);
  const [pharmacyModalData, setPharmacyModalData] = useState<any>(null);
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [medicineModalData, setMedicineModalData] = useState<any>(null);

  // ── Profil ─────────────────────────────────────────────
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword] = useState('');
  const [profileLanguage, setProfileLanguage] = useState('Français');
  const [allowDataCollection, setAllowDataCollection] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  // ── Notifications & Historique ─────────────────────────
  const [notifications, setNotifications] = useState<{ id: string; type: 'important' | 'info'; title: string; desc: string; time: string }[]>([]);
  const [historyItems, setHistoryItems] = useState<string[]>([]);

  // ── Carte & GPS ────────────────────────────────────────
  const [userLocationCoords, setUserLocationCoords] = useState<[number, number] | null>(null);
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [camera, setCamera] = useState({
    centerCoordinate: [10.4144, 5.4830] as [number, number],
    zoomLevel: 13.5,
    animationDuration: 1800,
  });
  const [allowRotation, setAllowRotation] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isManualMove, setIsManualMove] = useState(false);

  // ── Animations ─────────────────────────────────────────
  const compassSpinAnim = useMemo(() => new Animated.Value(0), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  const insets = useSafeAreaInsets();
  const compactBarMetrics = useCompactBarMetrics();
  const { height: screenHeight } = Dimensions.get('window');

  // Ring pulsant autour du marqueur sélectionné
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const applyAuthUser = useCallback(async (authUser: AuthUser | null) => {
    if (!authUser) {
      setUser(null);
      return;
    }

    try {
      const callbackPrepared = await attendrePreparationOAuth(authUser.id);
      if (hasOAuthIdentity(authUser) && !callbackPrepared) {
        await synchroniserIdentiteOAuth();
      }

      const profil = await attendreProfilUtilisateur(authUser.id);
      if (!profil?.id) {
        console.warn('Profil utilisateur introuvable (auth_id=' + authUser.id + ').');
        setUser(null);
        return;
      }

      const profilName = [profil.nom, profil.prenom].filter(Boolean).join(' ').trim();

      setUser({
        id: profil.id,
        authId: authUser.id,
        name: profilName,
        email: profil.email || undefined,
        photo: profil.photo || undefined,
        phone: authUser.phone || undefined,
      });
      setProfileName(profilName);
      setProfileEmail(profil.email || '');
      setProfilePhone(authUser.phone || '');
      if (!authUser.email && hasOAuthIdentity(authUser) && !promptedOAuthEmailUsers.current.has(authUser.id)) {
        promptedOAuthEmailUsers.current.add(authUser.id);
        Alert.alert('Profil incomplet', 'Ce fournisseur n’a pas transmis d’e-mail. Ajoutez une adresse e-mail dans vos paramètres avant d’utiliser les services qui en ont besoin.');
      }
    } catch (err) {
      console.warn('Erreur chargement profil session :', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getLastKnownPositionAsync();
          if (loc?.coords) {
            setUserLocationCoords([loc.coords.longitude, loc.coords.latitude]);
            setIsLocationActive(true);
          }
        }
      } catch { /* Ignorer */ }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let generation = 0;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[index] onAuthStateChange', { event, sessionUser: !!session?.user, userId: session?.user?.id ?? null });

      if (event === 'TOKEN_REFRESHED') {
        if (!session?.user) {
          setUser(null);
          return;
        }
        if (!userRef.current?.id) {
          const gen = ++generation;
          setTimeout(() => {
            if (cancelled || gen !== generation) return;
            void applyAuthUser(session.user);
          }, 0);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        generation += 1;
        setUser(null);
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const gen = ++generation;
        const authUser = session?.user ?? null;
        setTimeout(() => {
          if (cancelled || gen !== generation) return;
          void applyAuthUser(authUser);
        }, 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applyAuthUser]);

  // Clavier
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardOffset(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOffset(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ─────────────────────────────────────────────────────────
  // 1. RECHERCHE MÉDICAMENT -> OUVRE LA LISTE DES PHARMACIES (TRI PAR DISTANCE CROISSANTE)
  // ─────────────────────────────────────────────────────────

  const formatSearchResults = useCallback((
    items: any[],
    query: string,
    latitude: number | null,
    longitude: number | null,
  ): PharmacyItem[] => items.map((item: any, idx: number) => ({
    id: String(item.id_offre || item.id || idx + 1),
    boutique: item.pharmacie_nom || item.nom_pharmacie || '',
    nom: item.medicament_nom || item.nom_medicament || '',
    longitude: Number(item.longitude ?? item.lon_pharmacie),
    latitude: Number(item.latitude ?? item.lat_pharmacie),
    prix: item.prix ? `${Number(item.prix).toLocaleString('fr-FR')} FCFA` : '',
    disponibilite: (item.disponibilite === 'rupture' ? 'rupture' : 'en_stock') as 'en_stock' | 'rupture',
    colorStart: item.disponibilite === 'rupture' ? '#ef4444' : '#0d9488',
    colorEnd: item.disponibilite === 'rupture' ? '#b91c1c' : '#0f766e',
    strength: item.forme || '',
    pharmacie: {
      nom: item.pharmacie_nom || item.nom_pharmacie || '',
      emplacement: item.emplacement || item.emplacement_pharmacie || '',
      photo: item.pharmacie_photo || item.photo_pharmacie || '',
    },
    medicament: {
      nom: item.medicament_nom || item.nom_medicament || query,
      forme: item.forme || '',
      laboratoire: item.laboratoire || '',
    },
    distance: typeof item.distance_km === 'number'
      ? item.distance_km
      : calculateDistance(latitude, longitude, Number(item.latitude), Number(item.longitude)),
    image: item.image || undefined,
    id_offre: item.id_offre || item.id,
    id_pharmacie: item.id_pharmacie || item.pharmacie_id,
    id_medicament: item.id_medicament,
  })), []);

  const handlePerformSearch = useCallback(async (overrideQuery?: string) => {
    setIsResultsPanelCompact(false);
    const query = (typeof overrideQuery === 'string' ? overrideQuery : searchQuery).trim().toLowerCase();

    if (!query) {
      Alert.alert('Recherche', "Veuillez saisir le nom d'un médicament.");
      return;
    }

    const searchGeneration = ++searchGenerationRef.current;
    loadingMoreResultsRef.current = false;
    setIsLoadingMoreResults(false);
    setIsLocationActive(true);
    setAllowRotation(false);
    setIsLoadingSearch(true);
    setPharmacieLocalisee(null);
    setFeaturedPharmacy(null);
    setSelectedOffer(null);
    setPharmacieChoisie(null);
    setToutAfficher(false);
    setIsPopupOpen(false);
    
    setIsPanelVisible(true); // Ouvre le panneau immédiatement pour montrer le loading
    setSearchResults([]); // Vide les anciens résultats pour ne pas les afficher avec le loading
    setTotalSearchResults(0);
    const searchLatitude = userLocationCoords?.[1] ?? null;
    const searchLongitude = userLocationCoords?.[0] ?? null;
    activeSearchRef.current = {
      query,
      latitude: searchLatitude,
      longitude: searchLongitude,
    };

    let formattedResults: PharmacyItem[] = [];
    let resultCount = 0;

    try {
      const resultPage = await rechercherOffresMedicaments({
        recherche: query,
        latitude: userLocationCoords?.[1] ?? null,
        longitude: userLocationCoords?.[0] ?? null,
        offset: 0,
        limit: 20,
      });
      formattedResults = formatSearchResults(resultPage.data, query, searchLatitude, searchLongitude);
      resultCount = resultPage.count;

      if (searchGeneration !== searchGenerationRef.current) return;

      setTotalSearchResults(resultCount);
      // Tri strict par ordre de distance croissant
      formattedResults.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      setSearchResults(formattedResults);

      if (!historyItems.includes(query)) {
        setHistoryItems(prev => [query, ...prev.slice(0, 9)]);
      }
      enregistrerHistoriqueRecherche({
        recherche: query,
        idUtilisateur: user?.id ?? null,
        latitude: userLocationCoords?.[1] ?? null,
        longitude: userLocationCoords?.[0] ?? null,
      });

      if (formattedResults.length > 0) {
        const first = formattedResults[0];
        setIsManualMove(false);
        setCamera({ centerCoordinate: [first.longitude, first.latitude], zoomLevel: 14.5, animationDuration: 1500 });
      } else {
        Alert.alert('Information', 'Aucune officine trouvée pour votre recherche.');
      }
    } catch (err) {
      if (searchGeneration !== searchGenerationRef.current) return;
      setSearchResults([]);
      setTotalSearchResults(0);
      console.warn('Recherche Supabase :', err);
    } finally {
      if (searchGeneration === searchGenerationRef.current) setIsLoadingSearch(false);
    }
  }, [searchQuery, userLocationCoords, historyItems, user, formatSearchResults]);

  const handleLoadMoreResults = useCallback(async () => {
    const activeSearch = activeSearchRef.current;
    if (!activeSearch || loadingMoreResultsRef.current || searchResults.length >= totalSearchResults) return;

    const searchGeneration = searchGenerationRef.current;
    loadingMoreResultsRef.current = true;
    setIsLoadingMoreResults(true);
    try {
      const params = {
        offset: searchResults.length,
        limit: 20,
        latitude: activeSearch.latitude,
        longitude: activeSearch.longitude,
      };
      const resultPage = await rechercherOffresMedicaments({ ...params, recherche: activeSearch.query });
      if (searchGeneration !== searchGenerationRef.current) return;
      const nextResults = formatSearchResults(
        resultPage.data,
        activeSearch.query,
        activeSearch.latitude,
        activeSearch.longitude,
      );
      setSearchResults((currentResults) => [...currentResults, ...nextResults]
        .sort((a, b) => (a.distance || 999) - (b.distance || 999)));
      setTotalSearchResults(resultPage.count);
    } catch (err) {
      if (searchGeneration !== searchGenerationRef.current) return;
      console.warn('Chargement des résultats suivants :', err);
      Alert.alert('Recherche', 'Impossible de charger les résultats suivants. Veuillez réessayer.');
    } finally {
      if (searchGeneration === searchGenerationRef.current) {
        loadingMoreResultsRef.current = false;
        setIsLoadingMoreResults(false);
      }
    }
  }, [searchResults.length, totalSearchResults, formatSearchResults]);

  const handleShowAllResultsOnMap = useCallback(async () => {
    if (toutAfficher) {
      setToutAfficher(false);
      setIsResultsPanelCompact(true);
      if (selectedOffer) {
        setIsManualMove(false);
        setCamera({
          centerCoordinate: [selectedOffer.longitude, selectedOffer.latitude],
          zoomLevel: 16,
          animationDuration: 1600,
        });
      }
      return;
    }

    const activeSearch = activeSearchRef.current;
    if (!activeSearch || loadingMoreResultsRef.current) return;

    const searchGeneration = searchGenerationRef.current;
    loadingMoreResultsRef.current = true;
    setIsLoadingMoreResults(true);
    try {
      let allResults = searchResults;
      while (allResults.length < totalSearchResults) {
        const params = {
          offset: allResults.length,
          limit: 20,
          latitude: activeSearch.latitude,
          longitude: activeSearch.longitude,
        };
        const resultPage = await rechercherOffresMedicaments({ ...params, recherche: activeSearch.query });
        if (searchGeneration !== searchGenerationRef.current) return;
        const nextResults = formatSearchResults(
          resultPage.data,
          activeSearch.query,
          activeSearch.latitude,
          activeSearch.longitude,
        );
        if (nextResults.length === 0) {
          throw new Error('La recherche n’a retourné aucun résultat pour la page suivante.');
        }
        allResults = [...allResults, ...nextResults];
        setTotalSearchResults(resultPage.count);
      }

      if (searchGeneration !== searchGenerationRef.current) return;
      const locatedResults = allResults.filter((item) => (
        getValidPharmacyCoordinates(item.latitude, item.longitude) !== null
      ));
      if (locatedResults.length === 0) {
        Alert.alert('Carte indisponible', 'Impossible d’afficher les pharmacies sur la carte.');
        return;
      }
      const validUserLocation = userLocationCoords
        && Number.isFinite(userLocationCoords[0])
        && userLocationCoords[0] >= -180
        && userLocationCoords[0] <= 180
        && Number.isFinite(userLocationCoords[1])
        && userLocationCoords[1] >= -90
        && userLocationCoords[1] <= 90
        ? userLocationCoords
        : null;
      const median = (values: number[]) => {
        const sortedValues = [...values].sort((a, b) => a - b);
        const middleIndex = Math.floor(sortedValues.length / 2);
        return sortedValues.length % 2 === 0
          ? (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2
          : sortedValues[middleIndex];
      };
      const medianLatitude = median(locatedResults.map((item) => item.latitude));
      const medianLongitude = median(locatedResults.map((item) => item.longitude));
      if (validUserLocation) {
        const gpsToMedian = calculateDistance(medianLatitude, medianLongitude, validUserLocation[1], validUserLocation[0]);
        console.info(`[Carte] Distance GPS ↔ médiane des pharmacies : ${gpsToMedian === null ? 'inconnue' : gpsToMedian.toFixed(1) + ' km'}`);
      }
      const filteredResults = locatedResults.filter((item) => {
        const distance = calculateDistance(medianLatitude, medianLongitude, item.latitude, item.longitude);
        return distance !== null && distance <= 50;
      });
      let resultsForBounds: { longitude: number; latitude: number }[] = filteredResults;
      if (filteredResults.length === 0) {
        console.warn('[Carte] Le filtre de 50 km a exclu tous les résultats ; cadrage avec toutes les pharmacies aux coordonnées valides.');
        resultsForBounds = locatedResults;
      } else if (locatedResults.length > filteredResults.length) {
        console.info(`[Carte] ${locatedResults.length - filteredResults.length} résultat(s) ignoré(s), à plus de 50 km de la médiane.`);
      }
      const camera = cameraRef.current;
      if (!camera) throw new Error('La caméra de la carte n’est pas disponible.');

      if (validUserLocation) {
        const gpsToMedian = calculateDistance(medianLatitude, medianLongitude, validUserLocation[1], validUserLocation[0]);
        if (gpsToMedian !== null && gpsToMedian <= 50) {
          resultsForBounds = [
            ...resultsForBounds,
            { longitude: validUserLocation[0], latitude: validUserLocation[1] },
          ];
        } else {
          console.info('[Carte] Position GPS ignorée du cadrage (à plus de 50 km de la médiane des pharmacies).');
        }
      }
      const west = Math.min(...resultsForBounds.map((item) => item.longitude));
      const south = Math.min(...resultsForBounds.map((item) => item.latitude));
      const east = Math.max(...resultsForBounds.map((item) => item.longitude));
      const north = Math.max(...resultsForBounds.map((item) => item.latitude));
      const validBounds = Number.isFinite(west)
        && Number.isFinite(south)
        && Number.isFinite(east)
        && Number.isFinite(north)
        && west >= -180
        && east <= 180
        && south >= -90
        && north <= 90
        && west <= east
        && south <= north;
      if (!validBounds) {
        Alert.alert('Carte indisponible', 'Impossible d’afficher les pharmacies sur la carte.');
        return;
      }

      setSearchResults(allResults.sort((a, b) => (a.distance || 999) - (b.distance || 999)));
      setToutAfficher(true);
      setIsResultsPanelCompact(true);
      setIsManualMove(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (searchGeneration !== searchGenerationRef.current) return;

      const cameraPadding = {
        top: getSearchBarTop(insets.top, Platform.OS === 'android') + SEARCH_BAR_HEIGHT + 16,
        right: 48,
        bottom: compactBarMetrics.cameraPaddingBottom,
        left: 48,
      };
      if (west === east && south === north) {
        if (!Number.isFinite(west) || !Number.isFinite(south)
          || west < -180 || west > 180 || south < -90 || south > 90) {
          throw new Error('Les coordonnées du résultat ne sont pas valides.');
        }
        await camera.setStop({
          center: [west, south],
          zoom: 14.5,
          duration: 1200,
          easing: 'fly',
          padding: cameraPadding,
        });
      } else {
        await camera.setStop({
          bounds: [west, south, east, north],
          duration: 1200,
          easing: 'fly',
          padding: cameraPadding,
        });
        const fittedZoom = await mapRef.current?.getZoom?.();
        if (typeof fittedZoom === 'number' && Number.isFinite(fittedZoom)
          && (fittedZoom < 4 || fittedZoom > 16)) {
          const clampedZoom = Math.min(16, Math.max(4, fittedZoom));
          const fittedCenter = await mapRef.current?.getCenter?.();
          await camera.setStop({
            center: fittedCenter ?? [(west + east) / 2, (south + north) / 2],
            zoom: clampedZoom,
            duration: 300,
            easing: 'ease',
            padding: cameraPadding,
          });
        }
      }
      if (searchGeneration !== searchGenerationRef.current) return;

    } catch (err) {
      if (searchGeneration !== searchGenerationRef.current) return;
      setToutAfficher(false);
      console.warn('Impossible de charger ou cadrer les pharmacies sur la carte :', err);
      Alert.alert('Carte indisponible', 'Impossible d’afficher les pharmacies sur la carte.');
    } finally {
      if (searchGeneration === searchGenerationRef.current) {
        loadingMoreResultsRef.current = false;
        setIsLoadingMoreResults(false);
      }
    }
  }, [toutAfficher, selectedOffer, searchResults, totalSearchResults, formatSearchResults, compactBarMetrics.cameraPaddingBottom, userLocationCoords, insets.top]);

  const mapRef = useRef<any>(null);
  const cameraRef = useRef<CameraRef | null>(null);
  const isOpeningPharmacyCatalogRef = useRef(false);

  useFocusEffect(useCallback(() => {
    isOpeningPharmacyCatalogRef.current = false;
  }, []));

  // ─────────────────────────────────────────────────────────
  // 2. SÉLECTION D'UNE PHARMACIE :
  // - IDENTIFIE SON MARQUEUR SUR LA CARTE ET CENTRE LA CARTE DESSUS
  // - LA FICHE PRODUIT RESTE FERMÉE (OUVERTURE UNIQUEMENT AU CLIC MARQUEUR)
  // ─────────────────────────────────────────────────────────

  const handleSelectPharmacy = useCallback((item: PharmacyItem) => {
    setPharmacieChoisie(item);
    setFeaturedPharmacy({ source: 'search', id: item.id });
    setToutAfficher(false);
    setIsResultsPanelCompact(true);
    setSelectedOffer(item);
    
    setIsPopupOpen(false);    // LA FICHE PRODUIT RESTE FERMÉE LORS DE LA SÉLECTION
    setIsManualMove(false);

    // Centrage de la carte sur le marqueur sélectionné avec un zoom élevé (16.5)
    setCamera({
      centerCoordinate: [item.longitude, item.latitude],
      zoomLevel: 16.5,
      animationDuration: 1600,
    });

    enregistrerConsultation({
      idUtilisateur: user?.id ?? null,
      idMedicament: item.id_medicament ? Number(item.id_medicament) : null,
      idPharmacie: item.id_pharmacie ? Number(item.id_pharmacie) : null,
      latitude: userLocationCoords?.[1] ?? null,
      longitude: userLocationCoords?.[0] ?? null,
    });
    
  }, [user, userLocationCoords]);

  // Annuler la sélection (revenir à la liste complète des pharmacies)
  const handleClearSelectedOffer = useCallback(() => {
    setIsPopupOpen(false);
    setTimeout(() => {
      setSelectedOffer(null);
      setPharmacieChoisie(null);
      setFeaturedPharmacy(null);
      setToutAfficher(false);
      setIsResultsPanelCompact(false);
      setIsPanelVisible(true); // Réouvre la liste des pharmacies
    }, 250);
  }, []);

  const handleOpenCatalog = useCallback((
    id: number | null | undefined,
    pharmacie: { nom: string; emplacement: string; photo: string },
  ) => {
    if (typeof id !== 'number' || !Number.isFinite(id) || isOpeningPharmacyCatalogRef.current) return;
    isOpeningPharmacyCatalogRef.current = true;
    setIsMenuOpen(false);
    router.push({
      pathname: '/pharmacy-catalog' as never,
      params: {
        id: String(id),
        name: pharmacie.nom,
        emplacement: pharmacie.emplacement,
        photo: pharmacie.photo || '',
      },
    });
  }, []);

  const handleDirections = useCallback((item: PharmacyItem) => {
    setIsPopupOpen(false);
    Linking.openURL(`geo:${item.latitude},${item.longitude}?q=${item.latitude},${item.longitude}`);
  }, []);

  const fermerPanneau = useCallback(() => {
    setIsPanelVisible(false);
    setIsResultsPanelCompact(false);
    setPharmacieChoisie(null);
    setToutAfficher(false);
    setSelectedOffer(null);
    setIsPopupOpen(false);
    setPharmacieLocalisee(null);
    setFeaturedPharmacy(null);
  }, []);

  const handleLocatePharmacy = useCallback((pharmacie: Pharmacie) => {
    const coordinates = getValidPharmacyCoordinates(pharmacie.latitude, pharmacie.longitude);
    if (!coordinates) {
      Alert.alert('Position indisponible', 'Position de la pharmacie non disponible');
      return;
    }

    searchGenerationRef.current += 1;
    activeSearchRef.current = null;
    loadingMoreResultsRef.current = false;
    setIsLoadingSearch(false);
    setIsLoadingMoreResults(false);
    fermerPanneau();
    setSearchResults([]);
    setTotalSearchResults(0);
    setPharmacieLocalisee(pharmacie);
    setFeaturedPharmacy({ source: 'located', id: pharmacie.id });
    setIsManualMove(false);
    setCamera({
      centerCoordinate: [coordinates.longitude, coordinates.latitude],
      zoomLevel: 16,
      animationDuration: 1200,
    });
    setIsMenuOpen(false);
  }, [fermerPanneau]);

  useEffect(() => {
    if (!pharmacieLocalisee || isMenuOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [pharmacieLocalisee, isMenuOpen]);

  // Géolocalisation & Boussole
  const handleGeolocate = useCallback(async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission GPS', "Accès GPS refusé."); return; }
      let location: Location.LocationObject | null = null;
      try { location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); }
      catch { try { location = await Location.getLastKnownPositionAsync(); } catch { /* ignore */ } }

      if (!location?.coords) {
        Alert.alert('Erreur GPS', 'Position GPS indisponible.');
        return;
      }
      const coords: [number, number] = [location.coords.longitude, location.coords.latitude];

      setUserLocationCoords(coords);
      setIsLocationActive(true);
      setIsManualMove(false);
      setCamera({ centerCoordinate: coords, zoomLevel: 15.5, animationDuration: 1400 });
    } catch { Alert.alert('Erreur GPS', "Signal GPS indisponible."); }
    finally { setIsLocating(false); }
  }, [isLocating]);

  const toggleCompassMode = useCallback(() => {
    const next = !allowRotation;
    setAllowRotation(next);
    Animated.timing(compassSpinAnim, { toValue: next ? 1 : 0, duration: 500, useNativeDriver: true }).start();
  }, [allowRotation, compassSpinAnim]);

  const compassInterpolate = useMemo(() =>
    compassSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
    [compassSpinAnim]
  );

  // Modales uniques (UNE SEULE CHOSE OUVERTE À LA FOISDevant L'UTILISATEUR !)
  const handleOpenPharmacyModal = useCallback((name: string, photo: string) => {
    setPharmacyModalData({ nom: name, photo });
    setIsPharmacyModalOpen(true);
  }, []);

  const handleOpenMedicineModal = useCallback((medData: any) => {
    setMedicineModalData(medData);
    setIsMedicineModalOpen(true);
  }, []);

  // Auth & Profil
  const handleLoginSubmit = useCallback(async (data: any) => {
    try {
      const loggedUser = await connexionUtilisateur({ identifier: data.identifier, password: data.password });
      if (!loggedUser || loggedUser.id == null) throw new Error('Identifiants incorrects.');
      const displayName = [loggedUser.nom, loggedUser.prenom].filter(Boolean).join(' ').trim();
      setUser({
        id: loggedUser.id,
        authId: loggedUser.authId,
        name: displayName,
        email: loggedUser.email || '',
        photo: loggedUser.photo || undefined,
        phone: loggedUser.phone || undefined,
      });
      setProfileName(displayName);
      setProfileEmail(loggedUser.email || '');
      setProfilePhone(loggedUser.phone || '');
      return { success: true, message: `Bienvenue, ${displayName} !` };
    } catch (e: any) { 
      return { success: false, message: e.message || 'Identifiants incorrects.' };
    }
  }, []);

  const handleRegisterSubmit = useCallback(async (data: any) => {
    try {
      const resultat = await inscriptionUtilisateur({
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        password: data.password,
      });

      if (resultat.status === 'email_confirmation_required') {
        return {
          success: true,
          pendingEmailConfirmation: true,
          message: `Votre compte Auth a été créé. Confirmez votre e-mail avant de vous connecter. Le profil ${APP_NAME} sera disponible après confirmation.`,
        };
      }

      if (resultat.status !== 'complete' || resultat.user.id == null) {
        throw new Error('Impossible de créer le compte.');
      }

      const displayName = [resultat.user.nom, resultat.user.prenom].filter(Boolean).join(' ').trim();
      setUser({
        id: resultat.user.id,
        authId: resultat.user.authId,
        name: displayName,
        email: resultat.user.email,
        photo: resultat.user.photo || undefined,
      });
      setProfileName(displayName);
      setProfileEmail(resultat.user.email);
      setProfilePhone(resultat.user.phone || '');
      return { success: true, message: 'Votre compte a été créé avec succès.' };
    } catch (e: any) { 
      let msg = 'Impossible de créer le compte.';
      if (e.message) {
        if (e.message.includes('already registered') || e.message.includes('already exists')) msg = 'Cet e-mail est déjà utilisé.';
        else if (e.message.includes('Password')) msg = 'Le mot de passe est trop faible.';
        else if (e.message.includes('network') || e.message.includes('fetch')) msg = 'Erreur réseau, veuillez vérifier votre connexion.';
        else if (e.message.includes('profil MediGo')) msg = e.message;
        else msg = 'Erreur lors de l\'inscription. Veuillez réessayer ultérieurement.';
      }
      return { success: false, message: msg };
    }
  }, []);

  const handleOAuthSignIn = useCallback(async (provider: 'google' | 'facebook') => {
    try {
      const result = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithFacebook();
      return result.status === 'cancelled'
        ? { cancelled: true }
        : { success: true };
    } catch (error: any) {
      console.error(`[OAuth] ${provider} :`, error?.message || 'Échec de connexion.');
      return { success: false, message: error?.message || 'Connexion OAuth impossible.' };
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setMenuView('menu');
  }, []);

  const handleEditField = useCallback((field: string, val: string) => { setEditingField(field); setTempValue(val); }, []);
  const handleSaveField = useCallback(async () => {
    if (!editingField) return true;
    if (!user) {
      Alert.alert('Connexion requise', 'Connectez-vous pour modifier votre profil.');
      return false;
    }

    try {
      if (editingField === 'name' || editingField === 'email') {
        const profileUpdates = editingField === 'name'
          ? (() => {
              const [nom = '', ...prenomParts] = tempValue.trim().split(/\s+/).filter(Boolean);
              return { nom, prenom: prenomParts.join(' ') };
            })()
          : { email: tempValue.trim() };

        const { data: profile, error } = await supabase
          .from('utilisateur')
          .update(profileUpdates)
          .eq('auth_id', user.authId)
          .select('id, auth_id, nom, prenom, email, photo')
          .single();

        if (error) throw error;

        const savedName = [profile.nom, profile.prenom].filter(Boolean).join(' ').trim();
        setProfileName(savedName);
        setProfileEmail(profile.email || '');
        setUser((current) => current ? {
          ...current,
          name: savedName,
          email: profile.email || '',
          photo: profile.photo || undefined,
        } : current);
      } else if (editingField === 'phone') {
        const { data, error } = await supabase.auth.updateUser({ phone: tempValue.trim() });
        if (error) throw error;
        const savedPhone = data.user.phone || '';
        setProfilePhone(savedPhone);
        setUser((current) => current ? { ...current, phone: savedPhone || undefined } : current);
      } else if (editingField === 'password') {
        const { error } = await supabase.auth.updateUser({ password: tempValue });
        if (error) throw error;
      }

      setEditingField(null);
      return true;
    } catch (error: unknown) {
      console.error('[Profil] Échec de sauvegarde :', error);
      const message = error instanceof Error ? error.message : 'La sauvegarde du profil a échoué.';
      Alert.alert('Enregistrement impossible', message);
      return false;
    }
  }, [editingField, tempValue, user]);

  const handleGlobalSave = useCallback(async () => {
    const saved = await handleSaveField();
    if (!saved) return;
    Alert.alert('Enregistré ✓', 'Mis à jour.');
    setMenuView('menu');
  }, [handleSaveField]);
  const handleDeleteAccount = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        throw error;
      }
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setMenuView('menu');
    } catch (error: any) {
      const status = error instanceof FunctionsHttpError ? error.context.status : undefined;
      let serverMessage: string | undefined;

      if (error instanceof FunctionsHttpError) {
        try {
          const responseBody = await error.context.json();
          if (typeof responseBody?.error === 'string' && responseBody.error.trim()) {
            serverMessage = responseBody.error.trim();
          }
        } catch {}
      }

      console.error('[delete-account] Failed:', {
        name: error?.name || 'Error',
        status,
        message: serverMessage,
      });
      Alert.alert('Suppression impossible', serverMessage || error?.message || 'La suppression du compte a échoué.');
    }
  }, []);

  const dynamicFabBottom = isPanelVisible
    ? Math.min(screenHeight * 0.45, 340) + keyboardOffset
    : Math.max(insets.bottom, 16) + 24 + keyboardOffset;

  const isModalOrDrawerActive = isPharmacyModalOpen || isMedicineModalOpen;
  const renderedStyleDocument = configuredMapStyle.trimStart().startsWith('{')
    ? JSON.parse(configuredMapStyle) as { name?: string }
    : null;
  console.log('[Carte] Style transmis à Map:', {
    name: renderedStyleDocument?.name ?? (renderedStyleDocument ? '(champ name absent)' : '(style distant; nom non fourni par la prop)'),
    mapStyle: renderedStyleDocument ? '(JSON inline)' : configuredMapStyle,
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar backgroundColor={WhatsAppColors.whatsappTeal} barStyle="light-content" />

      {/* ── 1. Carte MapLibre Interactive ── */}
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={configuredMapStyle}
        logo={false}
        attribution
        compass={allowRotation}
        touchRotate={allowRotation}
        touchPitch={allowRotation}
        androidView="texture"
        onDidFailLoadingMap={(event) => {
          console.error('[Carte] Erreur de chargement du style MapLibre:', event);
          Alert.alert('Carte indisponible', 'Impossible de charger la carte.');
        }}
        onRegionWillChange={(e: any) => {
          const isInteraction = e?.nativeEvent?.userInteraction ?? e?.properties?.isUserInteraction ?? e?.isUserInteraction ?? false;
          if (isInteraction && !isManualMove) {
            console.log('[Carte] déplacement manuel');
            setIsManualMove(true);
          }
        }}
        onRegionDidChange={(e: any) => {
          const isInteraction = e?.nativeEvent?.userInteraction ?? e?.properties?.isUserInteraction ?? e?.isUserInteraction ?? false;
          if (isInteraction) {
            setIsManualMove(true);
          }
        }}
        onPress={() => {
          if (selectedOffer && isPopupOpen) {
            
            setIsPopupOpen(false);
          }
        }}
      >
        <Camera
          ref={cameraRef}
          {...(!isManualMove ? { center: camera.centerCoordinate, zoom: camera.zoomLevel } : {})}
          maxZoom={19}
          minZoom={0}
          duration={camera.animationDuration}
          padding={(!isManualMove && isResultsPanelCompact) ? { top: 0, right: 0, bottom: compactBarMetrics.cameraPaddingBottom, left: 0 } : undefined}
        />

      {isLocationActive && userLocationCoords && <UserLocation animated accuracy heading={allowRotation} minDisplacement={10} />}

        {/* Point Utilisateur GPS */}
        {isLocationActive && userLocationCoords && (
          <Marker key="user-loc" id="user-loc" lngLat={userLocationCoords}>
            <View style={styles.userMarkerOuter}>
              <View style={styles.userMarkerPulse} />
              <View style={styles.userMarkerInner}>
                <Ionicons name="person" size={9} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}

        {pharmacieLocalisee && pharmacieLocaliseeCoords && (
          <Marker
            key={`localized-pharmacy-${pharmacieLocalisee.id}`}
            id={`localized-pharmacy-${pharmacieLocalisee.id}`}
            lngLat={[pharmacieLocaliseeCoords.longitude, pharmacieLocaliseeCoords.latitude]}
            anchor="bottom"
            offset={[0, 6]}
            onPress={() => handleOpenCatalog(pharmacieLocalisee.id, pharmacieLocalisee)}
          >
            <TouchableOpacity
              activeOpacity={1}
              hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
              onPress={() => handleOpenCatalog(pharmacieLocalisee.id, pharmacieLocalisee)}
              style={styles.pharmacyMarkerWrapper}
            >
              {featuredPharmacy?.source === 'located' && featuredPharmacy.id === pharmacieLocalisee.id && (
                <View style={{ marginBottom: 4 }}>
                  <PharmacyCallout
                    name={pharmacieLocalisee.nom || 'Pharmacie'}
                    subtitle="Voir le catalogue"
                    onPress={() => handleOpenCatalog(pharmacieLocalisee.id, pharmacieLocalisee)}
                  />
                </View>
              )}
              <PharmacyPin />
            </TouchableOpacity>
          </Marker>
        )}

        {/* ─────────────────────────────────────────────────────────
            MARQUEUR PHARMACIE : CROIX VERTE SANS PRIX
           ───────────────────────────────────────────────────────── */}
        {marqueursPharmacie
          .filter((item) => Number.isFinite(item.longitude) && Number.isFinite(item.latitude))
          .map((item) => item.id === pharmacieChoisie?.id ? (
            <Marker
              key={item.id}
              id={item.id}
              lngLat={[item.longitude, item.latitude]}
              anchor="bottom"
              offset={[0, 6]}
              onPress={() => setIsPopupOpen(prev => !prev)}
            >
              <View style={styles.pharmacyMarkerWrapper}>
                {featuredPharmacy?.source === 'search' && featuredPharmacy.id === item.id && (
                  <View style={{ marginBottom: 4 }}>
                    <PharmacyCallout
                      name={item.pharmacie?.nom || 'Pharmacie'}
                      onPress={() => setIsPopupOpen(prev => !prev)}
                    />
                  </View>
                )}
                <Animated.View
                  style={[
                    styles.pharmacyMarkerRing,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  onPress={() => setIsPopupOpen(prev => !prev)}
                  activeOpacity={0.85}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                >
                  <PharmacyPin />
                </TouchableOpacity>
              </View>
            </Marker>
          ) : (
            <Marker
              key={`offer-${item.id}`}
              id={`offer-${item.id}`}
              lngLat={[item.longitude, item.latitude]}
              anchor="bottom"
              offset={[0, 6]}
              onPress={() => handleSelectPharmacy(item)}
            >
              <TouchableOpacity
                onPress={() => handleSelectPharmacy(item)}
                hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
                style={styles.pharmacyMarkerWrapper}
              >
                {item.pharmacie?.nom ? (
                  <View style={styles.pharmacyMarkerLabel}>
                    <Text style={styles.pharmacyMarkerLabelText}>{item.pharmacie.nom}</Text>
                  </View>
                ) : null}
                <PharmacyPin />
              </TouchableOpacity>
            </Marker>
          ))}
      </Map>

      {/* ── Carte Produit Callout Ancrée en BAS DE L'ÉCRAN ── */}
      <View style={styles.floatingCalloutOverlay} pointerEvents="box-none">
        <PharmacyProductSheet
          item={selectedOffer}
          isVisible={!!(selectedOffer && isPopupOpen && !isModalOrDrawerActive)}
          onClose={() => setIsPopupOpen(false)}
          onOpenCatalog={() => selectedOffer && handleOpenCatalog(selectedOffer.id_pharmacie, selectedOffer.pharmacie)}
        />
      </View>

      {/* ── 2. Barre de Recherche ── */}
      {!isModalOrDrawerActive && (
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handlePerformSearch}
          onClear={() => {
            setPharmacieLocalisee(null);
            setFeaturedPharmacy(null);
          }}
          onOpenMenu={() => setIsMenuOpen(true)}
          notificationsCount={notifications.length}
        />
      )}



      {/* ── 3. Carte Produit / Panneau de Résultats (UNE SEULE CHOSE À LA FOIS !) ── */}
      <ResultsPanel
        isVisible={isPanelVisible && !isModalOrDrawerActive}
        isCompact={isResultsPanelCompact}
        allResultsVisible={toutAfficher}
        isLoading={isLoadingSearch}
        searchResults={searchResults}
        totalResults={totalSearchResults}
        isLoadingMoreResults={isLoadingMoreResults}
        selectedOffer={selectedOffer}
        isPopupOpen={isPopupOpen}
        searchedQuery={searchQuery}
        onSelectPharmacy={handleSelectPharmacy}
        onShowAllResultsOnMap={handleShowAllResultsOnMap}
        onExpandPanel={() => {
          setIsPopupOpen(false);
          setIsResultsPanelCompact(false);
        }}
        onClearMap={handleClearSelectedOffer}
        onClosePanel={fermerPanneau}
        onReducePanel={() => setIsResultsPanelCompact(true)}
        onLoadMoreResults={handleLoadMoreResults}
        onClosePopup={() => setIsPopupOpen(false)}
        onOpenPharmacyModal={handleOpenPharmacyModal}
        onOpenMedicineModal={handleOpenMedicineModal}
      />

      {/* ── 4. Boutons Flottants ── */}
      {!isModalOrDrawerActive && (
        <View style={[styles.fabContainer, { bottom: dynamicFabBottom }]}>
          <TouchableOpacity
            style={[styles.fabMain, isLocationActive && styles.fabMainActive, isLocating && styles.fabMainLoading]}
            onPress={() => {
              if (isLocationActive) toggleCompassMode();
              else handleGeolocate();
            }}
            disabled={isLocating}
            activeOpacity={0.8}
          >
            {isLocating
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Animated.View style={isLocationActive && allowRotation ? { transform: [{ rotate: compassInterpolate }] } : {}}>
                  <Ionicons name={isLocationActive ? (allowRotation ? 'compass' : 'locate') : 'navigate'} size={26} color="#FFFFFF" />
                </Animated.View>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Modales (QUAND UNE MODALE EST OUVERTE, ELLE EST SEULE À L'ÉCRAN) */}
      <PharmacyModal
        isOpen={isPharmacyModalOpen}
        pharmacyData={pharmacyModalData}
        onClose={() => setIsPharmacyModalOpen(false)}
      />

      <MedicineModal
        isOpen={isMedicineModalOpen}
        medicineData={medicineModalData}
        onClose={() => setIsMedicineModalOpen(false)}
      />

      <SideDrawer
        isOpen={isMenuOpen}
        menuView={menuView}
        user={user}
        notifications={notifications}
        historyItems={historyItems}
        userLocationCoords={userLocationCoords}
        onLocatePharmacy={handleLocatePharmacy}
        profileState={{ name: profileName, email: profileEmail, phone: profilePhone, password: profilePassword, language: profileLanguage, allowDataCollection, setLanguage: setProfileLanguage, setAllowDataCollection }}
        editingState={{ editingField, tempValue, setEditingField, setTempValue }}
        onClose={() => setIsMenuOpen(false)}
        onChangeProfile={() => { setMenuView('settings'); setIsMenuOpen(true); }}
        onSelectView={(v) => setMenuView(v)}
        onLogout={handleLogout}
        onEditField={handleEditField}
        onSaveField={handleSaveField}
        onGlobalSave={handleGlobalSave}
        onDeleteAccount={handleDeleteAccount}
        onDismissNotification={(id) => setNotifications(n => n.filter(x => x.id !== id))}
        onClearAllNotifications={() => setNotifications([])}
        onDismissHistoryItem={(idx) => setHistoryItems(h => h.filter((_, i) => i !== idx))}
        onClearAllHistory={() => setHistoryItems([])}
        onClickHistoryItem={(q) => { setSearchQuery(q); handlePerformSearch(q); setIsMenuOpen(false); }}
        onLoginSubmit={handleLoginSubmit}
        onRegisterSubmit={handleRegisterSubmit}
        onOAuthSignIn={handleOAuthSignIn}
      />
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },

  floatingCalloutOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 28,
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 40,
  },

  // ── Marqueur pharmacie ──
  pharmacyMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pharmacyMarkerLabel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6, // Espace entre le label et la croix
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E9EDEF',
  },
  pharmacyMarkerLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111B21',
  },
  pharmacyMarkerRing: {
    position: 'absolute',
    bottom: -70,
    left: '50%',
    marginLeft: -70,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 128, 105, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0, 128, 105, 0.45)',
  },
  pharmacyPriceBadge: {
    marginTop: 4,
    backgroundColor: '#008069',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  pharmacyPriceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  reopenCalloutBtn: {
    position: 'absolute',
    top: 140, left: 20, right: 20,
    backgroundColor: '#008069',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
    elevation: 8, zIndex: 35,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6,
  },
  reopenCalloutText: {
    color: '#FFFFFF', fontSize: 12, fontWeight: '800', flex: 1,
  },

  // Point Utilisateur GPS
  userMarkerOuter: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1.5, borderColor: '#0284C7',
    alignItems: 'center', justifyContent: 'center',
  },
  userMarkerPulse: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
  },
  userMarkerInner: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },

  // FABs
  fabContainer: {
    position: 'absolute', right: 16,
    gap: 12, zIndex: 25, alignItems: 'center',
  },
  fabActive: {
    backgroundColor: WhatsAppColors.whatsappGreen,
    borderColor: WhatsAppColors.whatsappGreen,
  },
  fabMain: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: WhatsAppColors.whatsappGreen,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    elevation: 8, shadowColor: '#008069',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 7,
  },
  fabMainActive: {
    backgroundColor: '#0284C7',
    borderColor: '#E0F2FE',
  },
  fabMainLoading: {
    opacity: 0.85,
    backgroundColor: WhatsAppColors.whatsappTeal,
  },
});
