import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, View, Text, StyleSheet, Image, TouchableOpacity, PanResponder, Animated, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Ellipse, G, Rect, Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { WhatsAppColors } from '@/constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MedicineModalProps {
  isOpen: boolean;
  medicineData: any;
  onClose: () => void;
  renderSvgFallback?: (name: string) => React.ReactNode;
}

function RenderLargeSvgBox({ name = "PARACÉTAMOL" }: { name: string }) {
  let colorStart = '#075E54';
  let colorEnd = '#008069';
  let strength = '500 mg • 16 Tablettes';
  
  if (name.toLowerCase().includes('quinine')) {
    colorStart = '#f97316';
    colorEnd = '#c2410c';
    strength = '300 mg • 10 Gélules';
  } else if (name.toLowerCase().includes('amox')) {
    colorStart = '#8b5cf6';
    colorEnd = '#6d28d9';
    strength = '250 mg • 12 Comprimés';
  }

  return (
    <Svg viewBox="0 0 240 180" width="100%" height="100%">
      <Defs>
        <LinearGradient id="large-boxGrad-modal" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="90%" stopColor="#f8fafc" />
          <Stop offset="100%" stopColor="#e2e8f0" />
        </LinearGradient>
        <LinearGradient id="large-accentGrad-modal" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={colorStart} />
          <Stop offset="100%" stopColor={colorEnd} />
        </LinearGradient>
      </Defs>
      <Ellipse cx="120" cy="155" rx="85" ry="8" fill="#0f172a" opacity="0.07" />
      
      <G x="30" y="20">
        <Rect width="180" height="120" rx="8" fill="url(#large-boxGrad-modal)" stroke="#cbd5e1" strokeWidth="1.2" />
        <Path d="M 0,8 A 8,8 0 0,1 8,0 L 172,0 A 8,8 0 0,1 180,8 L 180,36 L 0,36 Z" fill="url(#large-accentGrad-modal)" />
        <Line x1="1" y1="1" x2="179" y2="1" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
        <Circle cx="152" cy="80" r="12" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
        <Path d="M 148,80 L 156,80 M 152,76 L 152,84" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <Circle cx="152" cy="80" r="8" fill="none" stroke="#cbd5e1" strokeDasharray="2,2" strokeWidth="1" />
        <Rect x="16" y="8" width="22" height="14" rx="4" fill="#ffffff" opacity="0.95" />
        <SvgText x="20" y="19" fontFamily="System" fontSize="9" fontWeight="900" fill={colorEnd}>Rx</SvgText>
        <SvgText x="44" y="18" fontFamily="System" fontSize="9" fontWeight="800" fill="#ffffff" letterSpacing="1">KAMSOFT Rx</SvgText>
        <SvgText x="16" y="65" fontFamily="System" fontSize="18" fontWeight="900" fill="#0f172a">{name.toUpperCase()}</SvgText>
        <SvgText x="16" y="84" fontFamily="System" fontSize="11" fontWeight="800" fill="#475569">{strength.split(' • ')[0]}</SvgText>
        <SvgText x="16" y="98" fontFamily="System" fontSize="9.5" fontWeight="600" fill="#94a3b8">{strength.split(' • ')[1]}</SvgText>
        <Line x1="16" y1="112" x2="110" y2="112" stroke={colorStart} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
      </G>
    </Svg>
  );
}

export default function MedicineModal({ isOpen, medicineData, onClose, renderSvgFallback }: MedicineModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Animated Pan values avec useMemo (évite d'être détecté comme un ref mutable pendant le rendu)
  const pan = useMemo(() => new Animated.ValueXY({ x: 0, y: 0 }), []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setRotation(0);
    pan.setValue({ x: 0, y: 0 });
    pan.setOffset({ x: 0, y: 0 });
  }, [pan]);

  // PanResponder pour le déplacement tactile au doigt en mode zoom
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.setOffset({
            x: (pan.x as any)?._value ?? 0,
            y: (pan.y as any)?._value ?? 0,
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        ),
        onPanResponderRelease: () => {
          pan.flattenOffset();
        },
      }),
    [pan]
  );

  useEffect(() => {
    if (!isOpen) {
      let active = true;
      const handle = requestAnimationFrame(() => {
        if (active) {
          setIsFullscreen(false);
          handleResetZoom();
        }
      });
      return () => {
        active = false;
        cancelAnimationFrame(handle);
      };
    }
  }, [isOpen, medicineData, handleResetZoom]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4.0));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(prev - 0.5, 1.0);
      if (next === 1.0) {
        handleResetZoom();
      }
      return next;
    });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  if (!isOpen || !medicineData) return null;

  const medName = medicineData.name || medicineData.nom || "Médicament";
  const medImage = medicineData.image;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* 1. MODALE STANDARD */}
        <View style={styles.modalCard}>
          {/* Bouton Fermer */}
          <TouchableOpacity style={styles.closeIconButton} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Image & Zone d'incitation */}
          <TouchableOpacity
            style={styles.imagePreviewContainer}
            activeOpacity={0.9}
            onPress={() => setIsFullscreen(true)}
          >
            {medImage ? (
              <Image source={{ uri: medImage }} style={styles.medImage} resizeMode="contain" />
            ) : renderSvgFallback ? (
              renderSvgFallback(medName)
            ) : (
              <RenderLargeSvgBox name={medName} />
            )}

            <View style={styles.fullscreenTriggerOverlay}>
              <Ionicons name="expand-outline" size={16} color="#008069" />
              <Text style={styles.fullscreenTriggerText}>Plein écran (Inspecter)</Text>
            </View>
          </TouchableOpacity>

          {/* Informations produit */}
          <View style={styles.modalBody}>
            <View style={styles.badgeHeaderRow}>
              <View style={styles.packageTag}>
                <Text style={styles.packageTagText}>PACKAGING PRODUIT</Text>
              </View>

              <View style={styles.safetyTag}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#008069" />
                <Text style={styles.safetyTagText}>Vérification Santé</Text>
              </View>
            </View>

            <Text style={styles.medTitleText}>{medName.toUpperCase()}</Text>
            <Text style={styles.adviceText}>
              {"Vérifiez attentivement les mentions légales, le dosage et la notice sur l'emballage avant tout achat ou administration."}
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.fullscreenButton}
                onPress={() => setIsFullscreen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="expand" size={16} color="#FFFFFF" />
                <Text style={styles.fullscreenButtonText}>Plein Écran (Inspecter)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. MODE INSPECTION PLEIN ÉCRAN (LIGHTBOX HAUTE PRÉCISION) */}
        {isFullscreen && (
          <Modal
            visible={isFullscreen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsFullscreen(false)}
          >
            <View style={styles.inspectionBackdrop}>
              {/* Top Header */}
              <View style={styles.inspectionHeader}>
                <View style={styles.inspectionTitleGroup}>
                  <Ionicons name="shield-checkmark" size={22} color="#25D366" />
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.inspectionTitle}>{medName.toUpperCase()}</Text>
                      <View style={styles.medicalBadge}>
                        <Text style={styles.medicalBadgeText}>Inspection Médicale</Text>
                      </View>
                    </View>
                    <Text style={styles.inspectionSubtitle}>
                      {"Examinez la posologie, l'étiquette et les marquages de sécurité."}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.quitInspectionButton}
                  onPress={() => setIsFullscreen(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                  <Text style={styles.quitInspectionText}>Quitter</Text>
                </TouchableOpacity>
              </View>

              {/* Central Viewport for Zoom, Drag, Rotate */}
              <View style={styles.viewportContainer} {...panResponder.panHandlers}>
                <Animated.View
                  style={{
                    transform: [
                      ...pan.getTranslateTransform(),
                      { scale: zoomLevel },
                      { rotate: `${rotation}deg` },
                    ],
                  }}
                >
                  {medImage ? (
                    <Image
                      source={{ uri: medImage }}
                      style={styles.inspectionImage}
                      resizeMode="contain"
                    />
                  ) : renderSvgFallback ? (
                    renderSvgFallback(medName)
                  ) : (
                    <View style={{ width: screenWidth * 0.85, height: 260 }}>
                      <RenderLargeSvgBox name={medName} />
                    </View>
                  )}
                </Animated.View>

                {/* Readout floating badge when zoomed */}
                {zoomLevel > 1 && (
                  <View style={styles.zoomReadoutFloating}>
                    <Text style={styles.zoomReadoutFloatingText}>
                      Zoom: {Math.round(zoomLevel * 100)}% • Glisser pour déplacer
                    </Text>
                  </View>
                )}
              </View>

              {/* Bottom Inspection Toolbar */}
              <View style={styles.toolbarContainer}>
                <View style={styles.toolbarCapsule}>
                  {/* Zoom Out (-) */}
                  <TouchableOpacity
                    style={[styles.toolIconBtn, zoomLevel <= 1 && styles.toolIconBtnDisabled]}
                    onPress={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="remove" size={22} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Percentage Readout */}
                  <Text style={styles.percentageText}>{Math.round(zoomLevel * 100)}%</Text>

                  {/* Zoom In (+) */}
                  <TouchableOpacity
                    style={[styles.toolIconBtn, zoomLevel >= 4 && styles.toolIconBtnDisabled]}
                    onPress={handleZoomIn}
                    disabled={zoomLevel >= 4}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={22} color="#FFFFFF" />
                  </TouchableOpacity>

                  <View style={styles.toolDivider} />

                  {/* Rotate 90° */}
                  <TouchableOpacity style={styles.toolTextBtn} onPress={handleRotate} activeOpacity={0.8}>
                    <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.toolTextBtnLabel}>Pivoter 90°</Text>
                  </TouchableOpacity>

                  <View style={styles.toolDivider} />

                  {/* Reset */}
                  <TouchableOpacity style={styles.resetBtn} onPress={handleResetZoom} activeOpacity={0.8}>
                    <Text style={styles.resetBtnText}>Réinitialiser</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  imagePreviewContainer: {
    height: 220,
    width: '100%',
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 16,
  },
  medImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenTriggerOverlay: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    elevation: 2,
  },
  fullscreenTriggerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111B21',
  },
  modalBody: {
    padding: 20,
  },
  badgeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  packageTag: {
    backgroundColor: 'rgba(7, 94, 84, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  packageTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: WhatsAppColors.whatsappTeal,
  },
  safetyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7FCE3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  safetyTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#008069',
  },
  medTitleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111B21',
    marginBottom: 6,
  },
  adviceText: {
    fontSize: 13,
    color: '#667781',
    lineHeight: 18,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9EDEF',
    paddingTop: 14,
  },
  fullscreenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WhatsAppColors.whatsappGreen,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  fullscreenButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  closeButton: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#111B21',
    fontSize: 13,
    fontWeight: '700',
  },

  // Inspection Plein Écran
  inspectionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 44 : 20,
  },
  inspectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
    borderRadius: 16,
  },
  inspectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  inspectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  medicalBadge: {
    backgroundColor: WhatsAppColors.whatsappGreen,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  medicalBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  inspectionSubtitle: {
    color: '#8696A0',
    fontSize: 11,
    marginTop: 2,
  },
  quitInspectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  quitInspectionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  viewportContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  inspectionImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.55,
  },
  zoomReadoutFloating: {
    position: 'absolute',
    top: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomReadoutFloatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  toolbarContainer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  toolbarCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toolIconBtn: {
    padding: 6,
  },
  toolIconBtnDisabled: {
    opacity: 0.3,
  },
  percentageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    minWidth: 44,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toolDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  toolTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  toolTextBtnLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  resetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
