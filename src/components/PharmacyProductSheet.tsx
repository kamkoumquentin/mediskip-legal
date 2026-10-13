import { formatDistance } from "@/utils/geo";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface PharmacyProductSheetItem {
  prix: string;
  disponibilite: "en_stock" | "rupture";
  image?: string;
  distance?: number | null;
  pharmacie: { nom: string; emplacement: string; photo?: string };
  medicament: { nom: string; forme?: string; laboratoire?: string };
}

export default function PharmacyProductSheet({ item, isVisible, onClose, onOpenCatalog }: { item: PharmacyProductSheetItem | null; isVisible: boolean; onClose: () => void; onOpenCatalog: () => void }) {
  const [renderItem, setRenderItem] = useState(item);
  const [fullScreenImageUri, setFullScreenImageUri] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (isVisible && item) {
      setRenderItem(item);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setRenderItem(null);
      });
    }
  }, [isVisible, item, slideAnim]);

  if (!renderItem) return null;

  const inStock = renderItem.disponibilite !== "rupture";

  return (
    <>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        {/* 1. GRANDE IMAGE DU MÉDICAMENT */}
        <View style={styles.imageContainer}>
          {renderItem.image ? (
            <TouchableOpacity onPress={() => setFullScreenImageUri(renderItem.image!)}>
              <Image source={{ uri: renderItem.image }} style={styles.mainImage} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View style={styles.mainImagePlaceholder}>
              <Ionicons name="medkit-outline" size={64} color="#087E6B" />
            </View>
          )}

          {/* X de fermeture */}
          <TouchableOpacity style={styles.close} onPress={onClose} accessibilityLabel="Fermer la fiche">
            <Ionicons name="close" size={20} color="#40504B" />
          </TouchableOpacity>

          {/* Badge Photo Pharmacie */}
          {renderItem.pharmacie.photo && (
            <TouchableOpacity
              style={styles.pharmacyBadgeWrapper}
              onPress={() => setFullScreenImageUri(renderItem.pharmacie.photo!)}
            >
              <Image source={{ uri: renderItem.pharmacie.photo }} style={styles.pharmacyBadge} resizeMode="cover" />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. INFORMATIONS PHARMACIE */}
        <View style={styles.pharmacyInfoContainer}>
          <Ionicons name="business-outline" size={24} color="#087E6B" style={styles.pharmacyIcon} />
          <View style={styles.pharmacyTextContainer}>
            <Text style={styles.pharmacyName} numberOfLines={2}>{renderItem.pharmacie.nom}</Text>
            <Text style={styles.location} numberOfLines={1}>
              {renderItem.pharmacie.emplacement}
              {renderItem.distance != null ? ` · ${formatDistance(renderItem.distance)}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 3. NOM DU MÉDICAMENT ET DISPONIBILITÉ */}
        <View style={styles.medicineInfoContainer}>
          <Text style={styles.medicineName}>{renderItem.medicament.nom}</Text>
          {(renderItem.medicament.forme || renderItem.medicament.laboratoire) && (
            <Text style={styles.medicineSecondary}>
              {[renderItem.medicament.forme, renderItem.medicament.laboratoire].filter(Boolean).join(" · ")}
            </Text>
          )}
          <View style={[styles.status, !inStock && styles.statusOut]}>
            <Text style={[styles.statusText, !inStock && styles.statusTextOut]}>
              {inStock ? "● En stock" : "● Rupture"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 4. PRIX */}
        <Text style={styles.price}>{renderItem.prix}</Text>

        {/* 5. BOUTON CATALOGUE */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.catalog} onPress={onOpenCatalog}>
            <Text style={styles.catalogText}>Catalogue de cette pharmacie</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* VISIONNEUSE PLEIN ÉCRAN */}
      <Modal visible={!!fullScreenImageUri} transparent={true} animationType="fade" onRequestClose={() => setFullScreenImageUri(null)}>
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.fullScreenClose} onPress={() => setFullScreenImageUri(null)} accessibilityLabel="Fermer l'image">
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          {fullScreenImageUri && (
            <Image source={{ uri: fullScreenImageUri }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    width: "92%",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 12,
    elevation: 12,
    marginBottom: 16, // Espacement bas
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#D9E1DE",
    marginBottom: 16,
  },
  imageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: "#EEF3F1",
    marginBottom: 16,
    position: "relative",
  },
  mainImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  mainImagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#EEF6F3",
    justifyContent: "center",
    alignItems: "center",
  },
  close: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  pharmacyBadgeWrapper: {
    position: "absolute",
    bottom: -16,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    padding: 2,
    borderWidth: 2,
    borderColor: "#087E6B",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  pharmacyBadge: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    backgroundColor: "#EEF3F1",
  },
  pharmacyInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginTop: 8, // Ajout d'une marge car le badge chevauche
  },
  pharmacyIcon: {
    marginRight: 10,
  },
  pharmacyTextContainer: {
    flex: 1,
    paddingRight: 40, // Éviter chevauchement avec le badge
  },
  pharmacyName: {
    color: "#14332D",
    fontSize: 16,
    fontWeight: "800",
    flexShrink: 1,
  },
  location: {
    color: "#64736D",
    fontSize: 13,
    marginTop: 2,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#E9EEEC",
    marginVertical: 12,
  },
  medicineInfoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  medicineName: {
    textAlign: "center",
    color: "#14332D",
    fontWeight: "800",
    fontSize: 18,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  medicineSecondary: {
    textAlign: "center",
    color: "#64736D",
    fontSize: 13,
    marginBottom: 10,
  },
  status: {
    backgroundColor: "#E7F7ED",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOut: {
    backgroundColor: "#FCE8E6",
  },
  statusText: {
    color: "#188552",
    fontSize: 13,
    fontWeight: "700",
  },
  statusTextOut: {
    color: "#B3261E",
  },
  price: {
    textAlign: "center",
    color: "#087E6B",
    fontSize: 26,
    fontWeight: "900",
    marginVertical: 4,
  },
  actions: {
    marginTop: 12,
  },
  catalog: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#087E6B",
    alignItems: "center",
    justifyContent: "center",
  },
  catalogText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 15,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenClose: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 2,
    padding: 8,
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
});
