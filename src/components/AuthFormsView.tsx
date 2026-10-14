import { WhatsAppColors } from '@/constants/theme';
import { APP_NAME } from '@/constants/app';
import { openLegalDocument, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/utils/legal';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ENABLE_FACEBOOK_LOGIN = false;

interface AuthFormsViewProps {
  mode: 'login' | 'register';
  onBack: () => void;
  onClose: () => void;
  onSwitchMode: (mode: string) => void;
  onLoginSubmit: (data: any) => Promise<any>;
  onRegisterSubmit: (data: any) => Promise<any>;
  onOAuthSignIn: (provider: 'google' | 'facebook') => Promise<any>;
}

export default function AuthFormsView({
  mode = 'login',
  onBack,
  onClose,
  onSwitchMode,
  onLoginSubmit,
  onRegisterSubmit,
  onOAuthSignIn,
}: AuthFormsViewProps) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'android' ? 24 : 44) + 8;
  const bottomPadding = Math.max(insets.bottom, 24) + 40;

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [resultMessage, setResultMessage] = useState<{success: boolean, text: string, pendingEmailConfirmation?: boolean} | null>(null);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerNom, setRegisterNom] = useState('');
  const [registerPrenom, setRegisterPrenom] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerPhotoPreview, setRegisterPhotoPreview] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    if (isLoading || loadingProvider) return;
    setLoadingProvider(provider);
    setResultMessage(null);
    try {
      const result = await onOAuthSignIn(provider);
      if (result?.cancelled) return;
      if (!result?.success) {
        setResultMessage({ success: false, text: result?.message || 'Connexion OAuth impossible.' });
        return;
      }
    } catch (error: any) {
      console.error(`[OAuth] ${provider} :`, error?.message || 'Échec de connexion.');
      setResultMessage({ success: false, text: error?.message || 'Connexion OAuth impossible.' });
    } finally {
      setLoadingProvider(null);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'L\'accès aux photos est requis pour choisir une photo de profil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setRegisterPhotoPreview(result.assets[0].uri);
    }
  };

  const handleLogin = async () => {
    if (!loginIdentifier || !loginPassword) {
      Alert.alert('Champs requis', 'Veuillez saisir votre e-mail et mot de passe.');
      return;
    }
    setIsLoading(true);
    setResultMessage(null);
    const res = await onLoginSubmit({ identifier: loginIdentifier, password: loginPassword });
    setIsLoading(false);
    if (res) setResultMessage({ success: res.success, text: res.message, pendingEmailConfirmation: res.pendingEmailConfirmation });
  };

  const handleRegister = async () => {
    if (!registerNom) {
      Alert.alert('Champs requis', 'Veuillez saisir votre Nom.');
      return;
    }
    if (!registerEmail) {
      Alert.alert('Champs requis', 'Veuillez saisir votre Email.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerEmail)) {
      Alert.alert('Email invalide', 'Veuillez saisir une adresse email valide.');
      return;
    }
    if (!registerPassword) {
      Alert.alert('Champs requis', 'Veuillez saisir un mot de passe.');
      return;
    }
    if (!registerConfirmPassword) {
      Alert.alert('Champs requis', 'Veuillez confirmer votre mot de passe.');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    setResultMessage(null);
    const res = await onRegisterSubmit({
      nom: registerNom,
      prenom: registerPrenom,
      email: registerEmail,
      password: registerPassword,
      photo: registerPhotoPreview,
    });
    setIsLoading(false);
    if (res) setResultMessage({ success: res.success, text: res.message, pendingEmailConfirmation: res.pendingEmailConfirmation });
  };

  const isLogin = mode === 'login';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isLogin ? 'Connexion' : 'Créer un compte'}</Text>
        <TouchableOpacity style={styles.closeHeaderBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={[styles.scrollInner, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          {resultMessage ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Ionicons name={resultMessage.success ? 'checkmark-circle' : 'close-circle'} size={64} color={resultMessage.success ? WhatsAppColors.whatsappGreen : '#EA4335'} />
              <Text style={[styles.formTitle, { marginTop: 16 }]}>
                {resultMessage.pendingEmailConfirmation
                  ? 'Confirmez votre e-mail'
                  : resultMessage.success
                    ? 'Opération réussie'
                    : 'Erreur'}
              </Text>
              <Text style={[styles.formSubtitle, { marginBottom: 24, fontSize: 14 }]}>{resultMessage.text}</Text>
              <TouchableOpacity style={styles.submitBtn} onPress={() => {
                if (resultMessage.success) onClose();
                else setResultMessage(null);
              }}>
                <Text style={styles.submitBtnText}>
                  {resultMessage.pendingEmailConfirmation
                    ? 'Compris'
                    : resultMessage.success
                      ? 'Aller à l\'accueil'
                      : 'Réessayer'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.formTitle}>{isLogin ? 'Se connecter' : `Inscription ${APP_NAME}`}</Text>
              <Text style={styles.formSubtitle}>
                {isLogin
                  ? 'Accédez à votre historique et gérez vos préférences.'
                  : `Rejoignez le réseau de santé ${APP_NAME}.`}
              </Text>

              <View style={styles.oauthButtons}>
                <TouchableOpacity
                  style={[styles.oauthButton, loadingProvider && { opacity: 0.65 }]}
                  onPress={() => handleOAuthSignIn('google')}
                  disabled={Boolean(loadingProvider)}
                  activeOpacity={0.8}
                >
                  {loadingProvider === 'google' ? <ActivityIndicator color="#4285F4" /> : <Ionicons name="logo-google" size={19} color="#4285F4" />}
                  <Text style={styles.oauthButtonText}>Continuer avec Google</Text>
                </TouchableOpacity>
                {ENABLE_FACEBOOK_LOGIN && (
                  <TouchableOpacity
                    style={[styles.oauthButton, loadingProvider && { opacity: 0.65 }]}
                    onPress={() => handleOAuthSignIn('facebook')}
                    disabled={Boolean(loadingProvider)}
                    activeOpacity={0.8}
                  >
                    {loadingProvider === 'facebook' ? <ActivityIndicator color="#1877F2" /> : <Ionicons name="logo-facebook" size={19} color="#1877F2" />}
                    <Text style={styles.oauthButtonText}>Continuer avec Facebook</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.legalText}>
                En continuant, vous acceptez nos{' '}
                <Text
                  style={styles.legalLinkText}
                  accessibilityRole="link"
                  onPress={() => openLegalDocument(TERMS_OF_SERVICE_URL)}
                >
                  Conditions d&apos;utilisation
                </Text>
                {' '}et notre{' '}
                <Text
                  style={styles.legalLinkText}
                  accessibilityRole="link"
                  onPress={() => openLegalDocument(PRIVACY_POLICY_URL)}
                >
                  Politique de confidentialité
                </Text>
                .
              </Text>
              <View style={styles.oauthDivider}>
                <View style={styles.oauthDividerLine} />
                <Text style={styles.oauthDividerText}>ou avec votre e-mail</Text>
                <View style={styles.oauthDividerLine} />
              </View>

          {/* Formulaire d'inscription : Photo Uploader */}
          {!isLogin && (
            <View style={styles.photoSection}>
              <TouchableOpacity style={styles.photoPicker} onPress={pickImage} activeOpacity={0.8}>
                {registerPhotoPreview ? (
                  <Image source={{ uri: registerPhotoPreview }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={26} color="#8696A0" />
                    <Text style={styles.photoPlaceholderText}>Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {registerPhotoPreview && (
                <TouchableOpacity style={styles.removePhotoBadge} onPress={() => setRegisterPhotoPreview(null)}>
                  <Ionicons name="close-circle" size={18} color="#EA4335" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Champs Connexion */}
          {isLogin ? (
            <>
              <View style={styles.inputGroup}>
                <Ionicons name="mail-outline" size={18} color="#8696A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="E-mail"
                  placeholderTextColor="#8696A0"
                  value={loginIdentifier}
                  onChangeText={setLoginIdentifier}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="lock-closed-outline" size={18} color="#8696A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  placeholderTextColor="#8696A0"
                  secureTextEntry={!showPassword}
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#8696A0" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.submitBtn, isLoading && { opacity: 0.7 }]} onPress={handleLogin} activeOpacity={0.85} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Se connecter</Text>}
              </TouchableOpacity>
            </>
          ) : (
            /* Champs Inscription */
            <>
              <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={18} color="#8696A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nom *"
                  placeholderTextColor="#8696A0"
                  value={registerNom}
                  onChangeText={setRegisterNom}
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="person-outline" size={18} color="#8696A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Prénom"
                  placeholderTextColor="#8696A0"
                  value={registerPrenom}
                  onChangeText={setRegisterPrenom}
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="mail-outline" size={18} color="#8696A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#8696A0"
                  keyboardType="email-address"
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="lock-closed-outline" size={18} color="#8696A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe *"
                  placeholderTextColor="#8696A0"
                  secureTextEntry={!showPassword}
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#8696A0" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="lock-closed-outline" size={18} color="#8696A0" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmer le mot de passe *"
                  placeholderTextColor="#8696A0"
                  secureTextEntry={!showPassword}
                  value={registerConfirmPassword}
                  onChangeText={setRegisterConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#8696A0" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.submitBtn, isLoading && { opacity: 0.7 }]} onPress={handleRegister} activeOpacity={0.85} disabled={isLoading}>
                {isLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Création du compte...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitBtnText}>{"S'inscrire"}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Mode Switch Footer */}
          <View style={styles.switchModeRow}>
            <Text style={styles.switchText}>
              {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
            </Text>
            <TouchableOpacity onPress={() => onSwitchMode(isLogin ? 'register' : 'login')}>
              <Text style={styles.switchLink}>
                {isLogin ? 'Créer un compte' : 'Se connecter'}
              </Text>
            </TouchableOpacity>
          </View>
          </>
          )}
        </View>
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
  closeHeaderBtn: {
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
  scrollInner: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E9EDEF',
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111B21',
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 12,
    color: '#667781',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  oauthButtons: {
    gap: 10,
    marginBottom: 16,
  },
  oauthButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8DEE3',
  },
  oauthButtonText: {
    color: '#23313B',
    fontSize: 14,
    fontWeight: '700',
  },
  legalText: {
    fontSize: 12,
    color: '#667781',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -8,
    marginBottom: 16,
  },
  legalLinkText: {
    textDecorationLine: 'underline',
  },
  oauthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  oauthDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1E6E9',
  },
  oauthDividerText: {
    color: '#667781',
    fontSize: 12,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  photoPicker: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F2F5',
    borderWidth: 2,
    borderColor: WhatsAppColors.whatsappGreen,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8696A0',
    marginTop: 2,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -2,
    right: '36%',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9EDEF',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#111B21',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 6,
  },
  submitBtn: {
    backgroundColor: WhatsAppColors.whatsappGreen,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  switchModeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 13,
    color: '#667781',
  },
  switchLink: {
    fontSize: 13,
    fontWeight: '800',
    color: WhatsAppColors.whatsappGreen,
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
