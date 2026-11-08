import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  guardarContactos,
  guardarMedicos,
  leerContactos,
  leerMedicos,
  leerPuestos,
  type Contacto,
  type PuestoGuardado,
} from '@/lib/offline';

const C = {
  rojo: '#D9402B',
  fondo: '#F6F7F3',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
  principal: '#146C67',
};

const NUMEROS = [
  { n: '105', t: 'Policía', i: 'shield' as const, c: '#168BE0' },
  { n: '116', t: 'Bomberos', i: 'flame' as const, c: '#E5533D' },
  { n: '106', t: 'SAMU (ambulancia)', i: 'medkit' as const, c: '#18B69A' },
  { n: '115', t: 'Defensa Civil', i: 'warning' as const, c: '#F28B30' },
  { n: '100', t: 'Violencia familiar', i: 'heart' as const, c: '#F05A7E' },
  { n: '113', t: 'Salud (MINSA)', i: 'pulse' as const, c: '#7A5AF0' },
];

const GUIAS: { t: string; i: string; pasos: string[] }[] = [
  {
    t: 'Persona inconsciente que no respira (RCP)',
    i: '❤️',
    pasos: [
      'Verifica que el lugar sea seguro. Toca sus hombros y háblale fuerte.',
      'Si no responde y no respira (o solo boquea), pide a alguien que llame al 106 o llama tú.',
      'Coloca el talón de una mano en el centro del pecho, la otra encima, brazos rectos.',
      'Presiona fuerte y rápido: unos 5–6 cm de profundidad, 100 a 120 veces por minuto.',
      'Deja que el pecho suba por completo entre compresiones. No pares hasta que llegue ayuda o la persona reaccione.',
      'Si hay un desfibrilador (DEA), enciéndelo y sigue sus instrucciones.',
    ],
  },
  {
    t: 'Hemorragia (sangrado fuerte)',
    i: '🩸',
    pasos: [
      'Presiona directamente la herida con un paño limpio o ropa, sin soltar.',
      'Si el paño se empapa, agrega otro encima; no retires el primero.',
      'No retires objetos clavados: presiona alrededor de ellos.',
      'Si no hay fractura, eleva la zona herida por encima del corazón.',
      'Llama al 106. El torniquete es el último recurso en una extremidad con sangrado que no se detiene.',
    ],
  },
  {
    t: 'Quemaduras',
    i: '🔥',
    pasos: [
      'Aleja a la persona de la fuente de calor.',
      'Enfría la quemadura con agua fresca corriente durante 10 a 20 minutos.',
      'No uses hielo, pasta dental, aceite ni cremas caseras. No revientes ampollas.',
      'Retira anillos y ropa suelta, salvo que estén pegados a la piel.',
      'Cubre con un paño limpio y húmedo. Si es grande, en cara o manos, llama al 106.',
    ],
  },
  {
    t: 'Atragantamiento (adulto)',
    i: '😮',
    pasos: [
      'Si puede toser o hablar, anímalo a seguir tosiendo.',
      'Si no puede respirar, toser ni hablar: inclínalo hacia adelante y da 5 golpes firmes entre los omóplatos.',
      'Luego 5 compresiones abdominales: puño sobre el ombligo, jalando hacia adentro y arriba.',
      'Alterna golpes y compresiones hasta que expulse el objeto.',
      'Si pierde el conocimiento, llama al 106 y empieza RCP.',
    ],
  },
  {
    t: 'Fracturas y golpes fuertes',
    i: '🦴',
    pasos: [
      'No muevas a la persona si hay golpe en cabeza, cuello o espalda; espera ayuda.',
      'Inmoviliza la zona tal como está, sin intentar acomodar el hueso.',
      'Aplica frío envuelto en tela (nunca directo sobre la piel).',
      'Llama al 106 si hay deformidad, sangrado abundante o dolor intenso.',
    ],
  },
  {
    t: 'Sismo',
    i: '🏚️',
    pasos: [
      'Mantén la calma. Agáchate, cúbrete bajo una mesa resistente y sujétate; aléjate de ventanas y objetos que caigan.',
      'No uses ascensores ni corras a la salida mientras tiembla.',
      'Al terminar, evacúa con calma por las escaleras hacia una zona segura abierta.',
      'Si hueles gas, no enciendas fuego ni luces: ventila y cierra la llave.',
      'Cuidado con réplicas. Sintoniza una radio y sigue las indicaciones de Defensa Civil (115).',
    ],
  },
  {
    t: 'Huaico o lluvias fuertes',
    i: '🌧️',
    pasos: [
      'Aléjate de quebradas, ríos y cauces secos; sube a zonas altas y firmes.',
      'No cruces corrientes de agua, aunque parezcan poco profundas.',
      'Desconecta la electricidad si el agua entra a tu vivienda.',
      'Avisa a Defensa Civil (115) y a tus vecinos.',
    ],
  },
  {
    t: 'Incendio',
    i: '🧯',
    pasos: [
      'Da la alarma y llama al 116. Sal de inmediato, no recojas objetos.',
      'Si hay humo, avanza agachado y cubre nariz y boca con un paño húmedo.',
      'Antes de abrir una puerta, toca la madera: si está caliente, no la abras.',
      'No uses ascensores. Cierra las puertas detrás de ti.',
      'Si se prende tu ropa: no corras, detente, tírate al suelo y rueda.',
    ],
  },
];

export default function EmergenciaOffline() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [medicos, setMedicos] = useState('');
  const [puestos, setPuestos] = useState<PuestoGuardado[]>([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [abierta, setAbierta] = useState<number | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; precision: number | null } | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    leerContactos().then(setContactos);
    leerMedicos().then(setMedicos);
    leerPuestos().then(setPuestos);
  }, []);

  const obtenerGps = async () => {
    setBuscando(true);
    try {
      let permiso = await Location.getForegroundPermissionsAsync();
      if (permiso.status !== 'granted') permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== 'granted') {
        Alert.alert('Permiso necesario', 'Activa el permiso de ubicación para compartir dónde estás.');
        return null;
      }
      let p = await Location.getLastKnownPositionAsync();
      try {
        p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch {
        /* se usa la última conocida */
      }
      if (!p) {
        Alert.alert('Sin GPS', 'No se pudo obtener tu ubicación. Sal a un lugar abierto e intenta de nuevo.');
        return null;
      }
      const r = { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy ?? null };
      setPos(r);
      return r;
    } finally {
      setBuscando(false);
    }
  };

  const enlaceMapa = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

  const enviarSos = async () => {
    const r = pos ?? (await obtenerGps());
    const lugar = r ? ` Mi ubicación: ${enlaceMapa(r.lat, r.lng)} (${r.lat.toFixed(5)}, ${r.lng.toFixed(5)})` : '';
    const cuerpo = `🆘 NECESITO AYUDA.${lugar}`;
    const numeros = contactos.map((c) => c.telefono).join(Platform.OS === 'ios' ? ',' : ';');
    const url = `sms:${numeros}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(cuerpo)}`;
    Linking.openURL(url).catch(() => Alert.alert('No se pudo abrir SMS', cuerpo));
  };

  const agregarContacto = () => {
    const tel = telefono.replace(/[^\d+]/g, '');
    if (!nombre.trim() || tel.length < 5) {
      Alert.alert('Revisa los datos', 'Escribe un nombre y un teléfono válido.');
      return;
    }
    const nuevo = [...contactos, { id: String(Date.now()), nombre: nombre.trim(), telefono: tel }];
    setContactos(nuevo);
    guardarContactos(nuevo);
    setNombre('');
    setTelefono('');
  };

  const quitarContacto = (id: string) => {
    const nuevo = contactos.filter((c) => c.id !== id);
    setContactos(nuevo);
    guardarContactos(nuevo);
  };

  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()} accessibilityLabel="Regresar">
          <Ionicons name="chevron-back" size={23} color={C.rojo} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Modo emergencia</Text>
          <Text style={s.sub}>Funciona sin internet y sin iniciar sesión</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Pressable style={s.sos} onPress={enviarSos} accessibilityRole="button">
          {buscando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="alert-circle" size={30} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={s.sosTxt}>Enviar SOS por SMS</Text>
                <Text style={s.sosSub}>
                  {contactos.length > 0
                    ? `A ${contactos.length} contacto(s) con tu ubicación`
                    : 'Agrega contactos abajo para enviarles tu ubicación'}
                </Text>
              </View>
            </>
          )}
        </Pressable>

        <Text style={s.seccion}>Llamar ahora</Text>
        <View style={s.grid}>
          {NUMEROS.map((x) => (
            <Pressable key={x.n} style={s.num} onPress={() => Linking.openURL(`tel:${x.n}`)}>
              <Ionicons name={x.i} size={22} color={x.c} />
              <View style={{ flex: 1 }}>
                <Text style={[s.numN, { color: x.c }]}>{x.n}</Text>
                <Text style={s.numT} numberOfLines={1}>{x.t}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={s.seccion}>Mi ubicación (GPS)</Text>
        <View style={s.card}>
          {pos ? (
            <>
              <Text style={s.coord}>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</Text>
              {pos.precision != null && <Text style={s.meta}>Precisión aprox. {Math.round(pos.precision)} m</Text>}
              <Text style={s.meta}>Dicta estas coordenadas a quien te auxilie si no hay mapa.</Text>
            </>
          ) : (
            <Text style={s.meta}>El GPS funciona sin internet. Toca para obtener tus coordenadas.</Text>
          )}
          <Pressable style={s.btn} onPress={obtenerGps} disabled={buscando}>
            <Text style={s.btnTxt}>{pos ? 'Actualizar ubicación' : 'Obtener mi ubicación'}</Text>
          </Pressable>
        </View>

        <Text style={s.seccion}>Mis contactos de emergencia</Text>
        <View style={s.card}>
          {contactos.map((c) => (
            <View key={c.id} style={s.contacto}>
              <Pressable style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${c.telefono}`)}>
                <Text style={s.nombre}>{c.nombre}</Text>
                <Text style={s.meta}>{c.telefono} · toca para llamar</Text>
              </Pressable>
              <Pressable onPress={() => quitarContacto(c.id)} hitSlop={10} accessibilityLabel={`Quitar ${c.nombre}`}>
                <Ionicons name="trash-outline" size={20} color={C.secundario} />
              </Pressable>
            </View>
          ))}
          <TextInput style={s.input} placeholder="Nombre" placeholderTextColor={C.secundario} value={nombre} onChangeText={setNombre} maxLength={40} />
          <TextInput style={s.input} placeholder="Teléfono" placeholderTextColor={C.secundario} value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" maxLength={16} />
          <Pressable style={s.btn} onPress={agregarContacto}>
            <Text style={s.btnTxt}>Agregar contacto</Text>
          </Pressable>
        </View>

        <Text style={s.seccion}>Datos médicos (solo en este teléfono)</Text>
        <View style={s.card}>
          <TextInput
            style={[s.input, { minHeight: 90, paddingTop: 12 }]}
            placeholder="Grupo sanguíneo, alergias, medicamentos, condiciones importantes…"
            placeholderTextColor={C.secundario}
            value={medicos}
            onChangeText={(t) => {
              setMedicos(t);
              guardarMedicos(t);
            }}
            multiline
            textAlignVertical="top"
            maxLength={600}
          />
        </View>

        <Text style={s.seccion}>Primeros auxilios y qué hacer</Text>
        {GUIAS.map((g, idx) => (
          <Pressable key={g.t} style={s.guia} onPress={() => setAbierta(abierta === idx ? null : idx)}>
            <View style={s.guiaCab}>
              <Text style={{ fontSize: 20 }}>{g.i}</Text>
              <Text style={s.guiaTit}>{g.t}</Text>
              <Ionicons name={abierta === idx ? 'chevron-up' : 'chevron-down'} size={18} color={C.secundario} />
            </View>
            {abierta === idx &&
              g.pasos.map((p, k) => (
                <Text key={k} style={s.paso}>
                  {k + 1}. {p}
                </Text>
              ))}
          </Pressable>
        ))}
        <Text style={s.aviso}>
          Orientación básica; no reemplaza la atención de profesionales. Ante una emergencia grave, llama primero.
        </Text>

        <Text style={s.seccion}>Puestos de ayuda guardados</Text>
        {puestos.length === 0 ? (
          <Text style={s.meta}>
            Aún no hay puestos guardados. Se guardan solos la última vez que abras Emergencias con internet.
          </Text>
        ) : (
          puestos.map((p) => (
            <Pressable
              key={p.id}
              style={s.card}
              onPress={() => Linking.openURL(enlaceMapa(p.latitude, p.longitude))}
            >
              <Text style={s.nombre}>
                {p.tipo === 'ofrecer' ? '🟢' : '🔴'} {p.titulo}
              </Text>
              <Text style={s.meta}>{p.zona}{p.detalle ? ` · ${p.detalle}` : ''}</Text>
              <Text style={s.meta}>{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)} · toca para abrir en mapas</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.fondo },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FBE9E7', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: C.texto },
  sub: { fontSize: 12, color: C.secundario },
  content: { padding: 20, paddingBottom: 60, gap: 10 },
  sos: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.rojo, borderRadius: 20, padding: 18, minHeight: 78 },
  sosTxt: { color: '#fff', fontSize: 19, fontWeight: '800' },
  sosSub: { color: '#FFE3DE', fontSize: 12 },
  seccion: { fontSize: 16, fontWeight: '800', color: C.texto, marginTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  num: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.blanco, borderRadius: 16, borderWidth: 1, borderColor: C.borde, padding: 12 },
  numN: { fontSize: 20, fontWeight: '800' },
  numT: { fontSize: 11, color: C.secundario },
  card: { backgroundColor: C.blanco, borderRadius: 16, borderWidth: 1, borderColor: C.borde, padding: 14, gap: 8 },
  coord: { fontSize: 20, fontWeight: '800', color: C.texto },
  meta: { fontSize: 13, color: C.secundario },
  nombre: { fontSize: 15, fontWeight: '700', color: C.texto },
  contacto: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.borde },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: C.borde, backgroundColor: C.fondo, paddingHorizontal: 12, fontSize: 15, color: C.texto },
  btn: { height: 46, borderRadius: 13, backgroundColor: C.principal, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  guia: { backgroundColor: C.blanco, borderRadius: 16, borderWidth: 1, borderColor: C.borde, padding: 14, gap: 8 },
  guiaCab: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guiaTit: { flex: 1, fontSize: 15, fontWeight: '700', color: C.texto },
  paso: { fontSize: 14, color: C.texto, lineHeight: 20 },
  aviso: { fontSize: 12, color: C.secundario, marginTop: 4 },
});
