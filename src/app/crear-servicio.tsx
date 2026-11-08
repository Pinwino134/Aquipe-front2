import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SelectorUbicacion,
  type UbicacionElegida,
} from '@/components/selector-ubicacion';
import {
  Api,
  type Categoria,
  type Direccion,
  type Modalidad,
  type TipoPrecio,
  type Urgencia,
} from '@/lib/api';
import { emojiCategoria, mostrarError } from '@/lib/ui';

const C = {
  principal: '#146C67',
  fondo: '#F6F7F3',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
};

const PRECIOS: { v: TipoPrecio; t: string }[] = [
  { v: 'FIJO', t: 'Precio fijo' },
  { v: 'POR_HORA', t: 'Por hora' },
  { v: 'A_CONVENIR', t: 'A convenir' },
];
const MODALIDADES: { v: Modalidad; t: string }[] = [
  { v: 'DOMICILIO', t: 'A domicilio' },
  { v: 'EN_LOCAL', t: 'En mi local' },
  { v: 'VIRTUAL', t: 'Virtual' },
];
const URGENCIAS: { v: Urgencia; t: string }[] = [
  { v: 'BAJA', t: 'Baja' },
  { v: 'MEDIA', t: 'Media' },
  { v: 'ALTA', t: 'Alta' },
];

const numero = (t: string) => {
  const n = parseFloat(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function Chips<T extends string>({
  opciones,
  valor,
  onChange,
}: {
  opciones: { v: T; t: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.chips}>
      {opciones.map((o) => (
        <Pressable
          key={o.v}
          style={[s.chip, valor === o.v && s.chipOn]}
          onPress={() => onChange(o.v)}
        >
          <Text style={[s.chipTxt, valor === o.v && s.chipTxtOn]}>{o.t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function CrearServicio() {
  const [direccion, setDireccion] = useState<Direccion>('OFRECE');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoPrecio, setTipoPrecio] = useState<TipoPrecio>('FIJO');
  const [monto, setMonto] = useState('');
  const [presMin, setPresMin] = useState('');
  const [presMax, setPresMax] = useState('');
  const [modalidad, setModalidad] = useState<Modalidad>('DOMICILIO');
  const [radio, setRadio] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('');
  const [urgencia, setUrgencia] = useState<Urgencia>('MEDIA');
  const [ubic, setUbic] = useState<UbicacionElegida | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Api.categorias('SERVICIO')
      .then(setCategorias)
      .catch((e) => mostrarError(e, 'No se pudieron cargar las categorías'));
  }, []);

  const ofrece = direccion === 'OFRECE';

  const publicar = async () => {
    if (enviando) return;
    const falta = (m: string) => Alert.alert('Revisa el formulario', m);

    if (!titulo.trim()) return falta('Escribe un título para tu publicación.');
    if (!descripcion.trim()) return falta('Describe el servicio con algo de detalle.');
    if (categoriaId == null) return falta('Elige una categoría.');
    if (!ubic) return falta('Elige la ubicación en el mapa.');

    const servicio: Record<string, unknown> = { modalidad, urgencia: 'MEDIA' };

    if (ofrece) {
      servicio.tipo_precio = tipoPrecio;
      if (tipoPrecio !== 'A_CONVENIR') {
        const m = numero(monto);
        if (m == null || m <= 0) return falta('Indica el precio (mayor a 0).');
        servicio.monto = m;
      }
      const r = numero(radio);
      if (r != null) servicio.radio_km = r;
      if (disponibilidad.trim()) servicio.disponibilidad = disponibilidad.trim().slice(0, 200);
    } else {
      const mn = numero(presMin);
      const mx = numero(presMax);
      if (mn != null && mx != null && mx < mn)
        return falta('El presupuesto máximo no puede ser menor al mínimo.');
      if (mn != null) servicio.presupuesto_min = mn;
      if (mx != null) servicio.presupuesto_max = mx;
      servicio.urgencia = urgencia;
    }

    setEnviando(true);
    try {
      await Api.crearPublicacion({
        tipo: 'SERVICIO',
        direccion,
        categoria_id: categoriaId,
        titulo: titulo.trim().slice(0, 80),
        descripcion: descripcion.trim().slice(0, 1000),
        zona_id: ubic.zonaId,
        latitud: ubic.latitude,
        longitud: ubic.longitude,
        servicio,
      });
      Alert.alert(
        ofrece ? '¡Servicio publicado!' : '¡Solicitud publicada!',
        'Ya es visible para tus vecinos.',
        [{ text: 'Entendido', onPress: () => router.replace('/servicios') }]
      );
    } catch (e) {
      mostrarError(e, 'No se pudo publicar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.header}>
          <Pressable
            style={s.back}
            onPress={() => router.back()}
            accessibilityLabel="Regresar"
          >
            <Ionicons name="chevron-back" size={23} color={C.principal} />
          </Pressable>
          <Text style={s.title}>Publicar servicio</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Chips
            opciones={[
              { v: 'OFRECE' as Direccion, t: 'Ofrezco un servicio' },
              { v: 'SOLICITA' as Direccion, t: 'Busco un profesional' },
            ]}
            valor={direccion}
            onChange={setDireccion}
          />

          <Text style={s.label}>Categoría</Text>
          <View style={s.chips}>
            {categorias.map((c) => (
              <Pressable
                key={c.id}
                style={[s.chip, categoriaId === c.id && s.chipOn]}
                onPress={() => setCategoriaId(c.id)}
              >
                <Text style={[s.chipTxt, categoriaId === c.id && s.chipTxtOn]}>
                  {emojiCategoria(c.nombre)} {c.nombre}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Título</Text>
          <TextInput
            style={s.input}
            placeholder={ofrece ? 'Ej. Gasfitero a domicilio' : 'Ej. Necesito pintar mi sala'}
            placeholderTextColor={C.secundario}
            value={titulo}
            onChangeText={setTitulo}
            maxLength={80}
          />

          <Text style={s.label}>Descripción</Text>
          <TextInput
            style={[s.input, s.area]}
            placeholder="Cuenta los detalles: experiencia, materiales, horarios…"
            placeholderTextColor={C.secundario}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />

          {ofrece ? (
            <>
              <Text style={s.label}>Precio</Text>
              <Chips opciones={PRECIOS} valor={tipoPrecio} onChange={setTipoPrecio} />
              {tipoPrecio !== 'A_CONVENIR' && (
                <View style={s.montoFila}>
                  <Text style={s.moneda}>S/</Text>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder={tipoPrecio === 'POR_HORA' ? 'Monto por hora' : 'Monto'}
                    placeholderTextColor={C.secundario}
                    value={monto}
                    onChangeText={setMonto}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}

              <Text style={s.label}>Radio de atención (km, opcional)</Text>
              <TextInput
                style={s.input}
                placeholder="Ej. 5"
                placeholderTextColor={C.secundario}
                value={radio}
                onChangeText={setRadio}
                keyboardType="decimal-pad"
              />

              <Text style={s.label}>Disponibilidad (opcional)</Text>
              <TextInput
                style={s.input}
                placeholder="Ej. Lun a Sáb, 8am – 6pm"
                placeholderTextColor={C.secundario}
                value={disponibilidad}
                onChangeText={setDisponibilidad}
                maxLength={200}
              />
            </>
          ) : (
            <>
              <Text style={s.label}>Presupuesto en soles (opcional)</Text>
              <View style={s.montoFila}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Mínimo"
                  placeholderTextColor={C.secundario}
                  value={presMin}
                  onChangeText={setPresMin}
                  keyboardType="decimal-pad"
                />
                <Text style={s.moneda}>–</Text>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="Máximo"
                  placeholderTextColor={C.secundario}
                  value={presMax}
                  onChangeText={setPresMax}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={s.label}>Urgencia</Text>
              <Chips opciones={URGENCIAS} valor={urgencia} onChange={setUrgencia} />
            </>
          )}

          <Text style={s.label}>Modalidad</Text>
          <Chips opciones={MODALIDADES} valor={modalidad} onChange={setModalidad} />

          <Text style={s.label}>
            {ofrece ? 'Ubicación de tu servicio' : 'Dónde se necesita'}
          </Text>
          <SelectorUbicacion value={ubic} onChange={setUbic} />

          <Pressable
            style={[s.boton, enviando && { opacity: 0.7 }]}
            onPress={publicar}
            disabled={enviando}
            accessibilityRole="button"
          >
            {enviando ? (
              <ActivityIndicator color={C.blanco} />
            ) : (
              <Text style={s.botonTxt}>Publicar</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.fondo },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: C.texto },
  content: { padding: 20, paddingBottom: 50 },
  label: { fontSize: 14, fontWeight: '700', color: C.texto, marginTop: 18, marginBottom: 8 },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.texto,
  },
  area: { minHeight: 100, paddingTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
  },
  chipOn: { backgroundColor: C.principal, borderColor: C.principal },
  chipTxt: { fontSize: 14, color: C.texto, fontWeight: '600' },
  chipTxtOn: { color: C.blanco },
  montoFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  moneda: { fontSize: 16, fontWeight: '800', color: C.principal },
  boton: {
    marginTop: 28,
    height: 54,
    borderRadius: 16,
    backgroundColor: C.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTxt: { color: C.blanco, fontSize: 16, fontWeight: '800' },
});
