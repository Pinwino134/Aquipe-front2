import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CENTRO_AREQUIPA,
  etiquetaUbicacion,
  obtenerUbicacion,
  zonaMasCercana,
} from '@/lib/ui';

export type UbicacionElegida = {
  latitude: number;
  longitude: number;
  zonaId: number | null;
  etiqueta: string;
};

type Props = {
  value: UbicacionElegida | null;
  onChange: (u: UbicacionElegida | null) => void;
  placeholder?: string;
};

const C = {
  principal: '#146C67',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
};

type Punto = { latitude: number; longitude: number };

/**
 * Campo de ubicación: al tocarlo abre un mapa para marcar el punto exacto.
 * Devuelve coordenadas, la zona más cercana del catálogo y un texto legible.
 */
export function SelectorUbicacion({
  value,
  onChange,
  placeholder = 'Toca para elegir en el mapa',
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [punto, setPunto] = useState<Punto | null>(null);
  const [centro, setCentro] = useState<Punto>(CENTRO_AREQUIPA);
  const [ocupado, setOcupado] = useState(false);

  const abrir = async () => {
    setPunto(value ? { latitude: value.latitude, longitude: value.longitude } : null);
    if (value) setCentro({ latitude: value.latitude, longitude: value.longitude });
    setAbierto(true);
    if (!value) {
      const pos = await obtenerUbicacion();
      setCentro(pos);
    }
  };

  const usarMiUbicacion = async () => {
    setOcupado(true);
    const pos = await obtenerUbicacion();
    setCentro(pos);
    setPunto(pos);
    setOcupado(false);
  };

  const confirmar = async () => {
    if (!punto) return;
    setOcupado(true);
    const [zona, etiqueta] = await Promise.all([
      zonaMasCercana(punto.latitude, punto.longitude),
      etiquetaUbicacion(punto.latitude, punto.longitude),
    ]);
    onChange({
      ...punto,
      zonaId: zona?.id ?? null,
      etiqueta: zona ? `${etiqueta} · ${zona.nombre}` : etiqueta,
    });
    setOcupado(false);
    setAbierto(false);
  };

  return (
    <>
      <Pressable
        style={s.campo}
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel="Elegir ubicación en el mapa"
      >
        <Ionicons
          name={value ? 'location' : 'map-outline'}
          size={20}
          color={C.principal}
        />
        <Text
          style={[s.campoTexto, !value && { color: C.secundario }]}
          numberOfLines={2}
        >
          {value ? value.etiqueta : placeholder}
        </Text>
        {value ? (
          <Pressable
            hitSlop={10}
            onPress={() => onChange(null)}
            accessibilityLabel="Quitar ubicación"
          >
            <Ionicons name="close-circle" size={19} color={C.secundario} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={C.secundario} />
        )}
      </Pressable>

      <Modal
        visible={abierto}
        animationType="slide"
        onRequestClose={() => setAbierto(false)}
      >
        <SafeAreaView style={s.modal}>
          <View style={s.cabecera}>
            <Pressable
              style={s.cerrar}
              onPress={() => setAbierto(false)}
              accessibilityLabel="Cerrar mapa"
            >
              <Ionicons name="close" size={22} color={C.principal} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.titulo}>Elegir ubicación</Text>
              <Text style={s.sub}>Toca el mapa para colocar el marcador</Text>
            </View>
          </View>

          <View style={s.mapaBox}>
            <MapView
              key={`${centro.latitude}-${centro.longitude}`}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                ...centro,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
              showsUserLocation
              onPress={(e) => setPunto(e.nativeEvent.coordinate)}
            >
              {punto && <Marker coordinate={punto} pinColor={C.principal} />}
            </MapView>

            <Pressable
              style={s.miUbicacion}
              onPress={usarMiUbicacion}
              accessibilityLabel="Usar mi ubicación actual"
            >
              <Ionicons name="locate" size={22} color={C.principal} />
            </Pressable>
          </View>

          <View style={s.pie}>
            <Pressable
              style={[s.confirmar, !punto && { opacity: 0.5 }]}
              onPress={confirmar}
              disabled={!punto || ocupado}
              accessibilityRole="button"
            >
              {ocupado ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={s.confirmarTexto}>
                  {punto ? 'Confirmar ubicación' : 'Marca un punto en el mapa'}
                </Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
  },
  campoTexto: { flex: 1, fontSize: 15, color: C.texto },
  modal: { flex: 1, backgroundColor: '#F6F7F3' },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  cerrar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 18, fontWeight: '800', color: C.texto },
  sub: { fontSize: 13, color: C.secundario },
  mapaBox: { flex: 1, marginHorizontal: 14, borderRadius: 18, overflow: 'hidden' },
  miUbicacion: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  pie: { padding: 16 },
  confirmar: {
    height: 52,
    borderRadius: 16,
    backgroundColor: C.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmarTexto: { color: C.blanco, fontSize: 16, fontWeight: '800' },
});
