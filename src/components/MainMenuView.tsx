import { WhatsAppColors } from '@/constants/theme';
import { APP_NAME } from '@/constants/app';
import { Ionicons } from '@expo/vector-icons';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MainMenuViewProps {
  user: any | null;
  notificationsCount: number;
  historyCount: number;
  language?: string;
  onClose: () => void;
  onChangeProfile: () => void;
  onSelectView: (view: string) => void;
  onLogout: () => void;
}

export default function MainMenuView({
  user,
  notificationsCount,
  historyCount,
  language = 'Français',
  onClose,
  onChangeProfile,
  onSelectView,
  onLogout,
}: MainMenuViewProps) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'android' ? 24 : 44) + 8;
  const bottomPadding = Math.max(insets.bottom, 24) + 40;

  const isEn = language === 'English';
  const tr = (fr: string, en: string) => (isEn ? en : fr);

  return (
    <View style={styles.container}>
      {/* 1. Header Vert WhatsApp (#075E54) */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <View style={styles.userInfoRow}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={onChangeProfile} activeOpacity={0.8}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={28} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.onlineBadge} />
          </TouchableOpacity>

          <View style={styles.userTextCol}>
            <Text style={styles.userNameText} numberOfLines={1}>
              {user ? user.name : tr("Mode Invité", "Guest Mode")}
            </Text>
            <Text style={styles.userSubText}>
              {user ? tr(`Compte vérifié ${APP_NAME}`, `Verified ${APP_NAME} Account`) : tr("Cliquez pour vous connecter", "Click to log in")}
            </Text>
          </View>
        </View>

        {/* Croix de fermeture X */}
        <TouchableOpacity style={styles.closeHeaderButton} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 2. Contenu défilant avec Options & Bouton de Connexion très lisible */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Liste des Options */}
        <View style={styles.optionsList}>
          {/* Historique de recherche */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => onSelectView('history')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#E7FCE3' }]}>
                <Ionicons name="time-outline" size={20} color={WhatsAppColors.whatsappGreen} />
              </View>
              <Text style={styles.optionLabel}>{tr("Historique de recherche", "Search History")}</Text>
            </View>
            <View style={styles.countBadgeGrey}>
              <Text style={styles.countBadgeGreyText}>{historyCount}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Notifications */}
          <TouchableOpacity
            style={[styles.optionRow, !user && { opacity: 0.5 }]}
            onPress={() => {
              if (!user) {
                onSelectView('login');
                return;
              }
              onSelectView('notifications');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}> 
                <Ionicons name="notifications-outline" size={20} color="#F57C00" />
              </View>
              <Text style={styles.optionLabel}>{tr("Notifications", "Notifications")}</Text>
            </View>
            {user && notificationsCount > 0 && (
              <View style={styles.countBadgeRed}>
                <Text style={styles.countBadgeRedText}>{notificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {user && (
            <>
              <View style={styles.rowDivider} />

              {/* Pharmacies */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => onSelectView('pharmacies')}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: '#E7FCE3' }]}>
                    <Ionicons name="business" size={20} color={WhatsAppColors.whatsappGreen} />
                  </View>
                  <Text style={styles.optionLabel}>{tr("Pharmacies", "Pharmacies")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8696A0" />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.rowDivider} />

          {/* Paramètres du compte */}
          <TouchableOpacity
            style={[styles.optionRow, !user && { opacity: 0.5 }]}
            onPress={() => {
              if (!user) {
                onSelectView('login');
                return;
              }
              onSelectView('settings');
            }}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="settings-outline" size={20} color="#1976D2" />
              </View>
              <Text style={styles.optionLabel}>{tr("Paramètres du compte", "Account Settings")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8696A0" />
          </TouchableOpacity>

          {/* Déconnexion si connecté */}
          {user && (
            <>
              <View style={styles.rowDivider} />
              <TouchableOpacity
                style={styles.optionRow}
                onPress={onLogout}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FCE8E6' }]}>
                    <Ionicons name="log-out-outline" size={20} color="#EA4335" />
                  </View>
                  <Text style={[styles.optionLabel, { color: '#EA4335' }]}>{tr("Déconnexion", "Log out")}</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Bouton Connexion / Inscription très lisible placé directement sous les options */}
        {!user && (
          <View style={styles.loginCardContainer}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => onSelectView('login')}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
              <Text style={styles.loginButtonText}>{tr("Se connecter / S'inscrire", "Log in / Sign up")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    backgroundColor: WhatsAppColors.whatsappTeal,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: WhatsAppColors.brightGreen,
    borderWidth: 2,
    borderColor: WhatsAppColors.whatsappTeal,
  },
  userTextCol: {
    flex: 1,
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  userSubText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  closeHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  optionsList: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 20,
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111B21',
  },
  countBadgeGrey: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeGreyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#54656F',
  },
  countBadgeRed: {
    backgroundColor: '#EA4335',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeRedText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F0F2F5',
    marginHorizontal: 16,
  },
  loginCardContainer: {
    marginHorizontal: 12,
    marginTop: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WhatsAppColors.whatsappGreen,
    paddingVertical: 15,
    borderRadius: 24,
    gap: 10,
    elevation: 4,
    shadowColor: '#008069',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
