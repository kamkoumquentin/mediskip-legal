import { WhatsAppColors } from '@/constants/theme';
import { APP_NAME } from '@/constants/app';
import { openLegalDocument, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/utils/legal';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingsViewProps {
  user: any | null;
  profileName: string;
  profileEmail: string;
  profilePhone: string;
  profilePassword: string;
  profileLanguage: string;
  allowDataCollection: boolean;
  editingField: string | null;
  tempValue: string;
  onBack: () => void;
  onClose: () => void;
  onEditField: (field: string, initialValue: string) => void;
  onSaveField: () => void;
  setTempValue: (val: string) => void;
  setProfileLanguage: (lang: string) => void;
  setAllowDataCollection: (allow: boolean) => void;
  onGlobalSave: () => void;
  onDeleteAccount: () => void;
}

const LANGUAGES = ['Français', 'English'];

export default function SettingsView({
  user,
  profileName,
  profileEmail,
  profilePhone,
  profilePassword,
  profileLanguage,
  allowDataCollection,
  editingField,
  tempValue,
  onBack,
  onClose,
  onEditField,
  onSaveField,
  setTempValue,
  setProfileLanguage,
  setAllowDataCollection,
  onGlobalSave,
  onDeleteAccount,
}: SettingsViewProps) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'android' ? 24 : 44) + 8;
  const bottomPadding = Math.max(insets.bottom, 24) + 50;

  const isEn = profileLanguage === 'English';
  const tr = (fr: string, en: string) => (isEn ? en : fr);

  const confirmDeleteAccount = () => {
    Alert.alert(
      tr("Supprimer le compte", "Delete Account"),
      tr(`Êtes-vous sûr de vouloir supprimer définitivement votre compte ${APP_NAME} ? Cette action est irréversible.`, `Are you sure you want to permanently delete your ${APP_NAME} account? This action cannot be undone.`),
      [
        { text: tr("Annuler", "Cancel"), style: "cancel" },
        { text: tr("Supprimer", "Delete"), style: "destructive", onPress: onDeleteAccount }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr("Paramètres", "Settings")}</Text>
        <TouchableOpacity style={styles.saveHeaderBtn} onPress={onGlobalSave} activeOpacity={0.8}>
          <Text style={styles.saveHeaderBtnText}>{tr("Sauver", "Save")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={[styles.scrollInner, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        {/* Section 1: Informations Personnelles */}
        <Text style={styles.sectionHeader}>{tr("INFORMATIONS PERSONNELLES", "PERSONAL INFORMATION")}</Text>
        <View style={styles.cardGroup}>
          {/* Nom */}
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{tr("Nom complet", "Full Name")}</Text>
              {editingField === 'name' ? (
                <TextInput
                  style={styles.inlineInput}
                  value={tempValue}
                  onChangeText={setTempValue}
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{profileName || tr('Non renseigné', 'Not specified')}</Text>
              )}
            </View>
            {editingField === 'name' ? (
              <TouchableOpacity style={styles.saveCheckBtn} onPress={onSaveField}>
                <Ionicons name="checkmark-circle" size={24} color="#008069" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.editPenBtn} onPress={() => onEditField('name', profileName)}>
                <Ionicons name="pencil" size={18} color="#8696A0" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Email */}
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Email</Text>
              {editingField === 'email' ? (
                <TextInput
                  style={styles.inlineInput}
                  value={tempValue}
                  onChangeText={setTempValue}
                  keyboardType="email-address"
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{profileEmail || tr('Non renseigné', 'Not specified')}</Text>
              )}
            </View>
            {editingField === 'email' ? (
              <TouchableOpacity style={styles.saveCheckBtn} onPress={onSaveField}>
                <Ionicons name="checkmark-circle" size={24} color="#008069" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.editPenBtn} onPress={() => onEditField('email', profileEmail)}>
                <Ionicons name="pencil" size={18} color="#8696A0" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* Téléphone */}
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{tr("Téléphone", "Phone")}</Text>
              {editingField === 'phone' ? (
                <TextInput
                  style={styles.inlineInput}
                  value={tempValue}
                  onChangeText={setTempValue}
                  keyboardType="phone-pad"
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>{profilePhone || tr('Non renseigné', 'Not specified')}</Text>
              )}
            </View>
            {editingField === 'phone' ? (
              <TouchableOpacity style={styles.saveCheckBtn} onPress={onSaveField}>
                <Ionicons name="checkmark-circle" size={24} color="#008069" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.editPenBtn} onPress={() => onEditField('phone', profilePhone)}>
                <Ionicons name="pencil" size={18} color="#8696A0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section 2: Sécurité */}
        <Text style={styles.sectionHeader}>{tr("SÉCURITÉ", "SECURITY")}</Text>
        <View style={styles.cardGroup}>
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{tr("Mot de passe", "Password")}</Text>
              {editingField === 'password' ? (
                <TextInput
                  style={styles.inlineInput}
                  value={tempValue}
                  onChangeText={setTempValue}
                  secureTextEntry
                  autoFocus
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profilePassword ? '••••••••' : '••••••••'}
                </Text>
              )}
            </View>
            {editingField === 'password' ? (
              <TouchableOpacity style={styles.saveCheckBtn} onPress={onSaveField}>
                <Ionicons name="checkmark-circle" size={24} color="#008069" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.editPenBtn} onPress={() => onEditField('password', profilePassword)}>
                <Ionicons name="pencil" size={18} color="#8696A0" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section 3: Préférences */}
        <Text style={styles.sectionHeader}>{tr("PRÉFÉRENCES & CONFIDENTIALITÉ", "PREFERENCES & PRIVACY")}</Text>
        <View style={styles.cardGroup}>
          {/* Langue */}
          <View style={styles.langFieldColumn}>
            <Text style={styles.fieldLabel}>{tr("Langue d'affichage", "Display Language")}</Text>
            <View style={styles.langPickerGroup}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langChip, profileLanguage === lang && styles.langChipActive]}
                  onPress={() => setProfileLanguage(lang)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langChipText, profileLanguage === lang && styles.langChipTextActive]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Switch Données */}
          <View style={styles.fieldRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.fieldLabel}>{tr("Collecte de données", "Data Collection")}</Text>
              <Text style={styles.fieldSubLabel}>{tr("Améliorer la précision des recherches", "Improve search accuracy")}</Text>
            </View>
            <Switch
              value={allowDataCollection}
              onValueChange={setAllowDataCollection}
              trackColor={{ false: '#D1D5DB', true: WhatsAppColors.whatsappLightGreen }}
              thumbColor={allowDataCollection ? WhatsAppColors.whatsappGreen : '#9CA3AF'}
            />
          </View>
        </View>

        <View style={[styles.cardGroup, styles.legalLinksCard]}>
          <TouchableOpacity
            style={styles.fieldRow}
            accessibilityRole="link"
            onPress={() => openLegalDocument(TERMS_OF_SERVICE_URL)}
            activeOpacity={0.8}
          >
            <Text style={styles.fieldLabel}>{tr("Conditions d'utilisation", 'Terms of Service')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#8696A0" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.fieldRow}
            accessibilityRole="link"
            onPress={() => openLegalDocument(PRIVACY_POLICY_URL)}
            activeOpacity={0.8}
          >
            <Text style={styles.fieldLabel}>{tr('Politique de confidentialité', 'Privacy Policy')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#8696A0" />
          </TouchableOpacity>
        </View>

        {/* Action Dangereuse */}
        {user && (
          <TouchableOpacity style={styles.deleteAccountBtn} onPress={confirmDeleteAccount} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color="#EA4335" />
            <Text style={styles.deleteAccountText}>{tr("Supprimer mon compte", "Delete Account")}</Text>
          </TouchableOpacity>
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  saveHeaderBtn: {
    backgroundColor: WhatsAppColors.brightGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  saveHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#667781',
    marginBottom: 6,
    marginTop: 12,
    paddingLeft: 4,
    letterSpacing: 0.5,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E9EDEF',
  },
  legalLinksCard: {
    marginTop: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111B21',
  },
  fieldSubLabel: {
    fontSize: 11,
    color: '#667781',
    marginTop: 2,
  },
  fieldValue: {
    fontSize: 14,
    color: '#54656F',
    marginTop: 2,
    fontWeight: '500',
  },
  inlineInput: {
    fontSize: 14,
    color: '#111B21',
    borderBottomWidth: 1.5,
    borderBottomColor: WhatsAppColors.whatsappGreen,
    paddingVertical: 2,
    marginTop: 2,
  },
  editPenBtn: {
    padding: 6,
  },
  saveCheckBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
  },
  langFieldColumn: {
    paddingVertical: 12,
  },
  langPickerGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  langChip: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9EDEF',
  },
  langChipActive: {
    backgroundColor: WhatsAppColors.whatsappGreen,
    borderColor: WhatsAppColors.whatsappGreen,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#54656F',
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE8E6',
    paddingVertical: 12,
    borderRadius: 18,
    gap: 6,
    marginTop: 20,
  },
  deleteAccountText: {
    color: '#EA4335',
    fontSize: 13,
    fontWeight: '800',
  },
  footerBar: {
    padding: 16,
    backgroundColor: '#F0F2F5',
  },
  closeMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E9EDEF',
  },
  closeMenuText: {
    color: '#54656F',
    fontSize: 14,
    fontWeight: '700',
  },
});
