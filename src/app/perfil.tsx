
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SelectorUbicacion,
  type UbicacionElegida,
} from '@/components/selector-ubicacion';
import { Api, type Publicacion, type Recurso } from '@/lib/api';
import TutorialModal from '@/components/inicio/TutorialModal';

import { Api, type Publicacion } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { setUsuario, useUsuario } from '@/lib/session';
import {
  ESTADO_TEXTO,
  emojiCategoria,
  mostrarError,
  zonaIdPorNombre,
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

// Misma estructura y orden que la barra inferior de Inicio.
const tabsPerfil = [
  { nombre: 'Inicio', key: 'inicio', icono: 'home-outline' },
  { nombre: 'Publicar', key: 'publicar', icono: 'add-circle-outline' },
  { nombre: 'Tutorial', key: 'tutorial', icono: 'book-outline' },
  { nombre: 'Perfil', key: 'perfil', icono: 'person-outline' },
] as const;

type Seccion =
  | 'publicaciones'
  | 'recomendaciones'
  | 'recursos'
  | 'configuracion'
  | null;

type ItemPublicacion = {
  id: string;
  titulo: string;
  tipo: string;
  descripcion: string;
  estado: string;
  icono: string;
};

type Recomendacion = {
  id: string;
  nombre: string;
  servicio: string;
  calificacion: string;
  opiniones: number;
  icono: string;
  descripcion: string;
};

const TIPO_TEXTO: Record<string, string> = {
  SERVICIO: 'Servicio',
  FAVOR: 'Favor',
  RECURSO: 'Recurso',
  EMERGENCIA: 'Emergencia',
};

const aItem = (p: Publicacion): ItemPublicacion => ({
  id: p.id,
  titulo: p.titulo,
  tipo: `${TIPO_TEXTO[p.tipo] ?? p.tipo} · ${
    p.direccion === 'OFRECE' ? 'Ofrezco' : 'Necesito'
  }`,
  descripcion: p.descripcion,
  estado: ESTADO_TEXTO[p.estado] ?? p.estado,
  icono: emojiCategoria(p.categoria?.nombre),
});

// El backend aún no tiene endpoint de "recomendados": se arma con los
// profesionales mejor calificados entre los servicios publicados.
const aRecomendaciones = (lista: Publicacion[]): Recomendacion[] => {
  const porAutor = new Map<string, Publicacion>();

  for (const p of lista) {
    if (!porAutor.has(p.autor.id)) porAutor.set(p.autor.id, p);
  }

  return [...porAutor.values()]
    .sort(
      (a, b) =>
        b.autor.calificacion_promedio - a.autor.calificacion_promedio
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.autor.id,
      nombre: p.autor.nombre_completo,
      servicio: p.titulo,
      calificacion: p.autor.calificacion_promedio.toFixed(1),
      opiniones: p.autor.total_resenas,
      icono: emojiCategoria(p.categoria?.nombre),
      descripcion: p.descripcion,
    }));
};

type ItemRecurso = {
  id: number;
  remotoId?: string;
  nombre: string;
  descripcion: string;
  cantidad: string;
  disponible: boolean;
  icono: string;
};

const recursosIniciales: ItemRecurso[] = [
  {
    id: 1,
    nombre: 'Escalera doméstica',
    descripcion: 'Escalera de aluminio disponible para préstamo.',
    cantidad: '1 unidad',
    disponible: true,
    icono: '🪜',
  },
  {
    id: 2,
    nombre: 'Herramientas básicas',
    descripcion: 'Martillo, destornilladores y alicates.',
    cantidad: '1 kit',
    disponible: true,
    icono: '🧰',
  },
  {
    id: 3,
    nombre: 'Libros escolares',
    descripcion: 'Material de consulta para estudiantes.',
    cantidad: '5 libros',
    disponible: false,
    icono: '📚',
  },
];

export default function Perfil() {
  const usuario = useUsuario();
  const { t } = useI18n();

  const [seccion, setSeccion] =
    useState<Seccion>(null);

  const [tutorialVisible, setTutorialVisible] =
    useState(false);

  const [nombre, setNombre] =
    useState(usuario?.nombre_completo ?? 'Vecino AquiPe');

  const [telefono, setTelefono] =
    useState(usuario?.telefono ?? '');

  const [zona, setZona] =
    useState(usuario?.zona?.nombre ?? 'Sin zona');

  const [notificaciones, setNotificaciones] =
    useState(usuario?.notificaciones_activas ?? true);

  const [perfilPublico, setPerfilPublico] =
    useState(usuario?.perfil_publico ?? true);

  const [recomendaciones, setRecomendaciones] =
    useState<Recomendacion[]>([]);

  const [recursos, setRecursos] =
    useState(recursosIniciales);

  const [publicaciones, setPublicaciones] =
    useState<ItemPublicacion[]>([]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      (async () => {
        try {
          const mias = await Api.misPublicaciones();
          if (activo) setPublicaciones(mias.map(aItem));
        } catch (e) {
          if (activo) mostrarError(e, 'No se pudieron cargar tus publicaciones');
        }

        try {
          const servicios = await Api.publicaciones({
            tipo: 'SERVICIO',
            direccion: 'OFRECE',
          });
          if (activo) setRecomendaciones(aRecomendaciones(servicios));
        } catch {
          /* las recomendaciones son opcionales */
        }

        try {
          const remotos = await Api.misRecursos();
          if (activo && remotos.length > 0) {
            setRecursos(
              remotos.map((r, idx) => ({
                id: idx + 1000,
                remotoId: r.id,
                nombre: r.nombre,
                descripcion: r.descripcion ?? '',
                cantidad: `${r.cantidad} ${r.unidad ?? 'unidad'}`,
                disponible: r.disponible,
                icono: '📦',
              }))
            );
          }
        } catch {
          /* respaldo local */
        }
      })();

      return () => {
        activo = false;
      };
    }, [])
  );

  // Guarda una preferencia en el backend; si falla, revierte el interruptor.
  const guardarPreferencia = async (
    cambio: { notificaciones_activas?: boolean; perfil_publico?: boolean },
    revertir: () => void
  ) => {
    try {
      setUsuario(await Api.actualizarPerfil(cambio));
    } catch (e) {
      revertir();
      mostrarError(e, 'No se pudo guardar la preferencia');
    }
  };

  const [editarPerfil, setEditarPerfil] =
    useState(false);

  const [nombreTemporal, setNombreTemporal] =
    useState(nombre);

  const [telefonoTemporal, setTelefonoTemporal] =
    useState(telefono);

  const [ubicTemp, setUbicTemp] = useState<UbicacionElegida | null>(null);
  const [zonaTemporal, setZonaTemporal] =
    useState(zona);

  const [nuevoRecursoVisible, setNuevoRecursoVisible] =
    useState(false);

  const [recursoNombre, setRecursoNombre] =
    useState('');

  const [recursoDescripcion, setRecursoDescripcion] =
    useState('');

  const [recursoCantidad, setRecursoCantidad] =
    useState('');

  const abrirEditarPerfil = () => {
    setNombreTemporal(nombre);
    setTelefonoTemporal(telefono);
    setZonaTemporal(zona);
    setUbicTemp(null);
    setEditarPerfil(true);
  };

  const guardarPerfil = async () => {
    if (
      !nombreTemporal.trim() ||
      !telefonoTemporal.trim()
    ) {
      Alert.alert(
        'Campos incompletos',
        'Completa todos los datos del perfil.'
      );
      return;
    }

    try {
      const actualizado = await Api.actualizarPerfil({
        nombre_completo: nombreTemporal.trim(),
        telefono: telefonoTemporal.trim(),
        // Solo si eligió un punto nuevo en el mapa se cambia la zona y la ubicación
        ...(ubicTemp
          ? {
              latitud: ubicTemp.latitude,
              longitud: ubicTemp.longitude,
              ...(ubicTemp.zonaId != null ? { zona_id: ubicTemp.zonaId } : {}),
            }
          : {}),
      });

      setUsuario(actualizado);
      setNombre(actualizado.nombre_completo);
      setTelefono(actualizado.telefono);
      setZona(actualizado.zona?.nombre ?? 'Sin zona');
      setEditarPerfil(false);

      Alert.alert(
        'Perfil actualizado',
        'Tus cambios se guardaron en tu cuenta.'
      );
    } catch (e) {
      mostrarError(e, 'No se pudo actualizar el perfil');
    }
  };

  const agregarRecurso = async () => {
    if (
      !recursoNombre.trim() ||
      !recursoDescripcion.trim() ||
      !recursoCantidad.trim()
    ) {
      Alert.alert(
        'Campos incompletos',
        'Completa los datos del recurso.'
      );
      return;
    }

    let remotoId: string | undefined;
    try {
      const numCant = parseInt(recursoCantidad.match(/\d+/)?.[0] ?? '1', 10) || 1;
      const creado = await Api.crearRecurso({
        nombre: recursoNombre.trim(),
        descripcion: recursoDescripcion.trim(),
        cantidad: numCant,
        unidad: recursoCantidad.trim().slice(0, 30),
      });
      remotoId = creado.id;
    } catch {
      /* guardado local en modo offline */
    }

    setRecursos((prev) => [
      {
        id: Date.now(),
        remotoId,
        nombre: recursoNombre.trim(),
        descripcion: recursoDescripcion.trim(),
        cantidad: recursoCantidad.trim(),
        disponible: true,
        icono: '📦',
      },
      ...prev,
    ]);

    setRecursoNombre('');
    setRecursoDescripcion('');
    setRecursoCantidad('');
    setNuevoRecursoVisible(false);

    Alert.alert(
      'Recurso guardado',
      remotoId
        ? 'Tu recurso se guardó en tu cuenta y ya está disponible para la comunidad.'
        : 'Recurso guardado localmente en Modo Sin Conexión.'
    );
  };

  const cambiarDisponibilidad = (id: number) => {
    setRecursos((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const nuevoEstado = !r.disponible;
        if (r.remotoId) {
          Api.actualizarRecurso(r.remotoId, { disponible: nuevoEstado }).catch(() => {});
        }
        return { ...r, disponible: nuevoEstado };
      })
    );
  };

  const eliminarPublicacion = (id: string) => {
    Alert.alert(
      'Eliminar publicación',
      '¿Deseas eliminar esta publicación?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await Api.eliminarPublicacion(id);
              setPublicaciones((prev) =>
                prev.filter((p) => p.id !== id)
              );
            } catch (e) {
              mostrarError(e, 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Deseas cerrar tu sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Continuar',
          onPress: () => {
            setUsuario(null);
            router.replace('/login');
          },
        },
      ]
    );
  };

  const opciones = [
    {
      id: 'publicaciones' as const,
      titulo: 'Mis publicaciones',
      detalle: 'Tus solicitudes y ofrecimientos',
      icono: 'document-text-outline' as const,
    },
    {
      id: 'recomendaciones' as const,
      titulo: 'Mis recomendaciones',
      detalle: 'Servicios y vecinos recomendados',
      icono: 'star-outline' as const,
    },
    {
      id: 'recursos' as const,
      titulo: 'Mis recursos disponibles',
      detalle: 'Recursos que puedes compartir',
      icono: 'cube-outline' as const,
    },
    {
      id: 'configuracion' as const,
      titulo: 'Configuración',
      detalle: 'Preferencias de la cuenta',
      icono: 'settings-outline' as const,
    },
  ];

  const renderPublicaciones = () => (
    <>
      <Text style={s.descripcionSeccion}>
        Consulta tus solicitudes y favores publicados.
      </Text>

      {publicaciones.length === 0 ? (
        <View style={s.vacio}>
          <Ionicons
            name="document-text-outline"
            size={38}
            color={C.principal}
          />
          <Text style={s.vacioTexto}>
            No tienes publicaciones.
          </Text>
        </View>
      ) : (
        publicaciones.map((item) => (
          <View key={item.id} style={s.tarjeta}>
            <View style={s.tarjetaFila}>
              <View style={s.iconoTarjeta}>
                <Text style={s.emoji}>
                  {item.icono}
                </Text>
              </View>

              <View style={s.tarjetaInfo}>
                <Text style={s.tarjetaTitulo}>
                  {item.titulo}
                </Text>

                <Text style={s.tarjetaSubtitulo}>
                  {item.tipo}
                </Text>
              </View>
            </View>

            <Text style={s.tarjetaDescripcion}>
              {item.descripcion}
            </Text>

            <View style={s.tarjetaInferior}>
              <View style={s.estado}>
                <Text style={s.estadoTexto}>
                  {item.estado}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  eliminarPublicacion(item.id)
                }
                style={s.eliminarBoton}
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color={C.secundario}
                />
                <Text style={s.eliminarTexto}>
                  Eliminar
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </>
  );

  const renderRecomendaciones = () => (
    <>
      <Text style={s.descripcionSeccion}>
        Profesionales y vecinos destacados de tu comunidad.
      </Text>

      {recomendaciones.map((item) => (
        <View key={item.id} style={s.tarjeta}>
          <View style={s.tarjetaFila}>
            <View style={s.iconoTarjeta}>
              <Text style={s.emoji}>
                {item.icono}
              </Text>
            </View>

            <View style={s.tarjetaInfo}>
              <Text style={s.tarjetaTitulo}>
                {item.nombre}
              </Text>

              <Text style={s.tarjetaSubtitulo}>
                {item.servicio}
              </Text>
            </View>

            <View style={s.calificacion}>
              <Ionicons
                name="star"
                size={15}
                color={C.principal}
              />

              <Text style={s.calificacionTexto}>
                {item.calificacion}
              </Text>
            </View>
          </View>

          <Text style={s.tarjetaDescripcion}>
            {item.descripcion}
          </Text>

          <Text style={s.opiniones}>
            {item.opiniones} opiniones de vecinos
          </Text>
        </View>
      ))}
    </>
  );

  const renderRecursos = () => (
    <>
      <Text style={s.descripcionSeccion}>
        Administra los recursos que puedes compartir
        con tu comunidad.
      </Text>

      <Pressable
        style={s.botonPrincipal}
        onPress={() =>
          setNuevoRecursoVisible(true)
        }
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={C.blanco}
        />

        <Text style={s.botonPrincipalTexto}>
          Agregar recurso
        </Text>
      </Pressable>

      {recursos.map((item) => (
        <View key={item.id} style={s.tarjeta}>
          <View style={s.tarjetaFila}>
            <View style={s.iconoTarjeta}>
              <Text style={s.emoji}>
                {item.icono}
              </Text>
            </View>

            <View style={s.tarjetaInfo}>
              <Text style={s.tarjetaTitulo}>
                {item.nombre}
              </Text>

              <Text style={s.tarjetaSubtitulo}>
                {item.cantidad}
              </Text>
            </View>
          </View>

          <Text style={s.tarjetaDescripcion}>
            {item.descripcion}
          </Text>

          <View style={s.recursoInferior}>
            <View style={s.estado}>
              <Text style={s.estadoTexto}>
                {item.disponible
                  ? 'Disponible'
                  : 'No disponible'}
              </Text>
            </View>

            <Switch
              value={item.disponible}
              onValueChange={() =>
                cambiarDisponibilidad(item.id)
              }
              trackColor={{
                false: C.borde,
                true: C.principal,
              }}
              thumbColor={C.blanco}
            />
          </View>
        </View>
      ))}
    </>
  );

  const renderConfiguracion = () => (
    <>
      <Text style={s.descripcionSeccion}>
        Personaliza tu perfil y tus preferencias.
      </Text>

      <View style={s.configCard}>
        <Text style={s.configTitulo}>
          Información personal
        </Text>

        <View style={s.configFila}>
          <Ionicons
            name="person-outline"
            size={19}
            color={C.principal}
          />

          <View style={s.configInfo}>
            <Text style={s.configLabel}>
              Nombre
            </Text>
            <Text style={s.configValor}>
              {nombre}
            </Text>
          </View>
        </View>

        <View style={s.configFila}>
          <Ionicons
            name="call-outline"
            size={19}
            color={C.principal}
          />

          <View style={s.configInfo}>
            <Text style={s.configLabel}>
              Teléfono
            </Text>
            <Text style={s.configValor}>
              {telefono}
            </Text>
          </View>
        </View>

        <View style={s.configFila}>
          <Ionicons
            name="location-outline"
            size={19}
            color={C.principal}
          />

          <View style={s.configInfo}>
            <Text style={s.configLabel}>
              Zona
            </Text>
            <Text style={s.configValor}>
              {zona}
            </Text>
          </View>
        </View>

        <Pressable
          style={s.botonSecundario}
          onPress={abrirEditarPerfil}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={C.principal}
          />

          <Text style={s.botonSecundarioTexto}>
            Editar información
          </Text>
        </Pressable>
      </View>

      <View style={s.configCard}>
        <Text style={s.configTitulo}>
          Preferencias
        </Text>

        <View style={s.preferenciaFila}>
          <View style={s.configInfo}>
            <Text style={s.preferenciaTitulo}>
              Notificaciones
            </Text>

            <Text style={s.preferenciaDescripcion}>
              Recibir avisos de la comunidad
            </Text>
          </View>

          <Switch
            value={notificaciones}
            onValueChange={(valor) => {
              setNotificaciones(valor);
              guardarPreferencia(
                { notificaciones_activas: valor },
                () => setNotificaciones(!valor)
              );
            }}
            trackColor={{
              false: C.borde,
              true: C.principal,
            }}
            thumbColor={C.blanco}
          />
        </View>

        <View style={s.preferenciaFila}>
          <View style={s.configInfo}>
            <Text style={s.preferenciaTitulo}>
              Perfil público
            </Text>

            <Text style={s.preferenciaDescripcion}>
              Permitir que vecinos vean tu perfil
            </Text>
          </View>

          <Switch
            value={perfilPublico}
            onValueChange={(valor) => {
              setPerfilPublico(valor);
              guardarPreferencia(
                { perfil_publico: valor },
                () => setPerfilPublico(!valor)
              );
            }}
            trackColor={{
              false: C.borde,
              true: C.principal,
            }}
            thumbColor={C.blanco}
          />
        </View>
      </View>

      <Text style={s.notaDemo}>
        Tus cambios se guardan en tu cuenta.
      </Text>
    </>
  );

  const renderSeccion = () => {
    switch (seccion) {
      case 'publicaciones':
        return renderPublicaciones();
      case 'recomendaciones':
        return renderRecomendaciones();
      case 'recursos':
        return renderRecursos();
      case 'configuracion':
        return renderConfiguracion();
      default:
        return null;
    }
  };

  const tituloSeccion = () => {
    switch (seccion) {
      case 'publicaciones':
        return 'Mis publicaciones';
      case 'recomendaciones':
        return 'Mis recomendaciones';
      case 'recursos':
        return 'Mis recursos disponibles';
      case 'configuracion':
        return 'Configuración';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={s.page}>
      {seccion === null ? (
        <>
          {/* Encabezado */}
          <View style={s.header}>
            <Pressable
              onPress={() => router.back()}
              style={s.back}
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color={C.principal}
              />
            </Pressable>

            <Text style={s.title}>
              Mi Perfil
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Usuario */}
            <View style={s.user}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {nombre.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={s.userInfo}>
                <Text style={s.name}>
                  {nombre}
                </Text>

                <Text style={s.status}>
                  Vecino activo · Perfil de ejemplo
                </Text>

                <View style={s.zonaPerfil}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={C.principal}
                  />

                  <Text style={s.zonaPerfilTexto}>
                    {zona}
                  </Text>
                </View>
              </View>
            </View>

            {/* Resumen */}
            <View style={s.estadisticas}>
              <View style={s.estadistica}>
                <Text style={s.estadisticaNumero}>
                  {publicaciones.length}
                </Text>

                <Text style={s.estadisticaLabel}>
                  Publicaciones
                </Text>
              </View>

              <View style={s.estadisticaSeparador} />

              <View style={s.estadistica}>
                <Text style={s.estadisticaNumero}>
                  {recursos.length}
                </Text>

                <Text style={s.estadisticaLabel}>
                  Recursos
                </Text>
              </View>

              <View style={s.estadisticaSeparador} />

              <View style={s.estadistica}>
                <Text style={s.estadisticaNumero}>
                  {recomendaciones.length}
                </Text>

                <Text style={s.estadisticaLabel}>
                  Recomendados
                </Text>
              </View>
            </View>

            <Text style={s.sectionTitle}>
              Mi actividad
            </Text>

            {/* Menú */}
            <View style={s.menu}>
              {opciones.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[
                    s.menuRow,
                    index === opciones.length - 1 &&
                      s.menuRowUltimo,
                  ]}
                  onPress={() =>
                    setSeccion(item.id)
                  }
                >
                  <View style={s.menuIcon}>
                    <Ionicons
                      name={item.icono}
                      size={22}
                      color={C.principal}
                    />
                  </View>

                  <View style={s.menuInfo}>
                    <Text style={s.menuTitle}>
                      {item.titulo}
                    </Text>

                    <Text style={s.menuDetalle}>
                      {item.detalle}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={C.principal}
                  />
                </Pressable>
              ))}
            </View>

            {/* Salir */}
            <Pressable
              style={s.logout}
              onPress={cerrarSesion}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={C.principal}
              />

              <Text style={s.logoutText}>
                Cerrar sesión
              </Text>
            </Pressable>
          </ScrollView>

          {/* Navegación inferior: mismo diseño que Inicio, con Perfil activo */}
          <View style={s.navContainer}>
            <View style={s.nav}>
              {tabsPerfil.map((tab) => {
                const activa = tab.nombre === 'Perfil';
                const etiqueta = t[tab.key];

                return (
                  <Pressable
                    key={tab.nombre}
                    style={[s.navItem, activa && s.navItemActive]}
                    onPress={() => {
                      if (tab.nombre === 'Inicio') {
                        router.replace('/inicio');
                      } else if (tab.nombre === 'Publicar') {
                        router.push('/publicar');
                      } else if (tab.nombre === 'Tutorial') {
                        setTutorialVisible(true);
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
                      <Text style={s.navActiveText}>
                        {etiqueta}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Encabezado de sección */}
          <View style={s.header}>
            <Pressable
              style={s.back}
              onPress={() =>
                setSeccion(null)
              }
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color={C.principal}
              />
            </Pressable>

            <Text style={s.title}>
              {tituloSeccion()}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
          >
            {renderSeccion()}
          </ScrollView>
        </>
      )}

      {/* Modal editar perfil */}
      <Modal
        visible={editarPerfil}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setEditarPerfil(false)
        }
      >
        <KeyboardAvoidingView
          style={s.modalFondo}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={s.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.modalContenido}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitulo}>
                  Editar perfil
                </Text>

                <Pressable
                  style={s.cerrar}
                  onPress={() =>
                    setEditarPerfil(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={C.secundario}
                  />
                </Pressable>
              </View>

              <Text style={s.label}>
                Nombre completo
              </Text>

              <TextInput
                style={s.input}
                value={nombreTemporal}
                onChangeText={setNombreTemporal}
                placeholder="Tu nombre"
                placeholderTextColor={C.secundario}
              />

              <Text style={s.label}>
                Teléfono
              </Text>

              <TextInput
                style={s.input}
                value={telefonoTemporal}
                onChangeText={setTelefonoTemporal}
                keyboardType="phone-pad"
                placeholder="Tu teléfono"
                placeholderTextColor={C.secundario}
              />

              <Text style={s.label}>
                Zona o barrio
              </Text>

              <SelectorUbicacion
                value={ubicTemp}
                onChange={setUbicTemp}
                placeholder={`${zonaTemporal || 'Sin zona'} · toca para cambiar en el mapa`}
              />

              <Pressable
                style={s.botonPrincipal}
                onPress={guardarPerfil}
              >
                <Text style={s.botonPrincipalTexto}>
                  Guardar cambios
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal agregar recurso */}
      <Modal
        visible={nuevoRecursoVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setNuevoRecursoVisible(false)
        }
      >
        <KeyboardAvoidingView
          style={s.modalFondo}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={s.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.modalContenido}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitulo}>
                  Agregar recurso
                </Text>

                <Pressable
                  style={s.cerrar}
                  onPress={() =>
                    setNuevoRecursoVisible(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={C.secundario}
                  />
                </Pressable>
              </View>

              <Text style={s.label}>
                Nombre del recurso
              </Text>

              <TextInput
                style={s.input}
                value={recursoNombre}
                onChangeText={setRecursoNombre}
                placeholder="Ej. Escalera"
                placeholderTextColor={C.secundario}
              />

              <Text style={s.label}>
                Descripción
              </Text>

              <TextInput
                style={[
                  s.input,
                  s.inputMultilinea,
                ]}
                value={recursoDescripcion}
                onChangeText={setRecursoDescripcion}
                placeholder="Describe el recurso..."
                placeholderTextColor={C.secundario}
                multiline
                textAlignVertical="top"
              />

              <Text style={s.label}>
                Cantidad
              </Text>

              <TextInput
                style={s.input}
                value={recursoCantidad}
                onChangeText={setRecursoCantidad}
                placeholder="Ej. 2 unidades"
                placeholderTextColor={C.secundario}
              />

              <Pressable
                style={s.botonPrincipal}
                onPress={agregarRecurso}
              >
                <Text style={s.botonPrincipalTexto}>
                  Guardar recurso
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Tutorial visual compartido con Inicio */}
      <TutorialModal
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 17,
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

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.principal,
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 22,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.borde,
  },

  avatarText: {
    fontSize: 34,
    fontWeight: '900',
    color: C.principal,
  },

  userInfo: {
    flex: 1,
  },

  name: {
    fontSize: 21,
    fontWeight: '900',
    color: C.texto,
  },

  status: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 5,
  },

  zonaPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
  },

  zonaPerfilTexto: {
    fontSize: 12,
    color: C.principal,
    fontWeight: '700',
  },

  estadisticas: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 17,
    paddingVertical: 17,
    marginBottom: 27,
  },

  estadistica: {
    flex: 1,
    alignItems: 'center',
  },

  estadisticaNumero: {
    fontSize: 21,
    fontWeight: '900',
    color: C.principal,
  },

  estadisticaLabel: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 4,
  },

  estadisticaSeparador: {
    width: 1,
    height: 33,
    backgroundColor: C.borde,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 13,
  },

  menu: {
    backgroundColor: C.blanco,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
    overflow: 'hidden',
  },

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
    gap: 12,
  },

  menuRowUltimo: {
    borderBottomWidth: 0,
  },

  menuIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuInfo: {
    flex: 1,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },

  menuDetalle: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 4,
  },

  logout: {
    backgroundColor: C.verdeClaro,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    borderRadius: 15,
    marginTop: 24,
    borderWidth: 1,
    borderColor: C.borde,
  },

  logoutText: {
    fontWeight: '800',
    color: C.principal,
    fontSize: 14,
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

  descripcionSeccion: {
    fontSize: 13,
    color: C.secundario,
    lineHeight: 20,
    marginBottom: 18,
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borde,
    marginBottom: 10,
  },

  tarjetaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 10,
  },

  iconoTarjeta: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emoji: {
    fontSize: 23,
  },

  tarjetaInfo: {
    flex: 1,
  },

  tarjetaTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },

  tarjetaSubtitulo: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 3,
  },

  tarjetaDescripcion: {
    fontSize: 13,
    color: C.secundario,
    lineHeight: 19,
    marginBottom: 10,
  },

  tarjetaInferior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  estado: {
    backgroundColor: C.verdeClaro,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  estadoTexto: {
    fontSize: 11,
    fontWeight: '800',
    color: C.principal,
  },

  eliminarBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 5,
  },

  eliminarTexto: {
    fontSize: 12,
    color: C.secundario,
    fontWeight: '700',
  },

  calificacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  calificacionTexto: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
  },

  opiniones: {
    fontSize: 11,
    color: C.secundario,
  },

  recursoInferior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  botonPrincipal: {
    backgroundColor: C.principal,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    marginBottom: 17,
  },

  botonPrincipalTexto: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },

  configCard: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.borde,
    marginBottom: 13,
  },

  configTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 16,
  },

  configFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  configInfo: {
    flex: 1,
  },

  configLabel: {
    fontSize: 11,
    color: C.secundario,
  },

  configValor: {
    fontSize: 14,
    color: C.texto,
    fontWeight: '700',
    marginTop: 3,
  },

  botonSecundario: {
    backgroundColor: C.verdeClaro,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  botonSecundarioTexto: {
    color: C.principal,
    fontWeight: '800',
    fontSize: 13,
  },

  preferenciaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
    gap: 10,
  },

  preferenciaTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: C.texto,
  },

  preferenciaDescripcion: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 4,
  },

  notaDemo: {
    fontSize: 12,
    color: C.secundario,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },

  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(36,55,70,0.48)',
    justifyContent: 'flex-end',
  },

  modalScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  modalContenido: {
    backgroundColor: C.blanco,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    paddingBottom: 38,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  modalTitulo: {
    fontSize: 21,
    fontWeight: '800',
    color: C.principal,
    flex: 1,
  },

  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 8,
  },

  input: {
    height: 52,
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.texto,
    marginBottom: 17,
  },

  inputMultilinea: {
    height: 90,
    paddingTop: 13,
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

  vacio: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 12,
  },

  vacioTexto: {
    fontSize: 14,
    color: C.secundario,
  },
});
