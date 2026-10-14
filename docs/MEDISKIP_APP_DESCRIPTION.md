# Description de l'application Mediskip (Expo / React Native)

## Sommaire

1. Vue d'ensemble
2. Stack technique et structure
3. Écrans, vues et navigation
4. Fonctionnalités métier détaillées
5. Supabase
6. Carte et localisation
7. Interface et design
8. Données locales et état
9. Autres services
10. Mapping vers la version web
11. Points d'attention
12. Ce que je n'ai pas pu vérifier

---

## 1. Vue d'ensemble

L'application est une application mobile de recherche de médicaments et de pharmacies, centrée sur la comparaison de prix et la localisation de pharmacies proches. Le flux principal est :

1. ouvrir l'app,
2. saisir le nom d'un médicament dans la barre de recherche,
3. déclencher une recherche,
4. afficher les offres compatibles sur la carte et dans un panneau latéral,
5. sélectionner une pharmacie / une offre,
6. voir la fiche du produit / pharmacie ou ouvrir le catalogue de la pharmacie.

Le code montre une logique fortement centrée sur le marché local (Bafoussam / Cameroun) : coordonnées GPS, unités FCFA, noms des pharmacies en français, messages en français/anglais, et données historiques stockées en base Supabase.

Sources principales : `src/app/index.tsx`, `src/utils/supabaseClient.ts`, `src/components/ResultsPanel.tsx`, `src/components/SearchBar.tsx`.

### Public visé

Le produit semble viser :

- un visiteur anonyme qui cherche rapidement un médicament à proximité ;
- un utilisateur connecté qui garde un historique, gère son profil, et peut utiliser des services plus personnalisés ;
- éventuellement des profils "pharmacie" via le trigger Supabase `synchroniser_nouvel_utilisateur`.

### Flux principal utilisateur

Le flux réel visible dans le code est le suivant :

- `SearchBar` reçoit une recherche (nom de médicament).
- `handlePerformSearch()` dans `src/app/index.tsx` appelle `rechercherOffresMedicaments()`.
- Les résultats sont structurés comme `PharmacyItem` avec `prix`, `disponibilite`, `pharmacie`, `medicament`, `distance` calculée par `calculateDistance()`.
- La carte MapLibre affiche les pharmacies et les marqueurs.
- Le panneau `ResultsPanel` affiche la liste triée par distance et permet :
  - sélectionner une pharmacie,
  - afficher tous les résultats sur la carte,
  - réduire/agrandir le panneau,
  - ouvrir les modales produit / pharmacie.
- Lorsqu'une pharmacie est sélectionnée, le code active un point de carte plus visible, ouvre la fiche produit ou la page catalogue via `handleOpenCatalog()`.

---

## 2. Stack technique et structure

### Stack

- Expo SDK : `~57.0.26` (package.json)
- React Native : `0.86.3`
- React : `19.2.3`
- Expo Router : `~57.0.24`
- Navigation : file-based routing avec `expo-router`, `Stack` et `usePathname`
- État local : `useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`
- Carte : `@maplibre/maplibre-react-native`
- Auth et DB : `@supabase/supabase-js`
- Géolocalisation : `expo-location`
- Ouverture de liens OAuth / docs légaux : `expo-web-browser`, `expo-linking`
- Images / upload : `expo-image-picker`, `expo-document-picker`
- Stockage session Supabase : `@react-native-async-storage/async-storage`
- Accessibilité / UI : `@expo/vector-icons`, `react-native-safe-area-context`, `react-native-reanimated`

Sources : `package.json`, `src/app/_layout.tsx`, `src/utils/supabaseClient.ts`, `src/config/mapStyle.ts`.

### Structure des dossiers

- `src/app/` : routes et point d'entrée d'Expo Router
- `src/components/` : écrans latéraux, modales, panneaux, barre de recherche
- `src/utils/` : clients Supabase, OAuth, géolocalisation, légaux, sécurité
- `src/config/` : style de carte MapLibre
- `src/constants/` : thème / couleurs / nom d'app
- `src/hooks/` : hooks d'UI / thème
- `assets/` : logos, splash, icônes
- `supabase_schema.sql` / `supabase_migration.sql` / `supabase_patch_trigger_utilisateur.sql` : logique SQL / trigger / données initiales

### Point d'entrée

- `package.json` contient `main: "expo-router/entry"`.
- Le layout principal est `src/app/_layout.tsx`.
- La page d'accueil est `src/app/index.tsx`.
- `src/app/auth/callback.tsx` sert uniquement à rediriger vers `/` après OAuth.

### Traces d'anciens noms / renommages

Le code contient encore des références explicites à `MediGo` dans plusieurs commentaires et messages d'erreur, notamment :

- `src/utils/supabaseClient.ts` : commentaires "Profil MediGo" et messages d'erreur.
- `src/utils/oauth.ts` : erreur "Le profil MediGo (ID métier) est introuvable après OAuth."
- `supabase_migration.sql` : commentaire "Profil MediGo : BIGINT public.utilisateur.id".

Conclusion : le produit a probablement été renommé de "MediGo" vers "Mediskip" sans nettoyer intégralement les libellés internes.

---

## 3. Écrans et navigation

### Écrans / vues de routage

| Écran / vue | Fichier | Rôle | Éléments clés |
|---|---|---|---|
| Page d'accueil | `src/app/index.tsx` | Carte, recherche, résultats, modales | map, search bar, drawer, panels |
| Callback OAuth | `src/app/auth/callback.tsx` | Redirection après login OAuth | `Redirect href="/"` |
| Catalogue pharmacie | `src/app/pharmacy-catalog.tsx` | Vue catalogue d'une pharmacie | écran de liste de produits / détails |
| Menu principal | `src/components/MainMenuView.tsx` | Tiroir d'accueil | historique, notifications, pharmacies, paramètres, login |
| Historique | `src/components/HistoryView.tsx` | Historique des recherches | clic pour relancer recherche, effacer |
| Notifications | `src/components/NotificationsView.tsx` | Liste locale de notifications | dismiss / clear all |
| Pharmacies | `src/components/PharmaciesView.tsx` | Liste des pharmacies actives | recherche, tri par distance, catalogue |
| Paramètres | `src/components/SettingsView.tsx` | profil, langue, privacy | édition de champs, switch de collecte de données |
| Auth | `src/components/AuthFormsView.tsx` | login / inscription | email/password, OAuth Google/Facebook |
| Résultats | `src/components/ResultsPanel.tsx` | panneau latéral de résultats | liste, tri, bouton "Voir tous les résultats" |
| Modal médicament | `src/components/MedicineModal.tsx` | vue détaillée d'un produit | image, zoom, rotation |
| Modal pharmacie | `src/components/PharmacyModal.tsx` | photo de la pharmacie | plein écran |
| Fiche produit / pharmacie | `src/components/PharmacyProductSheet.tsx` | détails d'une offre | à confirmer |
| Drawer latéral | `src/components/SideDrawer.tsx` | orchestration du menu | switch entre vues |

### Graphe de navigation

Le projet utilise majoritairement un écran unique (`index.tsx`) avec un système de vues overlay, plutôt qu'un vrai arbre de navigation multi-routes.

Le routeur n'expose que :

- `/` => accueil carte
- `/auth/callback` => callback OAuth
- `/pharmacy-catalog` => fiche catalogue pharmacie (peut être appuyée après sélection)

À l'intérieur de l'écran principal, le drawer change de vue selon `menuView` : `menu`, `history`, `notifications`, `settings`, `pharmacies`, `login`, `register`.

Les transitions de panneaux sont animées via `Animated` et un `Modal` : `SideDrawer` applique un slide horizontal pour le panneau latéral. `ResultsPanel` applique un slide vertical plus compact.

### Panneaux spéciaux

- Panneau de résultats : `ResultsPanel` : liste des pharmacies, tri par distance, bouton de réduction / ouverture, possibilité de voir tout sur la carte.
- Fiche produit : `MedicineModal` : image du produit + conseil santé + zoom / rotation.
- Fiche pharmacie : `PharmacyModal` / `PharmacyProductSheet` : affichage photo et détails sur la pharmacie.
- Menu latéral : `SideDrawer` / `MainMenuView`.
- Paramètres : `SettingsView` ; lié à `profileLanguage` et `allowDataCollection`.

---

## 4. Fonctionnalités, une par une

### 4.1 Recherche de médicament

Le moteur de recherche est piloté par `handlePerformSearch()` dans `src/app/index.tsx`.

Règles observées :

- la saisie est une chaîne brute de texte ;
- la recherche est déclenchée par le bouton de recherche ou la touche `Enter` ;
- la requête est normalisée en minuscule : `.trim().toLowerCase()` ;
- si la chaîne est vide, l'app affiche `Alert.alert('Recherche', 'Veuillez saisir le nom d\'un médicament.')` ;
- la recherche appelle `rechercherOffresMedicaments()` dans `src/utils/supabaseClient.ts` ;
- la recherche SQL est effectuée par `ilike('medicaments.nom', '%...%')` ;
- il existe aussi un filtre sur le nom de la pharmacie dans la fonction SQL `rechercher_offres_medicament`.

### 4.2 Suggestions / filtres / tri

Le code ne montre pas de système de suggestions autocomplètes explicite ni de filtres détaillés (ex. type de produit, stock, prix max, disponibilité etc.).

Ce qui existe réellement :

- recherche libre sur le nom du médicament ;
- tri par distance croissante dans la liste et sur la carte ;
- affichage de l'état `disponibilite` (`en_stock` ou `rupture`) ;
- zoom et cadrage sur le cluster des pharmacies trouvées.

Le tri sur la carte est visible dans `index.tsx` : `setSearchResults(allResults.sort((a, b) => (a.distance || 999) - (b.distance || 999)))`.

### 4.3 Carte / affichage

Les résultats sont mis dans `searchResults`, et la carte montre :

- le point utilisateur si `userLocationCoords` est disponible ;
- les pharmacies trouvées (`marqueursPharmacie`) ;
- un point sélectionné avec anneau pulsant ;
- le panneau de résultats sous la carte.

La logique de cadrage conserve les pharmacies dans un rayon de 50 km autour de la médiane des résultats, sauf si aucune pharmacie valide n'est trouvée, auquel cas il recadre sur toutes les pharmacies valides.

### 4.4 Fiche pharmacie / produit

Le code expose des modales pour :

- `MedicineModal` : image du médicament, sécurité, plein écran, zoom ;
- `PharmacyModal` : photo de la pharmacie, plein écran ;
- `PharmacyProductSheet` : probable fiche de détails d'une offre / pharmacie ; comportement exact à confirmer.

Les action possibles comprennent :

- ouvrir le catalogue d'une pharmacie,
- fermer la modale,
- inspecter l'image en plein écran,
- zoom / rotation sur le produit.

### 4.5 Localisation

La géolocalisation est demandée via `expo-location` et utilisée pour :

- calculer la distance entre l'utilisateur et les pharmacies,
- afficher la position de l'utilisateur sur la carte,
- recentrer la carte sur les résultats proches,
- filtrer les pharmacies à plus de 50 km.

Le code demande la permission au foreground : `Location.getForegroundPermissionsAsync()`. Si autorisée, il essaie `getLastKnownPositionAsync()`.

La précision et la fréquence ne sont pas configurées de façon avancée dans le code visible ; il semble s'agir d'une localisation "à la demande" avec `minDisplacement={10}` sur `UserLocation`.

### 4.6 Limite de recherches gratuites sans compte

À confirmer : le code ne contient pas de compteur explicite de recherches gratuites sans compte.

Ce qui est présent :

- mode "invité" dans le menu ;
- historique anonyme sauvegardé dans `historiqueanonyme` ;
- `enregistrerHistoriqueRecherche()` envoie les recherches anonymes avec `latitude`, `longitude`, `date`.

Aucun bloc de code ne montre :

- un quota de recherches gratuites,
- un compteur `searchCount`,
- une limite d'accès selon user premium ou non,
- une banniere "premium".

Conclusion probable : la version mobile actuelle ne met en œuvre aucune limite explicite sans compte, même si le modèle de données supporte l'historique anonyme.

### 4.7 Connexion / inscription

Le système d'authentification est basé sur Supabase Auth.

Méthodes supportées visibles dans le code :

- email + mot de passe,
- Google OAuth,
- Facebook OAuth (le bouton est présent mais désactivé par `ENABLE_FACEBOOK_LOGIN = false` dans `src/components/AuthFormsView.tsx`).

Flux OAuth :

- `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: 'kamsoftmobile://auth/callback', skipBrowserRedirect: true } })`
- `WebBrowser.openAuthSessionAsync(data.url, OAUTH_CALLBACK_URL)`
- callback intercepté dans `src/app/_layout.tsx` via `Linking.addEventListener('url', ...)`
- `handleOAuthCallback()` échange le code avec `exchangeCodeForSession(code)`
- puis `synchroniserIdentiteOAuth()` appelle la Edge Function `sync-oauth-provider`

### 4.8 Verrouillage de l'app (PIN / biométrie)

Aucune implémentation visible de verrouillage par code PIN, biométrie ou `expo-local-authentication` dans le code source. Le champ "PIN / biométrie" semble non implémenté.

### 4.9 Profil

Le profil utilisateur est lié au `public.utilisateur` table. Les champs visibles dans les écrans :

- `nom`
- `prenom`
- `email`
- `phone`
- `password`
- `language`
- `allowDataCollection`

Le code met à jour le profil localement via des états `profileName`, `profileEmail`, `profilePhone`, `profileLanguage`, `allowDataCollection` dans `src/app/index.tsx`.

### 4.10 Notifications

Les notifications sont gérées localement dans l'état du composant principal :

- `const [notifications, setNotifications] = useState([...])` dans `src/app/index.tsx`
- `NotificationsView` affiche et permet de supprimer ou vider la liste

Il n'y a pas de preuve d'intégration de notifications push Expo / FCM / OneSignal dans le code.

### 4.11 Paramètres / langue / `tr()`

Le code prend explicitement en charge le `Français` et l'`English` via `LANGUAGES = ['Français', 'English']` dans `SettingsView.tsx`.

L'implémentation est locale :

- `const isEn = profileLanguage === 'English';`
- `const tr = (fr, en) => (isEn ? en : fr);`

Utilisation : affichage différencié dans `MainMenuView`, `SettingsView`, `AuthFormsView`.

### 4.12 Suppression du compte

Le bouton de suppression du compte appelle la Supabase Edge Function `delete-account` :

- `supabase.functions.invoke('delete-account')`
- puis `supabase.auth.signOut({ scope: 'local' })`

Le code affiche un `Alert` de confirmation et un message d'erreur si la suppression échoue.

### 4.13 Liens légaux

Les liens légaux sont stockés dans `src/utils/legal.ts` :

- `TERMS_OF_SERVICE_URL`
- `PRIVACY_POLICY_URL`

Le bouton ouvre le navigateur : `WebBrowser.openBrowserAsync(url)`.

### 4.14 Autres fonctionnalités non vérifiées dans le code visible

Le code contient une référence à `analyserDocumentIA()` et à `supabase.functions.invoke('analyser-document')`, ce qui indique une fonction IA pour analyser des documents / ordonnances, mais l'écran / UI correspondante n'est pas visible dans les composants lisibles du repo.

---

## 5. Supabase

### 5.1 Client Supabase

Le client est créé dans `src/utils/supabaseClient.ts` :

- `SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { ... } })`

Options configurées :

- `flowType: 'pkce'`
- `storage: Platform.OS === 'web' ? webAuthStorage : AsyncStorage`
- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: false`

Variables d'environnement attendues :

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 5.2 Authentification

Méthodes :

- email + mot de passe via `supabase.auth.signInWithPassword()`
- sign-up via `supabase.auth.signUp()`
- OAuth Google / Facebook via `supabase.auth.signInWithOAuth()`
- callback via `exchangeCodeForSession(code)`

Session :

- persistée via AsyncStorage ou localStorage selon platform
- auto-refresh activé
- `onAuthStateChange` dans `src/app/index.tsx` repose sur `SIGNED_IN`, `SIGNED_OUT`, `INITIAL_SESSION`, `TOKEN_REFRESHED`, `USER_UPDATED`

Déconnexion :

- `supabase.auth.signOut({ scope: 'local' })`

### 5.3 Base de données : tables

Le schéma est dans `supabase_schema.sql` et le patch de trigger dans `supabase_patch_trigger_utilisateur.sql`.

| Table | Rôle | Colonnes clés |
|---|---|---|
| `public.pharmacies` | pharmacies partenaires | `id`, `nom`, `longitude`, `latitude`, `photo`, `emplacement`, `statut`, `etat` |
| `public.medicaments` | médicaments | `id`, `nom` |
| `public.offres` | prix et disponibilité | `id`, `id_pharmacie`, `id_medicament`, `prix`, `image`, `disponibilite` |
| `public.utilisateur` | profil utilisateur métier | `id`, `auth_id`, `nom`, `prenom`, `email`, `photo`, `password` |
| `public.reaction` | avis / notes | `id_offre`, `id_utilisateur`, `avis` |
| `public.historiquerecherche` | historique utilisateur connecté | `recherche`, `id_utilisateur` |
| `public.historiqueanonyme` | historique visiteur | `recherche`, `latitude`, `longitude`, `date` |
| `public.consultations` | tracking de consultation | `id_utilisateur`, `id_medicament`, `id_pharmacie`, `latitude`, `longitude` |
| `public.superadmin` | compte admin | `nom`, `password` |

### 5.4 Requêtes SQL / RPC utilisées par le code

| Fonction ou requête | Usage | Endroit du code |
|---|---|---|
| `supabase.from('pharmacies').select(...).eq('statut','actif')` | liste des pharmacies actives | `src/utils/supabaseClient.ts` |
| `supabase.from('offres').select(...)` | recherche d'offres + jointures | `src/utils/supabaseClient.ts` |
| `supabase.from('historiquerecherche').insert(...)` | historique connecté | `src/utils/supabaseClient.ts` |
| `supabase.from('historiqueanonyme').insert(...)` | historique anonyme | `src/utils/supabaseClient.ts` |
| `supabase.from('consultations').insert(...)` | consultation analytics | `src/utils/supabaseClient.ts` |
| `supabase.rpc('importer_offre_unique', ...)` | création d'une offre | `src/utils/supabaseClient.ts` |
| `supabase.rpc('get_admin_stats')` | stats admin | `src/utils/supabaseClient.ts` |
| `supabase.functions.invoke('sync-oauth-provider')` | synchronisation OAuth | `src/utils/oauth.ts` |
| `supabase.functions.invoke('delete-account')` | suppression de compte | `src/app/index.tsx` |
| `supabase.functions.invoke('analyser-document')` | IA sur document | `src/utils/supabaseClient.ts` |

### 5.5 RPC SQL visible

Les fonctions principales listées dans `supabase_schema.sql` sont :

- `public.rechercher_pharmacies_proches(...)`
- `public.rechercher_offres_medicament(...)`
- `public.importer_offre_unique(...)`
- `public.get_admin_stats()`

La fonction `rechercher_offres_medicament` calcule la distance à l'aide d'une formule haversine et effectue des jointures sur `medicaments` et `pharmacies`.

### 5.6 Edge Functions

Fonctions visibles dans le code et/ou déduites de l'usage :

| Nom | Rôle | Appelé depuis |
|---|---|---|
| `sync-oauth-provider` | synchronisation du profil et de l'identité OAuth | `src/utils/oauth.ts` |
| `delete-account` | suppression du compte connecté | `src/app/index.tsx` |
| `analyser-document` | analyse IA d'un document / ordonnance | `src/utils/supabaseClient.ts` |

### 5.7 Storage

Aucune utilisation explicite de Supabase Storage n'a été trouvée dans le code visible. Les photos de pharmacies / médicaments semblent être des URL externes stockées dans les champs `photo` / `image` de la base, pas des objets uploadés dans un bucket de storage.

### 5.8 Temps réel

Aucune piste de `realtime` / `supabase.channel()` / abonnement temps réel n'a été trouvée dans le code visible. Il n'y a pas d'usage du `realtime` dans la branche lisible.

### 5.9 À exporter depuis Supabase

À vérifier / exporter en dehors du repo :

- RLS (Row Level Security) sur `pharmacies`, `offres`, `utilisateur`, `historiquerecherche`, `historiqueanonyme`, `consultations`
- triggers de synchronisation automatique après création de compte auth
- `user_providers` / identité OAuth et mappings
- politique d'upload / lecture sur les éventuels buckets de stockage
- définitions de Edge Functions sur le dashboard Supabase
- variables d'environnement côté Supabase
- secrets / clés de projet / règles de sécurité / backoff / rate limits

---

## 6. Carte et localisation

### Librairie de carte

La carte est rendue avec `@maplibre/maplibre-react-native` et `Map` + `Camera` dans `src/app/index.tsx`.

### Style de carte

Le style est géré par `src/config/mapStyle.ts` :

- il charge `liberty-custom.json`
- il modifie les calques `poi` pour masquer ou estomper les pharmacies
- il applique un style local plutôt qu'une URL de tuile distante directe

La logique est claire dans le fichier `src/config/mapStyle.ts`.

### Marqueurs / clustering

Le code ne présente pas de mécanisme de clustering dédié. Les points sont affichés comme marqueurs individuels (`Marker`) avec `PharmacyPin` et `PharmacyCallout`.

### Itinéraires

Aucun flux d'itinéraire (routing directions) n'est visible dans le code. L'app semble chercher des pharmacies proches, pas calculer un itinéraire complet.

### Position de l'utilisateur

- permission au premier plan : `Location.getForegroundPermissionsAsync()`
- récupération de la dernière position connue : `Location.getLastKnownPositionAsync()`
- `UserLocation` affiché sur la carte
- `minDisplacement={10}` pour éviter les mises à jour trop fréquentes
- lorsqu'un utilisateur refuse la localisation, la carte continue d'afficher les pharmacies sans point utilisateur

### Calcul des pharmacies proches

La distance est calculée via `calculateDistance()` (Haversine) dans `src/utils/geo.ts`.

Le rayon de carte pour le cadrage est 50 km (`distance <= 50`), et les résultats sont ordonnés par distance. La recherche et le tri sont donc clairement fondés sur le calcul géodésique.

---

## 7. Interface et design

### Palette de couleurs

Les couleurs principales sont définies dans `src/constants/theme.ts` :

- `whatsappTeal`: `#075E54`
- `whatsappGreen`: `#008069`
- `whatsappAccent`: `#00A884`
- `whatsappBg`: `#F0F2F5`
- `whatsappCardBg`: `#FFFFFF`
- `whatsappDark`: `#111B21`
- `whatsappMuted`: `#667781`

### Typographies / éléments de style

Le design est inspiré de WhatsApp :

- barre de recherche arrondie,
- en-têtes verts,
- cartes blanches avec bordures légères,
- badges de notification rouges,
- gros libellés, `fontWeight: '800'` / `900`.

### Composants réutilisables

- `SearchBar.tsx` : barre de recherche flottante avec menu + bouton recherche
- `ResultsPanel.tsx` : panneau latéral de résultats, réduit/agrandi
- `MainMenuView.tsx` : menu principal avec avatar, sections, options
- `SettingsView.tsx` : écrans de paramètres modulaires
- `AuthFormsView.tsx` : formulaire de login et inscription
- `PharmacyPin.tsx` : marqueur de pharmacie
- `PharmacyCallout.tsx` : bulle d'appel
- `MedicineModal.tsx`, `PharmacyModal.tsx` : modales d'inspection

### Icônes / motions

- `@expo/vector-icons` est utilisé partout
- le design utilise `Animated` et `PanResponder` pour les modales / animations de zoom
- `pulseAnim` / `compassSpinAnim` servent à signaler les marqueurs sélectionnés

### Logo / écran de démarrage / assets

Les assets visibles dans `app.json` et `assets/` indiquent la présence de :

- `mediskip-icon.png`
- `mediskip-adaptive-foreground.png`
- `mediskip-monochrome.png`
- `splash-mediskip.png`
- `mediskip-favicon.png`

`app.json` montre aussi des permissions de localisation pour iOS / Android.

---

## 8. Données locales et état

### Stockage local

Le code montre :

- `AsyncStorage` pour la persistance de session Supabase
- `window.localStorage` en web pour la même finalité

Il n'est pas visible de clé métier customisée dans `AsyncStorage` pour stocker les préférences de l'utilisateur. Les préférences sont appartiennent à l'état React local du composant principal (`useState`), pas à un store persistant.

### État global / store

Le vrai "state global" de l'app est essentiellement dans `src/app/index.tsx` :

- `user`
- `searchQuery`
- `searchResults`
- `selectedOffer`
- `pharmacieChoisie`
- `pharmacieLocalisee`
- `featuredPharmacy`
- `userLocationCoords`
- `notifications`
- `historyItems`
- `profileLanguage`
- `allowDataCollection`
- `menuView`
- `isMenuOpen`

Cet état est transmis à travers `SideDrawer` puis aux vues + modales.

Il n'y a pas de Redux / Zustand / Context global entier dans le repo visible ; l'état est géré par composants et props descendantes.

---

## 9. Autres services

### Notifications push

Aucune preuve d'intégration de `expo-notifications`, `firebase`, ou `OneSignal` dans le repo visible.

### Analytique / publicité

Aucune implémentation visible d'analytics tiers ou d'ads. Les `consultations` et `historique...` tables servent de tracking interne plutôt que d'un service tierce.

### Appels réseau hors Supabase

Le code utilise :

- `expo-web-browser` pour ouvrir les liens légaux
- `expo-linking` pour OAuth callback
- `axios` est présent dans les dépendances, mais sans usage visible dans les fichiers principaux ; à confirmer si utilisé ailleurs.

---

## 10. Mapping vers la version web (Next.js)

| Fonctionnalité | Mobile | Portabilité web | Équivalent web conseillé | Remarque |
|---|---|---|---|---|
| Recherche médicament | Oui | Oui | page /search ou /resultats | utiliser même logique Supabase |
| Carte + géolocalisation | Oui | Oui | MapLibre GL JS / Leaflet / Mapbox | navigateur demande `navigator.geolocation` |
| Résultats triés par distance | Oui | Oui | calcul côté serveur ou côté client | utiliser même Haversine |
| Fiche produit | Oui | Oui | modale / overlay / page produit | adaptée à web |
| Fiche pharmacie | Oui | Oui | page pharmacie | idem |
| Google OAuth | Oui | Oui | OAuth web (`supabase.auth.signInWithOAuth`) | configurer redirect URL web |
| Facebook OAuth | Oui | à confirmer | OAuth web si activé | UI en code est désactivée |
| Historique search | Oui | Oui | table + page historique | même schéma Supabase |
| Mode invité | Oui | Oui | page "Rechercher sans compte" | demander moins de friction |
| Vérrouillage PIN / biométrie | Oui, mais non implémenté | À adapter | PIN local / WebAuthn | absent sur mobile et web |
| Notifications locales | À confirmer | Oui, via système web | toast / banner | pas d'implémentation push verifiée |
| Stockage local | Oui, AsyncStorage | Oui, localStorage / cookie / IndexedDB | localStorage + clés compatibles | attention au stockage de session |
| Suppression de compte | Oui | Oui | action côté serveur + UI de confirmation | idem Edge Function |
| Limite de recherches sans compte | Non visible | Potentiellement | compteur serveur | pas implémentée actuellement |
| SEO / pages légales | N/A | Oui | metadata SEO + pages conditions / confidentialité | le mobile ouvre un navigateur externe |

---

## 11. Points d'attention

### 11.1 Risques / incohérences

- Le code contient de nombreuses traces de `MediGo` alors que le nom public est `mediskip` ; cela peut créer de la confusion dans la migration web.
- La logique de recherche est fortement centrée sur `index.tsx`, ce qui rend la compréhension globale difficile.
- Le code utilise des tables / colonnes nommées `utilisateur`, `reaction`, `historiquerecherche` etc., sans interface centralisée de modèles TypeScript bien structurés.
- Les permissions et les types sont calibrés en `any` dans plusieurs composants (`pharmacyData: any`, `medicineData: any`), ce qui rend le refactoring web plus risqué.
- Aucune limite explicite de recherche gratuite n'est implémentée, ce qui peut être un point métier à clarifier avant migration.
- Le code n'affiche pas de véritable sécurité côté client pour les champs `password` et les données sensibles ; elles sont en mémoire uniquement dans le runtime, mais l'app n'éprouve pas de protection avancée.

### 11.2 Code mort / TODO / fragilités

- `ENABLE_FACEBOOK_LOGIN = false` indique une fonction non active.
- `analyserDocumentIA` est présente sans UI visible claire.
- `pharmacy-catalog.tsx` et `PharmacyProductSheet` existent mais ne sont pas entièrement exploités dans le parcours principal.
- Le code de `index.tsx` est très long et mélange logique de carte, auth, historique, modales, localisation et drawer dans un seul fichier.
- Il existe des commentaires en français, souvent très utiles, mais aussi beaucoup de logs `console.log` et de `console.warn` en production.

### 11.3 Points de sécurité à confirmer

- Politiques RLS sur les tables
- Détection contre injection côté DB / Edge Functions
- Limitation d'accès aux Edge Functions `delete-account` / `sync-oauth-provider`
- Contrôle des données `photo` et `image` (URLs non validées)
- Valeur du `auth_id` et du `id` métier `utilisateur.id` (BIGINT) dans la logique de synchronisation

---

## 12. Ce que je n'ai pas pu vérifier

- Les politiques RLS exactes dans Supabase (dashboard non accessible depuis ce repo)
- Les Edge Functions réelles et leur code complet (non présent dans le dépôt)
- Les vrais buckets de stockage / règles d'accès si des fichiers sont uploadés ailleurs que via les URLs de données existantes
- L'implémentation effective de `delete-account`, `sync-oauth-provider` et `analyser-document` (non visibles dans le dépôt)
- Le comportement exact de `PharmacyProductSheet` et de la route `/pharmacy-catalog` sans exécution de l'application
- L'existence d'une logique de verrouillage PIN / biométrie non détectée dans l'arborescence actuelle

---

# Synthèse concrète pour un agent de refonte web

La version mobile actuelle est une application de recherche de médicament et pharmacie en mode carte, avec un menu latéral, une logique de géolocalisation légère, un système d'auth Supabase, et un modèle de données SQL centralisant les pharmacies, offres, médicaments, historique et consultations. La migration web devra reconduire principalement :

- la recherche par médicament,
- le tri / distance,
- le mode carte,
- le menu / profil,
- l'auth OAuth,
- le stockage historique,
- la suppression du compte,
- la logique liée à Supabase.

La partie la plus risquée à migrer n'est pas la carte, mais le couplage entre l’auth Supabase, le profil `public.utilisateur`, l'historique anonyme/connécté, et les Edge Functions côté serveur.
