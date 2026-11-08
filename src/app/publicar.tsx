import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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

import TutorialModal from '@/components/inicio/TutorialModal';

import { Api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { getUsuario } from '@/lib/session';
import {
  SelectorUbicacion,
  type UbicacionElegida,
} from '@/components/selector-ubicacion';
import { Api } from '@/lib/api';
import { mostrarError } from '@/lib/ui';

const C = {
  principal: '#146C67',
  fondo: '#F6F7F3',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
};

// Misma barra inferior de Inicio y Perfil, con Publicar seleccionado.
const tabsPublicar = [
  { nombre: 'Inicio', key: 'inicio', icono: 'home-outline' },
  { nombre: 'Publicar', key: 'publicar', icono: 'add-circle-outline' },
  { nombre: 'Tutorial', key: 'tutorial', icono: 'book-outline' },
  { nombre: 'Perfil', key: 'perfil', icono: 'person-outline' },
] as const;

type ModoPublicacion =
  | 'OFRECER_SERVICIO'
  | 'PEDIR_FAVOR'
  | 'OFRECER_FAVOR';

const MODOS: {
  id: ModoPublicacion;
  titulo: string;
  subtitulo: string;
  icono: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'OFRECER_SERVICIO',
    titulo: 'Promover mi Servicio',
    subtitulo: 'Ofrece tu oficio o profesión en el barrio',
    icono: 'construct-outline',
  },
  {
    id: 'PEDIR_FAVOR',
    titulo: 'Pedir un Favor / Ayuda',
    subtitulo: 'Solicita préstamo o apoyo solidario',
    icono: 'hand-left-outline',
  },
  {
    id: 'OFRECER_FAVOR',
    titulo: 'Ofrecer Ayuda Solidaria',
    subtitulo: 'Comparte herramientas, tiempo o donación',
    icono: 'heart-outline',
  },
];

const CATEGORIAS_SERVICIO = [
  { nombre: 'Hogar', icono: 'home' as const },
  { nombre: 'Salud', icono: 'medkit' as const },
  { nombre: 'Educación', icono: 'book' as const },
  { nombre: 'Tecnología', icono: 'laptop' as const },
  { nombre: 'Seguridad', icono: 'videocam' as const },
  { nombre: 'Otro', icono: 'grid' as const },
];

const CATEGORIAS_FAVOR = [
  { nombre: 'Herramienta', icono: 'build' as const },
  { nombre: 'Apoyo', icono: 'people' as const },
  { nombre: 'Donación', icono: 'cube' as const },
  { nombre: 'Otro', icono: 'grid' as const },
];

const PLANTILLAS_RAPIDAS: Record<
  ModoPublicacion,
  { chip: string; categoria: string; titulo: string; descripcion: string; monto?: string }[]
> = {
  OFRECER_SERVICIO: [
    {
      chip: '🔧 Gasfitería',
      categoria: 'Hogar',
      titulo: 'Gasfitero del barrio · Fugas y tuberías',
      descripcion: 'Reparación rápida de fugas, caños, duchas y tanques elevados.',
      monto: '40',
    },
    {
      chip: '⚡ Electricista',
      categoria: 'Hogar',
      titulo: 'Electricista a domicilio y urgencias',
      descripcion: 'Instalaciones eléctricas, cortocircuitos, tableros y tomacorrientes.',
      monto: '45',
    },
    {
      chip: '🐾 Paseador de mascotas',
      categoria: 'Otro',
      titulo: 'Paseador de mascotas de confianza',
      descripcion: 'Paseos diarios por parques del barrio con reporte a los dueños.',
      monto: '15',
    },
    {
      chip: '📚 Clases particulares',
      categoria: 'Educación',
      titulo: 'Clases de matemáticas y apoyo escolar',
      descripcion: 'Refuerzo escolar primaria y secundaria a domicilio.',
      monto: '25',
    },
  ],
  PEDIR_FAVOR: [
    {
      chip: '🪜 Necesito escalera',
      categoria: 'Herramienta',
      titulo: 'Préstamo de escalera por 1 hora',
      descripcion: 'Necesito cambiar un foco alto en mi patio hoy por la tarde.',
    },
    {
      chip: '🚗 Movilidad al hospital',
      categoria: 'Apoyo',
      titulo: 'Apoyo con movilidad hacia el hospital',
      descripcion: '¿Algún vecino sale temprano hacia el centro para acercar a un familiar?',
    },
  ],
  OFRECER_FAVOR: [
    {
      chip: '🧰 Presto herramientas',
      categoria: 'Herramienta',
      titulo: 'Presto caja de herramientas a vecinos',
      descripcion: 'Taladro, martillo y llaves disponibles sin costo para emergencias domésticas.',
    },
    {
      chip: '📦 Dono libros escolares',
      categoria: 'Donación',
      titulo: 'Donación de libros de primaria y secundaria',
      descripcion: 'En buen estado para estudiantes del barrio que los necesiten.',
    },
  ],
};

export default function Publicar() {
  const usuario = getUsuario();
  const { t } = useI18n();
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [paso, setPaso] = useState(1);
  const [modo, setModo] = useState<ModoPublicacion>('OFRECER_SERVICIO');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ubic, setUbic] = useState<UbicacionElegida | null>(null);
  const [zona, setZona] = useState(usuario?.zona?.nombre ?? 'Cercado');
  const [tipoPrecio, setTipoPrecio] = useState<'FIJO' | 'POR_HORA' | 'A_CONVENIR'>('FIJO');
  const [monto, setMonto] = useState('40');
  const [enviando, setEnviando] = useState(false);

  const listaCategorias =
    modo === 'OFRECER_SERVICIO' ? CATEGORIAS_SERVICIO : CATEGORIAS_FAVOR;

  const cambiarModo = (nuevo: ModoPublicacion) => {
    setModo(nuevo);
    setCategoria(null);
  };

  const aplicarPlantilla = (pl: {
    categoria: string;
    titulo: string;
    descripcion: string;
    monto?: string;
  }) => {
    setCategoria(pl.categoria);
    setTitulo(pl.titulo);
    setDescripcion(pl.descripcion);
    if (pl.monto) {
      setMonto(pl.monto);
      setTipoPrecio('FIJO');
    }
    if (!zona.trim()) setZona('Cercado');
    setPaso(2);
  };

  const siguiente = () => {
    if (paso === 1) {
      if (!categoria) {
        Alert.alert(
          'Selecciona una categoría',
          'Indica la categoría o toca una plantilla rápida arriba.'
        );
        return;
      }
      setPaso(2);
      return;
    }

    if (paso === 2) {
      if (!titulo.trim() || !descripcion.trim()) {
        Alert.alert(
          'Campos incompletos',
          'Escribe un título y una descripción.'
        );
        return;
      }

      if (!ubic) {
        Alert.alert(
          'Falta la ubicación',
          'Marca en el mapa dónde necesitas la ayuda.'
          'Falta la zona',
          'Indica el barrio o zona.'
        );
        return;
      }

      setPaso(3);
    }
  };

  const regresar = () => {
    if (paso > 1) {
      setPaso(paso - 1);
    } else {
      router.back();
    }
  };

  const publicar = async () => {
    if (!categoria || enviando) return;
    setEnviando(true);

    try {
      const esServicio = modo === 'OFRECER_SERVICIO';
      const tipoApi = esServicio ? 'SERVICIO' : 'FAVOR';
      const direccionApi =
        modo === 'PEDIR_FAVOR' ? 'SOLICITA' : 'OFRECE';

      const categoriasApi = await Api.categorias(tipoApi);
      const categoriaId =
        categoriasApi.find((c) => c.nombre === categoria)?.id ??
        categoriasApi[0]?.id ??
        null;

      if (!ubic) return;
      const zonaId = await zonaIdPorNombre(zona);
      const pos = await obtenerUbicacion();
      const montoNum = parseFloat(monto);

      await Api.crearPublicacion({
        tipo: tipoApi,
        direccion: direccionApi,
        categoria_id: categoriaId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim().slice(0, 1000),
        zona_id: ubic.zonaId,
        latitud: ubic.latitude,
        longitud: ubic.longitude,
        titulo: titulo.trim().slice(0, 80),
        descripcion: (
          zonaId
            ? descripcion.trim()
            : `${descripcion.trim()}\nZona: ${zona.trim()}`
        ).slice(0, 1000),
        zona_id: zonaId ?? 1,
        latitud: pos.latitude,
        longitud: pos.longitude,
        ...(esServicio
          ? {
              servicio: {
                tipo_precio: tipoPrecio,
                monto:
                  tipoPrecio === 'A_CONVENIR' || Number.isNaN(montoNum)
                    ? null
                    : montoNum,
                modalidad: 'DOMICILIO',
                radio_km: 5,
                urgencia: 'MEDIA',
              },
            }
          : {}),
      });

      Alert.alert(
        esServicio ? '¡Servicio publicado!' : '¡Favor publicado!',
        esServicio
          ? 'Tu servicio ya aparece en "Servicios de mi barrio" y en el mapa para tus vecinos.'
          : 'Tu publicación ya es visible en la Cadena de Favores.',
        [
          {
            text: esServicio ? 'Ver en Servicios' : 'Ver en Favores',
            onPress: () =>
              router.replace(esServicio ? '/servicios' : '/favores'),
          },
          {
            text: 'Ir al Inicio',
            onPress: () => router.replace('/inicio'),
          },
        ]
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
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.header}>
          <Pressable
            style={s.back}
            onPress={regresar}
            accessibilityLabel="Regresar"
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={C.texto}
            />
          </Pressable>

          <Text style={s.headerTitle}>
            Publicar en mi barrio
          </Text>
        </View>

        <View style={s.progress}>
          {[1, 2, 3].map((numero, indice) => (
            <View
              key={numero}
              style={s.progressGroup}
            >
              <View
                style={[
                  s.progressCircle,
                  numero <= paso && s.progressCircleActive,
                ]}
              >
                <Text
                  style={[
                    s.progressNumber,
                    numero <= paso && s.progressNumberActive,
                  ]}
                >
                  {numero}
                </Text>
              </View>

              {indice < 2 && (
                <View
                  style={[
                    s.progressLine,
                    numero < paso && s.progressLineActive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {paso === 1 && (
            <>
              <Text style={s.title}>
                1. ¿Qué deseas publicar?
              </Text>

              <View style={s.modosCol}>
                {MODOS.map((m) => {
                  const activo = modo === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      style={[
                        s.modoCard,
                        activo && s.modoCardActivo,
                      ]}
                      onPress={() => cambiarModo(m.id)}
                    >
                      <View
                        style={[
                          s.modoIconBox,
                          activo && s.modoIconBoxActivo,
                        ]}
                      >
                        <Ionicons
                          name={m.icono}
                          size={22}
                          color={activo ? C.principal : C.principal}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            s.modoTitulo,
                            activo && s.modoTituloActivo,
                          ]}
                        >
                          {m.titulo}
                        </Text>
                        <Text
                          style={[
                            s.modoSub,
                            activo && s.modoSubActivo,
                          ]}
                        >
                          {m.subtitulo}
                        </Text>
                      </View>
                      <Ionicons
                        name={
                          activo
                            ? 'radio-button-on'
                            : 'radio-button-off'
                        }
                        size={20}
                        color={activo ? C.blanco : C.secundario}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {/* Plantillas en 1 toque para cumplir <= 3 clics */}
              <Text style={s.plantillasHeading}>
                ⚡ Autocompletar con 1 toque:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.plantillasScroll}
              >
                {PLANTILLAS_RAPIDAS[modo].map((pl) => (
                  <Pressable
                    key={pl.chip}
                    style={s.plantillaPill}
                    onPress={() => aplicarPlantilla(pl)}
                  >
                    <Text style={s.plantillaPillTxt}>
                      {pl.chip}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={s.label}>
                O elige una categoría:
              </Text>

              <View style={s.categoryGrid}>
                {listaCategorias.map((item) => {
                  const activo = categoria === item.nombre;

                  return (
                    <Pressable
                      key={item.nombre}
                      style={[
                        s.categoryCard,
                        activo && s.categoryActive,
                      ]}
                      onPress={() => setCategoria(item.nombre)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                    >
                      <Ionicons
                        name={item.icono}
                        size={34}
                        color={activo ? C.blanco : C.principal}
                      />

                      <Text
                        style={[
                          s.categoryText,
                          activo && s.categoryTextActive,
                        ]}
                      >
                        {item.nombre}
                      </Text>

                      {activo && (
                        <View style={s.selectedBadge}>
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={C.principal}
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {paso === 2 && (
            <>
              <Text style={s.title}>
                2. Detalles de tu publicación
              </Text>

              <View style={s.selectedCategory}>
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={C.principal}
                />
                <Text style={s.selectedCategoryText}>
                  {MODOS.find((m) => m.id === modo)?.titulo} · {categoria}
                </Text>
              </View>

              <Text style={s.label}>
                {modo === 'OFRECER_SERVICIO'
                  ? 'Título de tu oficio o servicio'
                  : 'Título del favor'}
              </Text>

              <TextInput
                style={s.input}
                placeholder={
                  modo === 'OFRECER_SERVICIO'
                    ? 'Ej. Gasfitero a domicilio · Reparación de fugas'
                    : 'Ej. Necesito una escalera por 1 hora'
                }
                placeholderTextColor={C.secundario}
                value={titulo}
                onChangeText={setTitulo}
                maxLength={80}
              />

              <Text style={s.label}>
                Descripción
              </Text>

              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Explica qué ofreces o necesitas, disponibilidad y detalles..."
                placeholderTextColor={C.secundario}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />

              {modo === 'OFRECER_SERVICIO' && (
                <>
                  <Text style={s.label}>
                    Tarifa para vecinos
                  </Text>
                  <View style={s.tarifasRow}>
                    {(
                      [
                        { id: 'FIJO', label: 'Precio base' },
                        { id: 'POR_HORA', label: 'Por hora' },
                        { id: 'A_CONVENIR', label: 'A convenir' },
                      ] as const
                    ).map((tp) => {
                      const act = tipoPrecio === tp.id;
                      return (
                        <Pressable
                          key={tp.id}
                          style={[
                            s.tarifaChip,
                            act && s.tarifaChipActiva,
                          ]}
                          onPress={() => setTipoPrecio(tp.id)}
                        >
                          <Text
                            style={[
                              s.tarifaChipTxt,
                              act && s.tarifaChipTxtActiva,
                            ]}
                          >
                            {tp.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {tipoPrecio !== 'A_CONVENIR' && (
                    <>
                      <Text style={s.label}>
                        Monto en Soles (S/)
                      </Text>
                      <TextInput
                        style={s.input}
                        placeholder="Ej. 40"
                        placeholderTextColor={C.secundario}
                        keyboardType="numeric"
                        value={monto}
                        onChangeText={setMonto}
                      />
                    </>
                  )}
                </>
              )}

              <Text style={s.label}>
                Ubicación (elige en el mapa)
              </Text>

              <SelectorUbicacion value={ubic} onChange={setUbic} />

              <View style={s.infoBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={21}
                  color={C.principal}
                />
                <Text style={s.infoText}>
                  Evita publicar direcciones exactas
                  o información personal sensible.
                </Text>
              <View style={s.locationInput}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={C.principal}
                />

                <TextInput
                  style={s.locationText}
                  placeholder="Ej. Cercado, Yanahuara, Cayma"
                  placeholderTextColor={C.secundario}
                  value={zona}
                  onChangeText={setZona}
                  maxLength={100}
                />
              </View>
            </>
          )}

          {paso === 3 && (
            <>
              <Text style={s.title}>
                3. Revisa y publica
              </Text>

              <Text style={s.subtitle}>
                Confirma que los datos estén listos para tus vecinos.
              </Text>

              <View style={s.summaryCard}>
                <View style={s.summaryHeader}>
                  <View style={s.summaryIcon}>
                    <Ionicons
                      name={
                        modo === 'OFRECER_SERVICIO'
                          ? 'construct-outline'
                          : 'heart-outline'
                      }
                      size={25}
                      color={C.principal}
                    />
                  </View>

                  <View style={s.summaryHeaderText}>
                    <Text style={s.summaryTitle}>
                      {titulo}
                    </Text>
                    <Text style={s.summaryCategory}>
                      {MODOS.find((m) => m.id === modo)?.titulo} · {categoria}
                    </Text>
                  </View>
                </View>

                <View style={s.separator} />

                <Text style={s.summaryLabel}>
                  Descripción
                </Text>
                <Text style={s.summaryValue}>
                  {descripcion}
                </Text>

                {modo === 'OFRECER_SERVICIO' && (
                  <>
                    <Text style={s.summaryLabel}>
                      Tarifa referencial
                    </Text>
                    <Text style={s.summaryValue}>
                      {tipoPrecio === 'A_CONVENIR'
                        ? 'A convenir con el vecino'
                        : tipoPrecio === 'POR_HORA'
                          ? `S/ ${monto} por hora`
                          : `S/ ${monto} (precio base)`}
                    </Text>
                  </>
                )}

                <Text style={s.summaryLabel}>
                  Ubicación
                </Text>

                <View style={s.summaryLocation}>
                  <Ionicons
                    name="location-outline"
                    size={17}
                    color={C.principal}
                  />
                  <Text style={s.summaryValue}>
                    {ubic?.etiqueta}
                  </Text>
                </View>
              </View>

              <Pressable
                style={s.editButton}
                onPress={() => setPaso(2)}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={C.principal}
                />
                <Text style={s.editText}>
                  Editar información
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            style={[s.nextButton, enviando && { opacity: 0.7 }]}
            disabled={enviando}
            onPress={paso === 3 ? publicar : siguiente}
          >
            <Text style={s.nextText}>
              {enviando
                ? 'Publicando…'
                : paso === 3
                  ? modo === 'OFRECER_SERVICIO'
                    ? 'Publicar mi servicio'
                    : 'Publicar en Cadena de Favores'
                  : 'Siguiente'}
            </Text>

            <Ionicons
              name={
                paso === 3
                  ? 'checkmark-circle-outline'
                  : 'arrow-forward'
              }
              size={21}
              color={C.blanco}
            />
          </Pressable>

          <Text style={s.footerNote}>
            Paso {paso} de 3
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Barra inferior: mismo diseño que Inicio y Perfil, con Publicar activo */}
      <View style={s.navContainer}>
        <View style={s.nav}>
          {tabsPublicar.map((tab) => {
            const activa = tab.nombre === 'Publicar';
            const etiqueta = t[tab.key];

            return (
              <Pressable
                key={tab.nombre}
                style={[s.navItem, activa && s.navItemActive]}
                onPress={() => {
                  if (tab.nombre === 'Inicio') {
                    router.replace('/inicio');
                  } else if (tab.nombre === 'Tutorial') {
                    setTutorialVisible(true);
                  } else if (tab.nombre === 'Perfil') {
                    router.push('/perfil');
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={etiqueta}
                accessibilityState={{ selected: activa }}
              >
                <Ionicons
                  name={tab.icono}
                  size={24}
                  color={activa ? C.blanco : C.secundario}
                />
                {activa && (
                  <Text style={s.navActiveText}>{etiqueta}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tutorial visual compartido con Inicio */}
      <TutorialModal
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: {
    flex: 1,
  },

  page: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 14,
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

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.texto,
  },

  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 65,
    marginBottom: 18,
  },

  progressGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressCircleActive: {
    backgroundColor: C.principal,
  },

  progressNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: C.secundario,
  },

  progressNumberActive: {
    color: C.blanco,
  },

  progressLine: {
    width: 55,
    height: 3,
    backgroundColor: C.borde,
  },

  progressLineActive: {
    backgroundColor: C.principal,
  },

  content: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },

  title: {
    fontSize: 21,
    fontWeight: '900',
    color: C.texto,
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: C.secundario,
    marginBottom: 18,
  },

  modosCol: {
    gap: 9,
    marginBottom: 16,
  },

  modoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.blanco,
    borderWidth: 1.5,
    borderColor: C.borde,
    borderRadius: 16,
    padding: 13,
  },

  modoCardActivo: {
    backgroundColor: C.principal,
    borderColor: C.principal,
  },

  modoIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modoIconBoxActivo: {
    backgroundColor: C.blanco,
  },

  modoTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },

  modoTituloActivo: {
    color: C.blanco,
  },

  modoSub: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 2,
  },

  modoSubActivo: {
    color: C.verdeClaro,
  },

  plantillasHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: C.principal,
    marginBottom: 8,
  },

  plantillasScroll: {
    gap: 8,
    paddingBottom: 14,
  },

  plantillaPill: {
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
  },

  plantillaPillTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: C.principal,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },

  categoryCard: {
    width: '48%',
    height: 110,
    borderRadius: 18,
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  categoryActive: {
    backgroundColor: C.principal,
    borderColor: C.principal,
  },

  categoryText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },

  categoryTextActive: {
    color: C.blanco,
  },

  selectedBadge: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedCategory: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.verdeClaro,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    marginBottom: 18,
  },

  selectedCategoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.principal,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 9,
  },

  input: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 14,
    color: C.texto,
    marginBottom: 16,
  },

  textarea: {
    height: 105,
    paddingTop: 14,
  },

  tarifasRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  tarifaChip: {
    flex: 1,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },

  tarifaChipActiva: {
    backgroundColor: C.principal,
    borderColor: C.principal,
  },

  tarifaChipTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: C.texto,
  },

  tarifaChipTxtActiva: {
    color: C.blanco,
  },

  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    paddingHorizontal: 13,
    marginBottom: 20,
  },

  locationText: {
    flex: 1,
    height: 52,
    fontSize: 14,
    color: C.texto,
  },

  summaryCard: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryHeaderText: {
    flex: 1,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
  },

  summaryCategory: {
    fontSize: 12,
    color: C.principal,
    marginTop: 5,
  },

  separator: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 16,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 6,
  },

  summaryValue: {
    fontSize: 13,
    color: C.secundario,
    lineHeight: 20,
    marginBottom: 14,
  },

  summaryLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    marginTop: 8,
  },

  editText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.principal,
  },

  footer: {
    backgroundColor: C.blanco,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },

  nextButton: {
    height: 55,
    borderRadius: 16,
    backgroundColor: C.principal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  nextText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.blanco,
  },

  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: C.secundario,
    marginTop: 9,
  },

  // Estilos idénticos a components/inicio/BarraNavegacion.tsx.
  navContainer: {
    backgroundColor: '#F6F7F3',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.verdeClaro,
    borderRadius: 40,
    padding: 6,
    minHeight: 65,
    elevation: 5,
    shadowColor: C.texto,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  navItem: {
    flex: 1,
    height: 53,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  navItemActive: {
    flex: 2,
    backgroundColor: C.principal,
  },
  navActiveText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.blanco,
  },


  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(36,55,70,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  tutorialCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.fondo,
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 25,
    borderWidth: 1,
    borderColor: C.borde,
  },

  tutorialClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  tutorialTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: C.texto,
    textAlign: 'center',
    marginBottom: 18,
  },

  tutorialIllustration: {
    height: 145,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  tutorialCircle: {
    width: 135,
    height: 135,
    borderRadius: 68,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tutorialCheck: {
    position: 'absolute',
    right: '25%',
    bottom: 13,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.principal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.blanco,
  },

  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 17,
  },

  tutorialNumber: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: C.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tutorialNumberText: {
    fontSize: 14,
    fontWeight: '900',
    color: C.blanco,
  },

  tutorialStepText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: C.texto,
    lineHeight: 20,
  },

  tutorialButton: {
    height: 49,
    borderRadius: 14,
    backgroundColor: C.principal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  tutorialButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: C.blanco,
  },

});
