
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    COLORES_EMERGENCIAS as C,
    REGION_INICIAL_EMERGENCIAS,
    type UbicacionEmergencia,
} from '@/constants/emergencias';

type Props = {
  visible: boolean;
  ubicacion: UbicacionEmergencia | null;
  onUbicacionChange: (ubicacion: UbicacionEmergencia) => void;
  onConfirmar: () => void;
  onCerrar: () => void;
};

export default function SelectorUbicacion({
  visible,
  ubicacion,
  onUbicacionChange,
  onConfirmar,
  onCerrar,
}: Props) {
  const [regionInicial] = useState<Region>(() =>
    ubicacion
      ? {
          ...ubicacion,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }
      : REGION_INICIAL_EMERGENCIAS
  );

  const confirmar = () => {
    if (!ubicacion) {
      Alert.alert(
        'Selecciona una ubicación',
        'Toca el mapa para marcar el lugar.'
      );
      return;
    }

    onConfirmar();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCerrar}
    >
      <SafeAreaView style={styles.page}>
        <View style={styles.header}>
          <Pressable onPress={onCerrar} style={styles.back}>
            <Ionicons
              name="chevron-back"
              size={23}
              color={C.principal}
            />
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.title}>
              Seleccionar ubicación
            </Text>

            <Text style={styles.subtitle}>
              Toca el mapa para colocar un marcador
            </Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={regionInicial}
            onPress={(evento) => {
              const coordenadas = evento.nativeEvent.coordinate;

              onUbicacionChange({
                latitude: coordenadas.latitude,
                longitude: coordenadas.longitude,
              });
            }}
          >
            {ubicacion && (
              <Marker
                coordinate={ubicacion}
                pinColor={C.principal}
              />
            )}
          </MapView>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {ubicacion
              ? 'Punto marcado correctamente'
              : 'Selecciona el lugar en el mapa'}
          </Text>

          <Pressable
            style={styles.confirmar}
            onPress={confirmar}
          >
            <Text style={styles.confirmarText}>
              Confirmar ubicación
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: C.principal,
  },
  subtitle: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    minHeight: 250,
    marginHorizontal: 14,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borde,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  footer: {
    backgroundColor: C.blanco,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },
  footerText: {
    fontSize: 13,
    color: C.secundario,
    textAlign: 'center',
  },
  confirmar: {
    backgroundColor: C.principal,
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmarText: {
    color: C.blanco,
    fontWeight: '800',
    fontSize: 15,
  },
});
