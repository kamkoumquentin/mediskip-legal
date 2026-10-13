import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Platform, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

import AuthFormsView from './AuthFormsView';
import HistoryView from './HistoryView';
import MainMenuView from './MainMenuView';
import NotificationsView from './NotificationsView';
import PharmaciesView from './PharmaciesView';
import SettingsView from './SettingsView';
import type { Pharmacie } from '@/utils/supabaseClient';

const { width: screenWidth } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(screenWidth * 0.85, 340);

interface SideDrawerProps {
  isOpen: boolean;
  menuView: string;
  user: any | null;
  notifications?: any[];
  historyItems?: string[];
  userLocationCoords?: [number, number] | null;
  onLocatePharmacy: (pharmacie: Pharmacie) => void;
  profileState: any;
  editingState: any;
  onClose: () => void;
  onChangeProfile: () => void;
  onSelectView: (view: string) => void;
  onLogout: () => void;
  onEditField: (field: string, initialValue: string) => void;
  onSaveField: () => void;
  onGlobalSave: () => void;
  onDeleteAccount: () => void;
  onDismissNotification: (id: string) => void;
  onClearAllNotifications: () => void;
  onDismissHistoryItem: (idx: number) => void;
  onClearAllHistory: () => void;
  onClickHistoryItem: (query: string) => void;
  onLoginSubmit: (data: any) => Promise<any>;
  onRegisterSubmit: (data: any) => Promise<any>;
  onOAuthSignIn: (provider: 'google' | 'facebook') => Promise<any>;
}

export default function SideDrawer({
  isOpen,
  menuView,
  user,
  notifications = [],
  historyItems = [],
  userLocationCoords = null,
  onLocatePharmacy,
  profileState,
  editingState,
  onClose,
  onChangeProfile,
  onSelectView,
  onLogout,
  onEditField,
  onSaveField,
  onGlobalSave,
  onDeleteAccount,
  onDismissNotification,
  onClearAllNotifications,
  onDismissHistoryItem,
  onClearAllHistory,
  onClickHistoryItem,
  onLoginSubmit,
  onRegisterSubmit,
  onOAuthSignIn,
}: SideDrawerProps) {
  const effectiveMenuView =
    !user && (menuView === 'notifications' || menuView === 'settings' || menuView === 'pharmacies')
      ? 'login'
      : menuView;

  const pharmaciesBackRef = useRef<(() => boolean) | null>(null);
  const registerPharmaciesBack = useCallback((handler: (() => boolean) | null) => {
    pharmaciesBackRef.current = handler;
  }, []);

  const handleRequestClose = useCallback(() => {
    if (effectiveMenuView === 'pharmacies') {
      if (pharmaciesBackRef.current?.()) return; // médicaments → liste
      onSelectView('menu'); // liste → menu
      return;
    }
    onClose();
  }, [effectiveMenuView, onSelectView, onClose]);

  console.log('[SideDrawer] render', { isOpen, menuView, effectiveMenuView, user: !!user });

  const [shouldRender, setShouldRender] = useState(isOpen);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const visibleRef = useRef(false);

  const runOpenAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    console.log('[SideDrawer] useEffect isOpen', { isOpen, shouldRender, menuView, effectiveMenuView, user: !!user });

    if (isOpen) {
      if (visibleRef.current) {
        runOpenAnimation();
      } else {
        slideAnim.setValue(-DRAWER_WIDTH);
        fadeAnim.setValue(0);
        setShouldRender(true);
      }
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(({ finished }) => {
        if (finished) {
          visibleRef.current = false;
          setShouldRender(false);
        }
      });
    }
  }, [isOpen, slideAnim, fadeAnim, runOpenAnimation]);

  if (!shouldRender) {
    console.log('[SideDrawer] not rendering because !shouldRender', { isOpen, shouldRender, menuView, effectiveMenuView });
    return null;
  }

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
      onShow={() => {
        visibleRef.current = true;
        runOpenAnimation();
      }}
    >
      <View style={styles.container}>
        {/* 1. Backdrop Sombre Dépoli - Clic pour Fermer */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* 2. Tiroir Latéral Glissant */}
        <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>
          {effectiveMenuView === 'menu' && (
            <MainMenuView
              user={user}
              notificationsCount={notifications.length}
              historyCount={historyItems.length}
              language={profileState.language}
              onClose={onClose}
              onChangeProfile={onChangeProfile}
              onSelectView={onSelectView}
              onLogout={onLogout}
            />
          )}

          {effectiveMenuView === 'settings' && (
            <SettingsView
              user={user}
              profileName={profileState.name}
              profileEmail={profileState.email}
              profilePhone={profileState.phone}
              profilePassword={profileState.password}
              profileLanguage={profileState.language}
              allowDataCollection={profileState.allowDataCollection}
              editingField={editingState.editingField}
              tempValue={editingState.tempValue}
              onBack={() => { onSelectView('menu'); editingState.setEditingField(null); }}
              onClose={onClose}
              onEditField={onEditField}
              onSaveField={onSaveField}
              setTempValue={editingState.setTempValue}
              setProfileLanguage={profileState.setLanguage}
              setAllowDataCollection={profileState.setAllowDataCollection}
              onGlobalSave={onGlobalSave}
              onDeleteAccount={onDeleteAccount}
            />
          )}

          {effectiveMenuView === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onBack={() => onSelectView('menu')}
              onClose={onClose}
              onDismiss={onDismissNotification}
              onClearAll={onClearAllNotifications}
            />
          )}

          {effectiveMenuView === 'pharmacies' && (
            <PharmaciesView
              userLocationCoords={userLocationCoords}
              onLocatePharmacy={onLocatePharmacy}
              onBack={() => onSelectView('menu')}
              registerBack={registerPharmaciesBack}
            />
          )}

          {effectiveMenuView === 'history' && (
            <HistoryView
              historyItems={historyItems}
              onBack={() => onSelectView('menu')}
              onClose={onClose}
              onClickItem={onClickHistoryItem}
              onDismissItem={onDismissHistoryItem}
              onClearAll={onClearAllHistory}
            />
          )}

          {(effectiveMenuView === 'login' || effectiveMenuView === 'register') && (
            <AuthFormsView
              mode={effectiveMenuView as 'login' | 'register'}
              onBack={() => onSelectView('menu')}
              onClose={onClose}
              onSwitchMode={onSelectView}
              onLoginSubmit={onLoginSubmit}
              onRegisterSubmit={onRegisterSubmit}
              onOAuthSignIn={onOAuthSignIn}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#F0F2F5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 16,
      },
    }),
  },
});
