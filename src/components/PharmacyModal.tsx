import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Image, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WhatsAppColors } from '@/constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PharmacyModalProps {
  isOpen: boolean;
  pharmacyData: any;
  onClose: () => void;
}

export default function PharmacyModal({ isOpen, pharmacyData, onClose }: PharmacyModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !pharmacyData) return null;

  const name = typeof pharmacyData === 'string'
    ? pharmacyData
    : (pharmacyData?.nom || pharmacyData?.boutique || pharmacyData?.name || "Pharmacie");

  const photo = typeof pharmacyData === 'object' && pharmacyData?.photo
    ? pharmacyData.photo
    : null;

  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* MODALE STANDARD */}
        <View style={styles.modalCard}>
          {/* Bouton Fermer */}
          <TouchableOpacity style={styles.closeIconButton} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Photo Grand Format avec overlay incitation Plein écran */}
          <TouchableOpacity
            style={styles.imageWrapper}
            activeOpacity={0.9}
            onPress={() => photo && setIsFullscreen(true)}
          >
            {photo ? <Image source={{ uri: photo }} style={styles.pharmacyPhoto} resizeMode="cover" /> : <View style={styles.photoUnavailable}><Ionicons name="business-outline" size={42} color="#087E6B" /><Text style={styles.photoUnavailableText}>Photo indisponible</Text></View>}
            <View style={styles.imageGradientOverlay} />

            <View style={styles.imageBadgesRow}>
              <View style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>VUE PHARMACIE</Text>
              </View>

              {photo && <View style={styles.lightboxTriggerBadge}>
                <Ionicons name="expand-outline" size={14} color="#008069" />
                <Text style={styles.lightboxTriggerText}>Plein écran</Text>
              </View>}
            </View>
          </TouchableOpacity>

          {/* Details */}
          <View style={styles.modalBody}>
            <Text style={styles.pharmacyNameText}>{formattedName}</Text>
            <Text style={styles.descriptionText}>
              {"Utilisez cette photo de l'officine pour repérer facilement les locaux à votre arrivée sur place."}
            </Text>

            <View style={styles.footerRow}>
              <View />

              <TouchableOpacity style={styles.mainCloseButton} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.mainCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* LIGHTBOX PLEIN ÉCRAN */}
        {isFullscreen && (
          <Modal
            visible={isFullscreen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsFullscreen(false)}
          >
            <View style={styles.lightboxBackdrop}>
              <TouchableOpacity
                style={styles.lightboxCloseButton}
                onPress={() => setIsFullscreen(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
                <Text style={styles.lightboxCloseText}>Quitter</Text>
              </TouchableOpacity>

              <Image
                source={{ uri: photo }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  closeIconButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    height: 240,
    width: '100%',
    position: 'relative',
    backgroundColor: '#F0F2F5',
  },
  pharmacyPhoto: {
    width: '100%',
    height: '100%',
  },
  photoUnavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F0F2F5' },
  photoUnavailableText: { color: '#667781', fontSize: 13, fontWeight: '600' },
  imageGradientOverlay: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  imageBadgesRow: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagBadge: {
    backgroundColor: WhatsAppColors.whatsappGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lightboxTriggerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lightboxTriggerText: {
    color: '#111B21',
    fontSize: 11,
    fontWeight: '900',
  },
  modalBody: {
    padding: 20,
  },
  pharmacyNameText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111B21',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: '#667781',
    lineHeight: 18,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E9EDEF',
    paddingTop: 14,
  },
  badgesGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadgeOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7FCE3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#25D366',
  },
  statusTextOpen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#008069',
  },
  statusBadgePartner: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusTextPartner: {
    fontSize: 11,
    fontWeight: '700',
    color: '#54656F',
  },
  mainCloseButton: {
    backgroundColor: '#111B21',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mainCloseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Lightbox
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
  },
  lightboxCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  lightboxImage: {
    width: screenWidth * 0.95,
    height: screenHeight * 0.8,
  },
});
