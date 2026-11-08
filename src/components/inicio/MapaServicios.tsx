
import type { Publicacion } from '@/lib/api';
import { COLOR_TIPO } from '@/lib/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import type { Region } from 'react-native-maps';
import MapView, { Marker } from 'react-native-maps';

interface MapaServiciosProps {
  mapaRef: React.RefObject<MapView | null>;
  region: Region;
  ubicacionPermitida: boolean;
  serviciosCercanos: Publicacion[];
  onCentrarUbicacion: () => void;
}

const C = {
  principal: '#146C67',
  secundario: '#526A67',
  texto: '#243746',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
};

export default function MapaServicios({
  mapaRef,
  region,
  ubicacionPermitida,
  serviciosCercanos,
  onCentrarUbicacion,
}: MapaServiciosProps) {
  return (
    <View style={styles.nearbySection}>
      <View style={styles.nearbyHeader}>
        <View style={styles.nearbyHeaderText}>
          <Text style={styles.nearbyTitle}>
            Servicios cerca de ti
          </Text>

          <Text style={styles.nearbyDescription}>
            Explora lo que ofrece tu comunidad
          </Text>
        </View>

        <Pressable
          style={styles.locationButton}
          onPress={onCentrarUbicacion}
          accessibilityRole="button"
          accessibilityLabel="Centrar mapa en mi ubicación"
        >
          <Ionicons
            name="locate"
            size={23}
            color={C.principal}
          />
        </Pressable>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapaRef}
          style={styles.mapPreview}
          initialRegion={region}
          showsUserLocation={ubicacionPermitida}
          showsCompass
          zoomEnabled
          scrollEnabled
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {serviciosCercanos
            .filter(
              (servicio) =>
                servicio.latitud != null &&
                servicio.longitud != null
            )
            .map((servicio) => (
              <Marker
                key={servicio.id}
                coordinate={{
                  latitude: servicio.latitud as number,
                  longitude: servicio.longitud as number,
                }}
                title={servicio.titulo}
                description={servicio.autor.nombre_completo}
                pinColor={COLOR_TIPO.SERVICIO}
              />
            ))}
        </MapView>
      </View>

      <View style={styles.mapInfoRow}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={C.secundario}
        />

        <Text style={styles.mapInfoText}>
          {serviciosCercanos.length === 0
            ? 'No hay servicios publicados cerca todavía'
            : `${serviciosCercanos.length} servicios publicados cerca de ti`}
        </Text>
      </View>

      <Pressable
        style={styles.mapFooter}
        onPress={() => router.push('/mapa')}
        accessibilityRole="button"
        accessibilityLabel="Explorar mapa completo"
      >
        <Text style={styles.mapFooterText}>
          Explorar servicios cercanos
        </Text>

        <Ionicons
          name="arrow-forward"
          size={19}
          color={C.principal}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nearbySection: {
    marginBottom: 25,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  nearbyHeaderText: {
    flex: 1,
  },
  nearbyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: C.texto,
  },
  nearbyDescription: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 4,
  },
  locationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borde,
  },
  mapPreview: {
    flex: 1,
  },
  mapInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
  },
  mapInfoText: {
    flex: 1,
    fontSize: 11,
    color: C.secundario,
  },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    marginTop: 8,
  },
  mapFooterText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.principal,
  },
});
