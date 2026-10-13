import { WhatsAppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SEARCH_BAR_HEIGHT = 54;

export function getSearchBarTop(insetTop: number, isAndroid: boolean) {
  return Math.max(insetTop, isAndroid ? 24 : 44) + 8;
}

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (queryToSearch?: string) => void;
  onClear?: () => void;
  onOpenMenu: () => void;
  notificationsCount?: number;
}

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  onSearch,
  onClear,
  onOpenMenu,
  notificationsCount = 0,
}: SearchBarProps) {
  const insets = useSafeAreaInsets();
  const inputRef = React.useRef<TextInput | null>(null);

  const handleSubmit = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
    onSearch();
  };

  // Calcul du top dynamically selon les insets Safe Area pour éviter toute chevauchée avec la barre de statut
  const dynamicTop = getSearchBarTop(insets.top, Platform.OS === 'android');

  return (
    <View style={[styles.container, { top: dynamicTop }]}>
      {/* Barre de Recherche Style Message WhatsApp */}
      <View style={styles.barCapsule}>
        {/* Bouton Menu Tiroir Latéral */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onOpenMenu}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu-outline" size={24} color={WhatsAppColors.whatsappTeal} />
          {notificationsCount > 0 && (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{notificationsCount > 9 ? '9+' : notificationsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Champ de texte principal */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher un médicament..."
          placeholderTextColor="#8696A0"
          returnKeyType="search"
          blurOnSubmit
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Bouton Effacer le texte si rempli */}
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('');
              onClear?.();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={18} color="#8696A0" />
          </TouchableOpacity>
        )}

        {/* Bouton Envoi / Recherche Circulaire Vert WhatsApp (#008069) */}
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 25,
  },
  barCapsule: {
    height: SEARCH_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E9EDEF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconButton: {
    padding: 6,
    position: 'relative',
  },
  menuBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EA4335',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#111B21',
  },
  clearButton: {
    padding: 4,
    marginRight: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WhatsAppColors.whatsappGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#008069',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
