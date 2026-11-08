import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Api, type Publicacion, type Resena } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useEstadoOffline } from '@/lib/offline';
import {
  distanciaTexto,
  emojiCategoria,
  mostrarError,
  obtenerUbicacion,
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
  dorado: '#F59E0B',
  doradoClaro: '#FEF3C7',
};

const ETIQUETAS_VISTO_BUENO = [
  '✓ Visto Bueno Vecinal',
  '💰 Precio justo',
  '⚡ Atención rápida',
  '🛡️ Vecino de confianza',
  '🚨 Apoya en emergencias',
];

const PLANTILLAS_OFICIOS = [
  {
    chip: '🔧 Gasfitería',
    titulo: 'Gasfitero del barrio · Fugas y tuberías',
    descripcion: 'Reparación de tuberías, grifería, tanques de agua e instalaciones sanitarias.',
    categoria: 'Hogar',
    precio: '40',
    tipoPrecio: 'FIJO' as const,
  },
  {
    chip: '⚡ Electricidad',
    titulo: 'Electricista a domicilio y emergencias',
    descripcion: 'Instalaciones eléctricas, cortocircuitos, tableros y luminarias.',
    categoria: 'Hogar',
    precio: '45',
    tipoPrecio: 'FIJO' as const,
  },
  {
    chip: '🐾 Paseador de mascotas',
    titulo: 'Paseador y cuidado de mascotas en el barrio',
    descripcion: 'Paseos seguros por parques de la zona y cuidado por horas.',
    categoria: 'Otro',
    precio: '15',
    tipoPrecio: 'POR_HORA' as const,
  },
  {
    chip: '📚 Clases particulares',
    titulo: 'Clases de matemáticas y refuerzo escolar',
    descripcion: 'Nivelación primaria y secundaria a domicilio o virtual.',
    categoria: 'Educación',
    precio: '25',
    tipoPrecio: 'POR_HORA' as const,
  },
  {
    chip: '🔑 Cerrajería',
    titulo: 'Cerrajero 24h · Apertura y chapas',
    descripcion: 'Apertura de puertas sin daño, cambio de cerraduras y duplicados.',
    categoria: 'Seguridad',
    precio: '35',
    tipoPrecio: 'FIJO' as const,
  },
  {
    chip: '🩺 Enfermería',
    titulo: 'Enfermería técnica · Inyectables y presión',
    descripcion: 'Curaciones, control de signos vitales y atención a domicilio.',
    categoria: 'Salud',
    precio: '25',
    tipoPrecio: 'FIJO' as const,
  },
];

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string;
  profesional: string;
  autorId: string;
  categoria: string;
  calificacionNum: number;
  calificacion: string;
  opiniones: number;
  distancia: string;
  icono: string;
};

const aServicio = (p: Publicacion): Servicio => ({
  id: p.id,
  nombre: p.titulo,
  descripcion: p.descripcion,
  profesional: p.autor.nombre_completo,
  autorId: p.autor.id,
  categoria: p.categoria?.nombre ?? 'Otro',
  calificacionNum: p.autor.calificacion_promedio,
  calificacion: p.autor.calificacion_promedio.toFixed(1),
  opiniones: p.autor.total_resenas,
  distancia:
    p.distancia_km != null
      ? distanciaTexto(p.distancia_km)
      : 'poca distancia',
  icono: emojiCategoria(p.categoria?.nombre),
});

export default function Servicios() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { t } = useI18n();
  const { offline } = useEstadoOffline();

  const [busqueda, setBusqueda] = useState(
    typeof q === 'string' ? q : ''
  );
  const [categoria, setCategoria] = useState('Todos');
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Todos']);
  const [cargando, setCargando] = useState(true);

  // Estado del modal de Calificación y Visto Bueno Vecinal
  const [servicioEvaluado, setServicioEvaluado] =
    useState<Servicio | null>(null);
  const [estrellas, setEstrellas] = useState(5);
  const [etiquetasElegidas, setEtiquetasElegidas] = useState<string[]>([
    '✓ Visto Bueno Vecinal',
  ]);
  const [comentario, setComentario] = useState('');
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargandoResenas, setCargandoResenas] = useState(false);
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false);

  // Estado del modal para publicar mi propio servicio (oficio / profesión)
  const [publicarVisible, setPublicarVisible] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Hogar');
  const [nuevoTipoPrecio, setNuevoTipoPrecio] = useState<
    'FIJO' | 'POR_HORA' | 'A_CONVENIR'
  >('FIJO');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [publicandoServicio, setPublicandoServicio] = useState(false);

  const cargarServicios = async () => {
    try {
      const pos = await obtenerUbicacion();
      const [lista, cats] = await Promise.all([
        Api.publicaciones({
          tipo: 'SERVICIO',
          direccion: 'OFRECE',
          lat: pos.latitude,
          lng: pos.longitude,
        }),
        Api.categorias('SERVICIO'),
      ]);
      setServicios(lista.map(aServicio));
      setCategorias(['Todos', ...cats.map((c) => c.nombre)]);
    } catch (e) {
      mostrarError(e, 'No se pudieron cargar los servicios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarServicios();
  }, []);

  const publicarMiServicio = async () => {
    if (!nuevoTitulo.trim() || !nuevaDescripcion.trim()) {
      Alert.alert(
        'Campos incompletos',
        'Escribe el nombre de tu oficio/servicio y una breve descripción.'
      );
      return;
    }

    const montoNum = parseFloat(nuevoMonto);
    if (
      nuevoTipoPrecio !== 'A_CONVENIR' &&
      (!nuevoMonto.trim() || Number.isNaN(montoNum) || montoNum < 0)
    ) {
      Alert.alert(
        'Indica tu tarifa',
        'Escribe el precio en soles (S/) o selecciona "A convenir".'
      );
      return;
    }

    setPublicandoServicio(true);
    try {
      const [cats, pos] = await Promise.all([
        Api.categorias('SERVICIO'),
        obtenerUbicacion(),
      ]);
      const catId =
        cats.find((c) => c.nombre === nuevaCategoria)?.id ??
        cats[0]?.id ??
        1;

      await Api.crearPublicacion({
        tipo: 'SERVICIO',
        direccion: 'OFRECE',
        categoria_id: catId,
        titulo: nuevoTitulo.trim().slice(0, 80),
        descripcion: nuevaDescripcion.trim().slice(0, 1000),
        latitud: pos.latitude,
        longitud: pos.longitude,
        servicio: {
          tipo_precio: nuevoTipoPrecio,
          monto:
            nuevoTipoPrecio === 'A_CONVENIR'
              ? null
              : montoNum,
          modalidad: 'DOMICILIO',
          radio_km: 5,
          urgencia: 'MEDIA',
        },
      });

      setPublicarVisible(false);
      setNuevoTitulo('');
      setNuevaDescripcion('');
      setNuevoMonto('');
      await cargarServicios();

      Alert.alert(
        '¡Tu servicio ya está publicado! 🛠️',
        'Tus vecinos del barrio ya pueden encontrarte, llamarte y darte su Visto Bueno Vecinal.'
      );
    } catch (e) {
      mostrarError(e, 'No se pudo publicar tu servicio');
    } finally {
      setPublicandoServicio(false);
    }
  };

  const filtrados = servicios.filter((servicio) => {
    const coincideCategoria =
      categoria === 'Todos' || servicio.categoria === categoria;

    const texto =
      `${servicio.nombre} ${servicio.profesional} ${servicio.descripcion}`.toLowerCase();

    return (
      coincideCategoria &&
      texto.includes(busqueda.trim().toLowerCase())
    );
  });

  const abrirModalCalificar = async (servicio: Servicio) => {
    setServicioEvaluado(servicio);
    setEstrellas(5);
    setEtiquetasElegidas(['✓ Visto Bueno Vecinal']);
    setComentario('');
    setResenas([]);
    setCargandoResenas(true);

    try {
      const lista = await Api.resenasDePublicacion(
        servicio.id,
        servicio.autorId
      );
      setResenas(lista);
    } catch {
      setResenas([]);
    } finally {
      setCargandoResenas(false);
    }
  };

  const alternarEtiqueta = (etiqueta: string) => {
    setEtiquetasElegidas((prev) =>
      prev.includes(etiqueta)
        ? prev.filter((e) => e !== etiqueta)
        : [...prev, etiqueta]
    );
  };

  const guardarCalificacion = async () => {
    if (!servicioEvaluado || enviandoCalificacion) return;
    setEnviandoCalificacion(true);

    try {
      const res = await Api.calificarPublicacion(
        servicioEvaluado.id,
        servicioEvaluado.autorId,
        {
          calificacion: estrellas,
          comentario: comentario.trim() || undefined,
          etiquetas: etiquetasElegidas,
        }
      );

      // Actualizar en tiempo real todas las tarjetas de ese vecino
      setServicios((prev) =>
        prev.map((s) =>
          s.autorId === servicioEvaluado.autorId
            ? {
                ...s,
                calificacionNum: res.calificacion_promedio,
                calificacion: res.calificacion_promedio.toFixed(1),
                opiniones: res.total_resenas,
              }
            : s
        )
      );

      setResenas((prev) => [
        res.resena,
        ...prev.filter((r) => r.id !== res.resena.id),
      ]);
      setComentario('');

      Alert.alert(
        '¡Visto Bueno registrado!',
        `Tu calificación de ${estrellas} estrellas para ${servicioEvaluado.profesional} ya ayuda a otros vecinos del barrio.`
      );
    } catch (e) {
      mostrarError(e, 'No se pudo registrar la calificación');
    } finally {
      setEnviandoCalificacion(false);
    }
  };

  const solicitarServicio = async (servicio: Servicio) => {
    try {
      await Api.responder(
        servicio.id,
        'Hola, me interesa tu servicio. ¿Podemos coordinar?'
      );
      Alert.alert(
        'Solicitud enviada',
        `${servicio.profesional} recibirá tu solicitud.`
      );
    } catch (e) {
      mostrarError(e, 'No se pudo enviar la solicitud');
    }
  };

  const contactar = async (servicio: Servicio) => {
    let telefono: string | null = null;

    try {
      telefono = (await Api.usuario(servicio.autorId)).telefono;
    } catch (e) {
      mostrarError(e, 'No se pudo obtener el contacto');
      return;
    }

    if (!telefono) {
      Alert.alert(
        'Contactar',
        `${servicio.profesional} no muestra su teléfono. ¿Deseas enviarle una solicitud?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar solicitud',
            onPress: () => solicitarServicio(servicio),
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Llamar al profesional',
      `¿Deseas llamar a ${servicio.profesional} (${telefono})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Llamar',
          onPress: () => {
            Linking.openURL(`tel:${telefono}`).catch(() => {
              Alert.alert(
                'Error',
                'No se pudo abrir la aplicación de llamadas.'
              );
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <View
        style={styles.decoracionSuperior}
        pointerEvents="none"
      >
        <View style={styles.burbujaGrande} />
        <View style={styles.burbujaPequena} />
      </View>

      <View style={styles.encabezado}>
        <Pressable
          style={styles.volver}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <Ionicons
            name="chevron-back"
            size={23}
            color={C.principal}
          />
        </Pressable>

        <Text style={[styles.titulo, { flex: 1 }]}>
          Servicios de mi barrio
        </Text>

        <Pressable
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: C.principal,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 14,
          }}
          onPress={() => router.push('/crear-servicio')}
          accessibilityRole="button"
          accessibilityLabel="Publicar un servicio"
        >
          <Ionicons name="add" size={18} color={C.blanco} />
          <Text style={{ color: C.blanco, fontWeight: '800', fontSize: 13 }}>
            Publicar
          </Text>
        </Pressable>
        <Text style={styles.titulo}>
          {t.serviciosBarrio}
        </Text>

        {offline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline-outline" size={13} color={C.blanco} />
            <Text style={styles.offlineBadgeTxt}>Caché Offline</Text>
          </View>
        )}
      </View>

      <View style={styles.buscador}>
        <Ionicons
          name="search-outline"
          size={21}
          color={C.principal}
        />

        <TextInput
          style={styles.inputBusqueda}
          placeholder="Buscar oficio, vecino o servicio..."
          placeholderTextColor={C.secundario}
          value={busqueda}
          onChangeText={setBusqueda}
          autoCorrect={false}
          returnKeyType="search"
        />

        {busqueda.length > 0 && (
          <Pressable
            onPress={() => setBusqueda('')}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <Ionicons
              name="close-circle"
              size={19}
              color={C.secundario}
            />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtros}
        style={styles.contenedorFiltros}
      >
        {categorias.map((item) => {
          const activo = categoria === item;

          return (
            <Pressable
              key={item}
              style={[
                styles.filtro,
                activo && styles.filtroActivo,
              ]}
              onPress={() => setCategoria(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Text
                style={[
                  styles.textoFiltro,
                  activo && styles.textoFiltroActivo,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scrollLista}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
      >
        <View style={styles.encabezadoLista}>
          <View>
            <Text style={styles.subtitulo}>
              {t.profesionalesCerca}
            </Text>

            <Text style={styles.descripcionLista}>
              {t.encuentraAyuda}
            </Text>
          </View>

          <View style={styles.contador}>
            <Text style={styles.contadorTexto}>
              {filtrados.length}
            </Text>
          </View>
        </View>

        {cargando ? (
          <ActivityIndicator
            color={C.principal}
            style={{ marginTop: 30 }}
          />
        ) : filtrados.length === 0 ? (
          <View style={styles.vacio}>
            <View style={styles.vacioIconoContenedor}>
              <Ionicons
                name="search-outline"
                size={34}
                color={C.principal}
              />
            </View>

            <Text style={styles.vacioTitulo}>
              No encontramos servicios
            </Text>

            <Text style={styles.vacioTexto}>
              Prueba con otra búsqueda o categoría.
            </Text>
          </View>
        ) : (
          filtrados.map((servicio) => {
            const tieneVistoBueno =
              servicio.calificacionNum >= 4.0 && servicio.opiniones >= 1;

            return (
              <View
                key={servicio.id}
                style={styles.tarjeta}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarIcono}>
                    {servicio.icono}
                  </Text>
                </View>

                <View style={styles.informacion}>
                  <View style={styles.filaNombre}>
                    <Text
                      style={styles.nombreServicio}
                      numberOfLines={2}
                    >
                      {servicio.nombre}
                    </Text>
                  </View>

                  <Text style={styles.profesional}>
                    {servicio.profesional}
                  </Text>

                  {tieneVistoBueno && (
                    <View style={styles.vistoBuenoBadge}>
                      <Ionicons
                        name="shield-checkmark"
                        size={12}
                        color={C.principal}
                      />
                      <Text style={styles.vistoBuenoTexto}>
                        {t.vistoBueno}
                      </Text>
                    </View>
                  )}

                  <View style={styles.calificacion}>
                    <Ionicons
                      name="star"
                      size={13}
                      color={C.dorado}
                    />

                    <Text style={styles.calificacionTexto}>
                      {servicio.calificacion}
                    </Text>

                    <Text style={styles.opiniones}>
                      ({servicio.opiniones} opiniones)
                    </Text>
                  </View>

                  <View style={styles.ubicacion}>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={C.secundario}
                    />

                    <Text style={styles.distancia}>
                      A {servicio.distancia}
                    </Text>
                  </View>
                </View>

                <View style={styles.accionesTarjeta}>
                  <Pressable
                    style={styles.botonCalificar}
                    onPress={() => abrirModalCalificar(servicio)}
                    accessibilityRole="button"
                    accessibilityLabel={`Calificar a ${servicio.profesional}`}
                  >
                    <Ionicons
                      name="star-outline"
                      size={14}
                      color={C.principal}
                    />
                    <Text style={styles.botonCalificarTexto}>
                      {t.calificar}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.botonLlamar}
                    onPress={() => contactar(servicio)}
                    accessibilityRole="button"
                    accessibilityLabel={`Llamar a ${servicio.profesional}`}
                  >
                    <Ionicons
                      name="call"
                      size={17}
                      color={C.blanco}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

              <View style={styles.informacion}>
                <Text
                  style={styles.nombreServicio}
                  numberOfLines={2}
                  onPress={() =>
                    router.push({ pathname: '/publicacion', params: { id: servicio.id } })
                  }
                  accessibilityRole="link"
                >
                  {servicio.nombre}
                </Text>

                <Text
                  style={styles.profesional}
                  onPress={() =>
                    router.push({ pathname: '/usuario', params: { id: servicio.autorId } })
                  }
                  accessibilityRole="link"
                >
                  {servicio.profesional} ›
      {/* Botón flotante para que un vecino publique su oficio o servicio */}
      <Pressable
        style={styles.fabPublicarServicio}
        onPress={() => setPublicarVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Ofrecer mi servicio"
      >
        <Ionicons name="add-circle" size={22} color={C.blanco} />
        <Text style={styles.fabPublicarTexto}>
          Ofrecer mi servicio
        </Text>
      </Pressable>

      {/* Modal para publicar un Servicio del Barrio (en <= 3 clics) */}
      <Modal
        visible={publicarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPublicarVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCaja}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitulo}>
                  Promover mi servicio
                </Text>
                <Text style={styles.modalSubtitulo}>
                  Ofrece tu oficio o profesión a los vecinos de tu zona
                </Text>
              </View>

              <Pressable
                style={styles.modalCerrar}
                onPress={() => setPublicarVisible(false)}
              >
                <Ionicons name="close" size={21} color={C.secundario} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.labelSeccion}>
                ⚡ Elige tu oficio en 1 toque (o escribe abajo):
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
              >
                {PLANTILLAS_OFICIOS.map((pl) => (
                  <Pressable
                    key={pl.chip}
                    style={styles.etiquetaChip}
                    onPress={() => {
                      setNuevoTitulo(pl.titulo);
                      setNuevaDescripcion(pl.descripcion);
                      setNuevaCategoria(pl.categoria);
                      setNuevoMonto(pl.precio);
                      setNuevoTipoPrecio(pl.tipoPrecio);
                    }}
                  >
                    <Text style={styles.etiquetaTxt}>
                      {pl.chip}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.labelSeccion}>
                Categoría:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
              >
                {categorias
                  .filter((c) => c !== 'Todos')
                  .map((cat) => {
                    const activa = nuevaCategoria === cat;
                    return (
                      <Pressable
                        key={cat}
                        style={[
                          styles.etiquetaChip,
                          activa && styles.etiquetaChipActiva,
                        ]}
                        onPress={() => setNuevaCategoria(cat)}
                      >
                        <Text
                          style={[
                            styles.etiquetaTxt,
                            activa && styles.etiquetaTxtActiva,
                          ]}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
              </ScrollView>

              <Text style={styles.labelSeccion}>
                Título de tu oficio o servicio:
              </Text>
              <TextInput
                style={styles.inputSimple}
                placeholder="Ej. Gasfitero a domicilio · Reparación de fugas"
                placeholderTextColor={C.secundario}
                value={nuevoTitulo}
                onChangeText={setNuevoTitulo}
                maxLength={80}
              />

              <Text style={styles.labelSeccion}>
                ¿Qué trabajos realizas y en qué horario?
              </Text>
              <TextInput
                style={styles.inputComentario}
                placeholder="Describe tu experiencia, zonas que atiendes y si cubres urgencias..."
                placeholderTextColor={C.secundario}
                value={nuevaDescripcion}
                onChangeText={setNuevaDescripcion}
                multiline
                maxLength={500}
              />

              <Text style={styles.labelSeccion}>
                Modalidad de cobro vecinal:
              </Text>
              <View style={styles.etiquetasWrap}>
                {(
                  [
                    { id: 'FIJO', label: 'Precio base (S/)' },
                    { id: 'POR_HORA', label: 'Por hora (S/)' },
                    { id: 'A_CONVENIR', label: 'A convenir' },
                  ] as const
                ).map((tp) => {
                  const activo = nuevoTipoPrecio === tp.id;
                  return (
                    <Pressable
                      key={tp.id}
                      style={[
                        styles.etiquetaChip,
                        activo && styles.etiquetaChipActiva,
                      ]}
                      onPress={() => setNuevoTipoPrecio(tp.id)}
                    >
                      <Text
                        style={[
                          styles.etiquetaTxt,
                          activo && styles.etiquetaTxtActiva,
                        ]}
                      >
                        {tp.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {nuevoTipoPrecio !== 'A_CONVENIR' && (
                <>
                  <Text style={styles.labelSeccion}>
                    Monto referencial en Soles (S/):
                  </Text>
                  <TextInput
                    style={styles.inputSimple}
                    placeholder="Ej. 35"
                    placeholderTextColor={C.secundario}
                    keyboardType="numeric"
                    value={nuevoMonto}
                    onChangeText={setNuevoMonto}
                  />
                </>
              )}

              <Pressable
                style={[
                  styles.botonGuardarResena,
                  publicandoServicio && { opacity: 0.7 },
                ]}
                onPress={publicarMiServicio}
                disabled={publicandoServicio}
              >
                {publicandoServicio ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color={C.blanco}
                    />
                    <Text style={styles.botonGuardarResenaTxt}>
                      Publicar mi servicio en el barrio
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Calificación y Visto Bueno Vecinal */}
      <Modal
        visible={servicioEvaluado !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setServicioEvaluado(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCaja}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitulo}>
                  Visto Bueno Vecinal
                </Text>
                <Text style={styles.modalSubtitulo}>
                  {servicioEvaluado?.profesional} · {servicioEvaluado?.nombre}
                </Text>
              </View>

              <Pressable
                style={styles.modalCerrar}
                onPress={() => setServicioEvaluado(null)}
              >
                <Ionicons name="close" size={21} color={C.secundario} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Selector de estrellas */}
              <Text style={styles.labelSeccion}>
                ¿Qué calificación le das a este vecino?
              </Text>

              <View style={styles.estrellasFila}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => setEstrellas(num)}
                    style={styles.estrellaBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`${num} estrellas`}
                  >
                    <Ionicons
                      name={num <= estrellas ? 'star' : 'star-outline'}
                      size={34}
                      color={num <= estrellas ? C.dorado : C.secundario}
                    />
                  </Pressable>
                ))}
                <Text style={styles.estrellasValor}>
                  {estrellas}.0 / 5
                </Text>
              </View>

              {/* Sellos de confianza vecinal */}
              <Text style={styles.labelSeccion}>
                Sellos de recomendación vecinal:
              </Text>

              <View style={styles.etiquetasWrap}>
                {ETIQUETAS_VISTO_BUENO.map((et) => {
                  const activa = etiquetasElegidas.includes(et);
                  return (
                    <Pressable
                      key={et}
                      style={[
                        styles.etiquetaChip,
                        activa && styles.etiquetaChipActiva,
                      ]}
                      onPress={() => alternarEtiqueta(et)}
                    >
                      <Text
                        style={[
                          styles.etiquetaTxt,
                          activa && styles.etiquetaTxtActiva,
                        ]}
                      >
                        {et}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Comentario */}
              <Text style={styles.labelSeccion}>
                Tu recomendación para el barrio (opcional):
              </Text>

              <TextInput
                style={styles.inputComentario}
                placeholder="Ej. Muy puntual, cobró lo acordado y solucionó rápido..."
                placeholderTextColor={C.secundario}
                value={comentario}
                onChangeText={setComentario}
                multiline
                maxLength={350}
              />

              <Pressable
                style={[
                  styles.botonGuardarResena,
                  enviandoCalificacion && { opacity: 0.7 },
                ]}
                onPress={guardarCalificacion}
                disabled={enviandoCalificacion}
              >
                {enviandoCalificacion ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={19}
                      color={C.blanco}
                    />
                    <Text style={styles.botonGuardarResenaTxt}>
                      Otorgar Visto Bueno y Calificar
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Lista de reseñas de vecinos */}
              <View style={styles.resenasHeader}>
                <Text style={styles.labelSeccion}>
                  Opiniones de vecinos ({resenas.length})
                </Text>
              </View>

              {cargandoResenas ? (
                <ActivityIndicator
                  color={C.principal}
                  style={{ marginVertical: 14 }}
                />
              ) : resenas.length === 0 ? (
                <Text style={styles.sinResenasTxt}>
                  Sé el primer vecino en darle el Visto Bueno a este servicio.
                </Text>
              ) : (
                resenas.map((r) => (
                  <View key={r.id} style={styles.resenaItem}>
                    <View style={styles.resenaTop}>
                      <Text style={styles.resenaAutor}>
                        {r.autor.nombre_completo}
                      </Text>
                      <View style={styles.resenaEstrellas}>
                        <Ionicons name="star" size={13} color={C.dorado} />
                        <Text style={styles.resenaCalifTxt}>
                          {r.calificacion}.0
                        </Text>
                        <Text style={styles.resenaFecha}>
                          · {tiempoRelativo(r.created_at)}
                        </Text>
                      </View>
                    </View>
                    {r.comentario ? (
                      <Text style={styles.resenaComentario}>
                        {r.comentario}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  decoracionSuperior: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 170,
    overflow: 'hidden',
  },

  burbujaGrande: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: C.verdeClaro,
    right: -75,
    top: -90,
  },

  burbujaPequena: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.verdeClaro,
    right: 75,
    top: -35,
    opacity: 0.7,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 17,
    gap: 12,
  },

  volver: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borde,
  },

  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: C.principal,
    flex: 1,
  },

  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E65100',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  offlineBadgeTxt: {
    color: C.blanco,
    fontSize: 10,
    fontWeight: '800',
  },

  buscador: {
    height: 50,
    backgroundColor: C.blanco,
    marginHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.borde,
    gap: 10,
  },

  inputBusqueda: {
    flex: 1,
    fontSize: 14,
    color: C.texto,
    height: '100%',
  },

  contenedorFiltros: {
    flexGrow: 0,
  },

  filtros: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 8,
    alignItems: 'center',
  },

  filtro: {
    backgroundColor: C.blanco,
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borde,
  },

  filtroActivo: {
    backgroundColor: C.principal,
    borderColor: C.principal,
  },

  textoFiltro: {
    fontSize: 13,
    fontWeight: '700',
    color: C.texto,
  },

  textoFiltroActivo: {
    color: C.blanco,
  },

  scrollLista: {
    flex: 1,
  },

  lista: {
    paddingHorizontal: 20,
    paddingBottom: 95,
  },

  fabPublicarServicio: {
    position: 'absolute',
    bottom: 22,
    right: 20,
    backgroundColor: C.principal,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: C.principal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  fabPublicarTexto: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },

  inputSimple: {
    height: 48,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    paddingHorizontal: 13,
    fontSize: 13,
    color: C.texto,
    backgroundColor: C.fondo,
    marginBottom: 4,
  },

  encabezadoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  subtitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: C.texto,
  },

  descripcionLista: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 4,
  },

  contador: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contadorTexto: {
    fontSize: 13,
    fontWeight: '800',
    color: C.principal,
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
    elevation: 1,
    shadowColor: C.texto,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: C.verdeClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },

  avatarIcono: {
    fontSize: 23,
  },

  informacion: {
    flex: 1,
  },

  filaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  nombreServicio: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },

  profesional: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 2,
  },

  vistoBuenoBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.verdeClaro,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },

  vistoBuenoTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: C.principal,
  },

  calificacion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    flexWrap: 'wrap',
  },

  calificacionTexto: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '800',
  },

  opiniones: {
    color: C.secundario,
    fontSize: 11,
  },

  ubicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },

  distancia: {
    color: C.secundario,
    fontSize: 11,
  },

  accionesTarjeta: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginLeft: 8,
  },

  botonCalificar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.verdeClaro,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borde,
  },

  botonCalificarTexto: {
    fontSize: 11,
    fontWeight: '800',
    color: C.principal,
  },

  botonLlamar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  vacio: {
    alignItems: 'center',
    paddingVertical: 55,
  },

  vacioIconoContenedor: {
    width: 75,
    height: 75,
    borderRadius: 22,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  vacioTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: C.texto,
    marginTop: 10,
  },

  vacioTexto: {
    fontSize: 14,
    color: C.secundario,
    marginTop: 7,
    textAlign: 'center',
  },

  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(36,55,70,0.48)',
    justifyContent: 'flex-end',
  },

  modalCaja: {
    backgroundColor: C.blanco,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '86%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },

  modalTitulo: {
    fontSize: 20,
    fontWeight: '900',
    color: C.principal,
  },

  modalSubtitulo: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 3,
  },

  modalCerrar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelSeccion: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
    marginTop: 10,
    marginBottom: 8,
  },

  estrellasFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },

  estrellaBtn: {
    padding: 3,
  },

  estrellasValor: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '900',
    color: C.texto,
  },

  etiquetasWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 8,
  },

  etiquetaChip: {
    backgroundColor: C.fondo,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
  },

  etiquetaChipActiva: {
    backgroundColor: C.principal,
    borderColor: C.principal,
  },

  etiquetaTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: C.texto,
  },

  etiquetaTxtActiva: {
    color: C.blanco,
  },

  inputComentario: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
    color: C.texto,
    backgroundColor: C.fondo,
    textAlignVertical: 'top',
  },

  botonGuardarResena: {
    backgroundColor: C.principal,
    borderRadius: 15,
    paddingVertical: 14,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  botonGuardarResenaTxt: {
    color: C.blanco,
    fontWeight: '800',
    fontSize: 14,
  },

  resenasHeader: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.borde,
    paddingTop: 8,
  },

  sinResenasTxt: {
    fontSize: 12,
    color: C.secundario,
    fontStyle: 'italic',
    marginBottom: 12,
  },

  resenaItem: {
    backgroundColor: C.fondo,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.borde,
  },

  resenaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resenaAutor: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
  },

  resenaEstrellas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  resenaCalifTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: C.texto,
  },

  resenaFecha: {
    fontSize: 11,
    color: C.secundario,
  },

  resenaComentario: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 5,
    lineHeight: 18,
  },
});
