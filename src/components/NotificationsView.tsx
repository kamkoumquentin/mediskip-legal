import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WhatsAppColors } from '@/constants/theme';

export interface NotificationItem {
  id: string;
  type?: 'important' | 'info';
  title: string;
  desc: string;
  time: string;
}

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onBack: () => void;
  onClose: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationsView({
  notifications = [],
  onBack,
  onClose,
  onDismiss,
  onClearAll,
}: NotificationsViewProps) {
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'android' ? 24 : 44) + 8;
  const bottomPadding = Math.max(insets.bottom, 24) + 40;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={[styles.clearAllHeaderBtn, notifications.length === 0 && { opacity: 0.4 }]}
          onPress={onClearAll}
          disabled={notifications.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.clearAllHeaderText}>Effacer tout</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={[styles.scrollInner, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#8696A0" />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptySub}>Vous êtes à jour ! Vos alertes de santé apparaîtront ici.</Text>
          </View>
        ) : (
          notifications.map((item) => {
            const isImportant = item.type === 'important';
            return (
              <View key={item.id} style={styles.notifCard}>
                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => onDismiss(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color="#8696A0" />
                </TouchableOpacity>

                <View style={styles.notifRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      isImportant ? { backgroundColor: '#FFF3E0' } : { backgroundColor: '#E7FCE3' },
                    ]}
                  >
                    <Ionicons
                      name={isImportant ? "warning" : "information-circle"}
                      size={20}
                      color={isImportant ? "#F57C00" : WhatsAppColors.whatsappGreen}
                    />
                  </View>

                  <View style={styles.notifTextCol}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifDesc}>{item.desc}</Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>
                </View>
              </View>
            );
          })
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
  clearAllHeaderBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  clearAllHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111B21',
  },
  emptySub: {
    fontSize: 13,
    color: '#667781',
    textAlign: 'center',
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9EDEF',
    position: 'relative',
  },
  dismissBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
  notifRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTextCol: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111B21',
  },
  notifDesc: {
    fontSize: 12,
    color: '#54656F',
    marginTop: 2,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    color: '#8696A0',
    fontWeight: '600',
    marginTop: 4,
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
