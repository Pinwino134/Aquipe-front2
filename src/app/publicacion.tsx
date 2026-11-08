import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Api, type Publicacion } from '@/lib/api';
import { getUsuario } from '@/lib/session';
import {
  COLOR_TIPO,
  ESTADO_TEXTO,
  distanciaTexto,
  emojiCategoria,
  mostrarError,
  textoPrecio,
  tiempoRelativo,
} from '@/lib/ui';

const C = {
  principal: '#146C67',
  fondo: '#F6F7F3',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
};

const MODALIDAD: Record<string, string> = {
  DOMICILIO: 'A domicilio',
  EN_LOCAL: 'En local',
  VIRTUAL: 'Virtual',
};

export default function DetallePublicacion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<Publicacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [precio, setPrecio] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Api.publicacion(id)
      .then(setP)
      .catch((e) => mostrarError(e, 'No se pudo cargar la publicación'))
      .finally(() => setCargando(false));
  }, [id]);

  const mio = p?.autor.id === getUsuario()?.id;
  const puedeResponder = !!p && !mio && p.estado === 'ABIERTA' && p.tipo !== 'RECURSO';

  const etiquetaBoton = !p
    ? ''
    : p.tipo === 'EMERGENCIA'
      ? 'Ofrecer ayuda'
      : p.direccion === 'OFRECE'
        ? p.tipo === 'SERVICIO'
          ? 'Contratar / pedir contacto'
          : 'Pedir este favor'
        : 'Postularme';

  const enviar = async () => {
    if (!p || enviando) return;
    if (!mensaje.trim()) {
      Alert.alert('Falta el mensaje', 'Escribe un mensaje para el autor.');
      return;
    }
    const monto = precio.trim() ? parseFloat(precio.replace(',', '.')) : undefined;
    if (monto !== undefined && (Number.isNaN(monto) || monto < 0)) {
      Alert.alert('Precio inválido', 'Escribe un monto válido o déjalo vacío.');
      return;
    }
    setEnviando(true);
    try {
      await Api.responder(p.id, mensaje.trim().slice(0, 500), monto);
      Alert.alert('¡Enviado!', 'Podrás seguirlo en Actividad → Enviadas.', [
        { text: 'Ver actividad', onPress: () => router.replace('/actividad') },
        { text: 'Cerrar', onPress: () => router.back() },
      ]);
    } catch (e) {
      mostrarError(e, 'No se pudo enviar');
    } finally {
      setEnviando(false);
    }
  };

  const color = p ? COLOR_TIPO[p.tipo] : C.principal;
  const sv = p?.servicio;
  const em = p?.emergencia;

  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()} accessibilityLabel="Regresar">
          <Ionicons name="chevron-back" size={23} color={C.principal} />
        </Pressable>
        <Text style={s.title}>Detalle</Text>
      </View>

      {cargando || !p ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.principal} />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            <View style={s.card}>
              <View style={s.fila}>
                <View style={[s.tag, { backgroundColor: color + '22' }]}>
                  <Text style={[s.tagTxt, { color }]}>
                    {p.tipo} · {p.direccion === 'OFRECE' ? 'Ofrece' : 'Solicita'}
                  </Text>
                </View>
                <Text style={s.meta}>{ESTADO_TEXTO[p.estado] ?? p.estado}</Text>
              </View>
              <Text style={s.titulo}>
                {emojiCategoria(p.categoria?.nombre)} {p.titulo}
              </Text>
              <Text style={s.texto}>{p.descripcion}</Text>
              <Text style={s.meta}>
                {tiempoRelativo(p.created_at)}
                {p.zona ? ` · ${p.zona.nombre}` : ''}
                {p.distancia_km != null ? ` · ${distanciaTexto(p.distancia_km)}` : ''}
              </Text>
            </View>

            {sv && (
              <View style={s.card}>
                <Text style={s.seccion}>Condiciones</Text>
                <Text style={s.precio}>{textoPrecio(p)}</Text>
                <Text style={s.meta}>Modalidad: {MODALIDAD[sv.modalidad] ?? sv.modalidad}</Text>
                {sv.radio_km != null && <Text style={s.meta}>Radio de atención: {sv.radio_km} km</Text>}
                {sv.disponibilidad ? <Text style={s.meta}>Disponibilidad: {sv.disponibilidad}</Text> : null}
                {p.direccion === 'SOLICITA' && <Text style={s.meta}>Urgencia: {sv.urgencia}</Text>}
              </View>
            )}

            {em && (
              <View style={s.card}>
                <Text style={s.seccion}>Emergencia</Text>
                <Text style={s.meta}>Nivel de urgencia: {em.nivel_urgencia}</Text>
                {em.detalle_cantidad ? <Text style={s.meta}>Cantidad: {em.detalle_cantidad}</Text> : null}
              </View>
            )}

            <Pressable
              style={s.card}
              onPress={() => router.push({ pathname: '/usuario', params: { id: p.autor.id } })}
            >
              <Text style={s.seccion}>Publicado por</Text>
              <Text style={[s.texto, { fontWeight: '700', color: C.principal }]}>
                {p.autor.nombre_completo} ›
              </Text>
              <Text style={s.meta}>
                ★ {p.autor.calificacion_promedio.toFixed(1)} · {p.autor.total_resenas} reseñas
              </Text>
            </Pressable>

            {p.latitud != null && p.longitud != null && (
              <View style={s.mapa}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  initialRegion={{
                    latitude: p.latitud,
                    longitude: p.longitud,
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                  }}
                >
                  <Marker coordinate={{ latitude: p.latitud, longitude: p.longitud }} pinColor={color} />
                </MapView>
              </View>
            )}

            {mio && (
              <Pressable style={s.btn} onPress={() => router.push('/actividad')}>
                <Text style={s.btnTxt}>Ver respuestas en Actividad</Text>
              </Pressable>
            )}

            {puedeResponder && (
              <View style={s.card}>
                <Text style={s.seccion}>{etiquetaBoton}</Text>
                <TextInput
                  style={[s.input, { minHeight: 80, paddingTop: 12 }]}
                  placeholder="Escribe tu mensaje…"
                  placeholderTextColor={C.secundario}
                  value={mensaje}
                  onChangeText={setMensaje}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                {p.tipo === 'SERVICIO' && (
                  <TextInput
                    style={s.input}
                    placeholder="Precio que propones en S/ (opcional)"
                    placeholderTextColor={C.secundario}
                    value={precio}
                    onChangeText={setPrecio}
                    keyboardType="decimal-pad"
                  />
                )}
                <Pressable style={[s.btn, enviando && { opacity: 0.7 }]} onPress={enviar} disabled={enviando}>
                  {enviando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Enviar</Text>}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.fondo },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.verdeClaro, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: C.texto },
  content: { padding: 20, paddingBottom: 60, gap: 14 },
  card: { backgroundColor: C.blanco, borderRadius: 18, borderWidth: 1, borderColor: C.borde, padding: 16, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tagTxt: { fontSize: 12, fontWeight: '800' },
  titulo: { fontSize: 20, fontWeight: '800', color: C.texto },
  seccion: { fontSize: 15, fontWeight: '800', color: C.texto },
  texto: { fontSize: 15, color: C.texto },
  precio: { fontSize: 20, fontWeight: '800', color: C.principal },
  meta: { fontSize: 13, color: C.secundario },
  mapa: { height: 160, borderRadius: 18, overflow: 'hidden' },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.borde, backgroundColor: C.fondo, paddingHorizontal: 14, fontSize: 15, color: C.texto },
  btn: { height: 50, borderRadius: 15, backgroundColor: C.principal, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
