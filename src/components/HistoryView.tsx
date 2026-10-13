import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WhatsAppColors } from '@/constants/theme';

interface HistoryViewProps {
  historyItems: string[];
  onBack: () => void;
  onClose: () => void;
  onClickItem: (query: string) => void;
  onDismissItem: (index: number) => void;
  onClearAll: () => void;
}

export default function HistoryView({
  historyItems = [],
  onBack,
  onClose,
  onClickItem,
  onDismissItem,
  onClearAll,
}: HistoryViewProps) {
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
        <Text style={styles.headerTitle}>Historique</Text>
        <TouchableOpacity
          style={[styles.clearAllHeaderBtn, historyItems.length === 0 && { opacity: 0.4 }]}
          onPress={onClearAll}
          disabled={historyItems.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.clearAllHeaderText}>Effacer tout</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={[styles.scrollInner, { paddingBottom: bottomPadding }]} showsVerticalScrollIndicator={false}>
        {historyItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#8696A0" />
            <Text style={styles.emptyTitle}>Aucun historique de recherche</Text>
            <Text style={styles.emptySub}>Vos recherches de médicaments apparaîtront ici.</Text>
          </View>
        ) : (
          <View style={styles.cardGroup}>
            {historyItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.historyRow}
                  onPress={() => onClickItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.leftCol}>
                    <Ionicons name="search-outline" size={18} color="#8696A0" />
                    <Text style={styles.itemText} numberOfLines={1}>{item}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteItemBtn}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      onDismissItem(idx);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color="#8696A0" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </React.Fragment>
            ))}
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
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9EDEF',
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111B21',
    flex: 1,
  },
  deleteItemBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
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
