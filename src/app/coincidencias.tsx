
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Api, type Publicacion } from '@/lib/api';
import { getUsuario } from '@/lib/session';
import {
  distanciaTexto,
  mostrarError,
  obtenerUbicacion,
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

type Coincidencia = {
  id: string;
  solicitud: string;
  categoria: string;
  persona: string;
  ofrecimiento: string;
  descripcion: string;
  zona: string;
  distancia: string;
  solicitudId: string;
  icono: keyof typeof Ionicons.glyphMap;
  inicial: string;
};

type Filtro = string;

// Coincidencias descartadas durante la sesión (solo local).
const descartadasIds = new Set<string>();

/**
 * Una "coincidencia" es una oferta de otro vecino (mismo tipo y misma categoría)
 * para algo que yo tengo pedido y sigue abierto.
 */
function calcularCoincidencias(
  mias: Publicacion[],
  ofertas: Publicacion[]
): Coincidencia[] {
  const yo = getUsuario()?.id;
  const vistas = new Set<string>();
  const resultado: Coincidencia[] = [];

  for (const pedido of mias) {
    if (pedido.categoria == null) continue;

    for (const oferta of ofertas) {
      if (oferta.autor.id === yo || vistas.has(oferta.id)) continue;
      if (oferta.tipo !== pedido.tipo) continue;
      if (oferta.categoria?.id !== pedido.categoria.id) continue;

      vistas.add(oferta.id);

      const icono = `${oferta.categoria?.icono ?? 'grid'}-outline`;
      resultado.push({
        id: oferta.id,
        solicitudId: pedido.id,
        solicitud: pedido.titulo,
        categoria: oferta.categoria?.nombre ?? 'Otro',
        persona: oferta.autor.nombre_completo,
        ofrecimiento: oferta.titulo,
        descripcion: oferta.descripcion,
        zona: oferta.zona?.nombre ?? 'Cerca de tu barrio',
        distancia: distanciaTexto(oferta.distancia_km),
        icono: icono as keyof typeof Ionicons.glyphMap,
        inicial: oferta.autor.nombre_completo.charAt(0).toUpperCase(),
      });
    }
  }

  return resultado;
}

export default function Coincidencias() {
  const [coincidencias, setCoincidencias] =
    useState<Coincidencia[]>([]);

  const [descartadas, setDescartadas] =
    useState<Coincidencia[]>([]);

  const [filtro, setFiltro] = useState<Filtro>('Todas');

  const [seleccionada, setSeleccionada] =
    useState<Coincidencia | null>(null);

  const [mostrarDescartadas, setMostrarDescartadas] =
    useState(false);

  const cargar = useCallback(async () => {
    try {
      const pos = await obtenerUbicacion();

      const [mias, ofertas] = await Promise.all([
        Api.misPublicaciones(),
        Api.publicaciones({
          direccion: 'OFRECE',
          lat: pos.latitude,
          lng: pos.longitude,
        }),
      ]);

      const abiertas = mias.filter(
        (p) =>
          p.estado === 'ABIERTA' &&
          p.direccion === 'SOLICITA' &&
          (p.tipo === 'SERVICIO' || p.tipo === 'FAVOR')
      );

      setCoincidencias(
        calcularCoincidencias(abiertas, ofertas).filter(
          (c) => !descartadasIds.has(c.id)
        )
      );
    } catch (e) {
      mostrarError(e, 'No se pudieron cargar las coincidencias');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const filtros = useMemo(
    () => [
      'Todas',
      ...new Set([...coincidencias, ...descartadas].map((c) => c.categoria)),
    ],
    [coincidencias, descartadas]
  );

  const filtradas = useMemo(() => {
    const lista = mostrarDescartadas
      ? descartadas
      : coincidencias;

    return lista.filter(
      (item) =>
        filtro === 'Todas' ||
        item.categoria === filtro
    );
  }, [
    coincidencias,
    descartadas,
    filtro,
    mostrarDescartadas,
  ]);

  const descartar = (item: Coincidencia) => {
    Alert.alert(
      'Descartar coincidencia',
      `¿Deseas descartar la coincidencia con ${item.persona}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Descartar',
          onPress: () => {
            descartadasIds.add(item.id);

            setCoincidencias((prev) =>
              prev.filter((c) => c.id !== item.id)
            );

            setDescartadas((prev) => [
              item,
              ...prev,
            ]);

            setSeleccionada(null);
          },
        },
      ]
    );
  };

  const recuperar = (item: Coincidencia) => {
    descartadasIds.delete(item.id);

    setDescartadas((prev) =>
      prev.filter((c) => c.id !== item.id)
    );

    setCoincidencias((prev) => [
      item,
      ...prev,
    ]);

    Alert.alert(
      'Coincidencia recuperada',
      'La coincidencia vuelve a estar disponible.'
    );
  };

  const solicitarContacto = async () => {
    if (!seleccionada) {
      return;
    }

    const elegida = seleccionada;

    try {
      await Api.responder(
        elegida.id,
        `Hola, vi tu publicación "${elegida.ofrecimiento}" y me interesa. Es para mi solicitud: ${elegida.solicitud}.`.slice(0, 500)
      );

      setSeleccionada(null);

      Alert.alert(
        'Solicitud enviada',
        `${elegida.persona} recibirá tu mensaje y podrá aceptarlo.`
      );
    } catch (e) {
      mostrarError(e, 'No se pudo enviar la solicitud');
    }
  };

  return (
    <SafeAreaView style={s.page}>
      {/* ENCABEZADO */}
      <View style={s.header}>
        <Pressable
          style={s.back}
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

        <View style={s.headerIcon}>
          <Ionicons
            name="sparkles"
            size={22}
            color={C.principal}
          />
        </View>

        <Text style={s.headerTitle}>
          Coincidencias
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* RESUMEN */}
        <View style={s.resumen}>
          <View style={s.resumenIcon}>
            <Ionicons
              name="people-outline"
              size={25}
              color={C.principal}
            />
          </View>

          <View style={s.resumenInfo}>
            <Text style={s.resumenTitulo}>
              MatchVecinal
            </Text>

            <Text style={s.resumenDescripcion}>
              Encuentra vecinos que pueden ayudarte
              con lo que necesitas.
            </Text>
          </View>
        </View>

        {/* ESTADÍSTICAS */}
        <View style={s.estadisticas}>
          <View style={s.estadistica}>
            <Text style={s.estadisticaNumero}>
              {coincidencias.length}
            </Text>
            <Text style={s.estadisticaTexto}>
              Disponibles
            </Text>
          </View>

          <View style={s.separadorVertical} />

          <View style={s.estadistica}>
            <Text style={s.estadisticaNumero}>
              {descartadas.length}
            </Text>
            <Text style={s.estadisticaTexto}>
              Descartadas
            </Text>
          </View>
        </View>

        {/* PESTAÑAS */}
        <View style={s.tabs}>
          <Pressable
            style={[
              s.tab,
              !mostrarDescartadas && s.tabActivo,
            ]}
            onPress={() => setMostrarDescartadas(false)}
          >
            <Text
              style={[
                s.tabTexto,
                !mostrarDescartadas && s.tabTextoActivo,
              ]}
            >
              Coincidencias
            </Text>
          </Pressable>

          <Pressable
            style={[
              s.tab,
              mostrarDescartadas && s.tabActivo,
            ]}
            onPress={() => setMostrarDescartadas(true)}
          >
            <Text
              style={[
                s.tabTexto,
                mostrarDescartadas && s.tabTextoActivo,
              ]}
            >
              Descartadas
            </Text>
          </Pressable>
        </View>

        {/* FILTROS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filtrosScroll}
          contentContainerStyle={s.filtros}
        >
          {filtros.map((item) => {
            const activo = filtro === item;

            return (
              <Pressable
                key={item}
                style={[
                  s.filtro,
                  activo && s.filtroActivo,
                ]}
                onPress={() => setFiltro(item)}
              >
                <Text
                  style={[
                    s.filtroTexto,
                    activo && s.filtroTextoActivo,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* LISTA DE COINCIDENCIAS */}
        <Text style={s.sectionTitle}>
          {mostrarDescartadas
            ? 'Coincidencias descartadas'
            : 'Encontramos ayuda para ti'}
        </Text>

        {filtradas.length === 0 ? (
          <View style={s.vacio}>
            <View style={s.vacioIcono}>
              <Ionicons
                name="search-outline"
                size={32}
                color={C.principal}
              />
            </View>

            <Text style={s.vacioTitulo}>
              No hay coincidencias
            </Text>

            <Text style={s.vacioDescripcion}>
              {mostrarDescartadas
                ? 'No tienes coincidencias descartadas en esta categoría.'
                : 'Prueba con otra categoría para encontrar ayuda.'}
            </Text>
          </View>
        ) : (
          filtradas.map((item) => (
            <View
              key={item.id}
              style={s.coincidenciaContainer}
            >
              <View style={s.coincidenciaCard}>
                <View style={s.coincidenciaHeader}>
                  <View style={s.sparkleBox}>
                    <Ionicons
                      name="sparkles"
                      size={27}
                      color={C.principal}
                    />
                  </View>

                  <View style={s.coincidenciaHeaderInfo}>
                    <Text style={s.coincidenciaTitulo}>
                      ¡Tenemos una coincidencia!
                    </Text>

                    <Text style={s.coincidenciaSubtitulo}>
                      Un vecino puede ayudarte
                    </Text>
                  </View>
                </View>

                {/* SOLICITUD */}
                <View style={s.coincidenciaFila}>
                  <View style={s.itemIcon}>
                    <Ionicons
                      name={item.icono}
                      size={26}
                      color={C.principal}
                    />
                  </View>

                  <View style={s.itemInfo}>
                    <Text style={s.itemLabel}>
                      Tu solicitud:
                    </Text>

                    <Text style={s.itemTitulo}>
                      {item.solicitud}
                    </Text>
                  </View>
                </View>

                {/* OFRECIMIENTO */}
                <View style={s.coincidenciaFila}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {item.inicial}
                    </Text>
                  </View>

                  <View style={s.itemInfo}>
                    <Text style={s.itemLabel}>
                      Coincide con:
                    </Text>

                    <Text style={s.itemTitulo}>
                      {item.ofrecimiento}
                    </Text>
                  </View>
                </View>

                <View style={s.distanciaFila}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={C.secundario}
                  />

                  <Text style={s.distanciaTexto}>
                    A {item.distancia}
                  </Text>

                  <View style={s.categoriaBadge}>
                    <Text style={s.categoriaTexto}>
                      {item.categoria}
                    </Text>
                  </View>
                </View>
              </View>

              {mostrarDescartadas ? (
                <Pressable
                  style={s.botonPrincipal}
                  onPress={() => recuperar(item)}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={18}
                    color={C.blanco}
                  />

                  <Text style={s.botonPrincipalTexto}>
                    Recuperar coincidencia
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    style={s.botonPrincipal}
                    onPress={() => setSeleccionada(item)}
                  >
                    <Text style={s.botonPrincipalTexto}>
                      Ver detalles
                    </Text>
                  </Pressable>

                  <Pressable
                    style={s.botonSecundario}
                    onPress={() => descartar(item)}
                  >
                    <Text style={s.botonSecundarioTexto}>
                      Descartar
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          ))
        )}

        <Text style={s.nota}>
          Las coincidencias se calculan con tus solicitudes
          abiertas y las ofertas de tus vecinos.
          Publica una solicitud para ver más.
        </Text>
      </ScrollView>

      {/* MODAL DE DETALLES */}
      <Modal
        visible={seleccionada !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSeleccionada(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitulo}>
                Detalles de coincidencia
              </Text>

              <Pressable
                style={s.cerrarModal}
                onPress={() => setSeleccionada(null)}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={C.secundario}
                />
              </Pressable>
            </View>

            {seleccionada && (
              <ScrollView
                showsVerticalScrollIndicator={false}
              >
                <View style={s.detallePersona}>
                  <View style={s.avatarGrande}>
                    <Text style={s.avatarGrandeTexto}>
                      {seleccionada.inicial}
                    </Text>
                  </View>

                  <Text style={s.detalleNombre}>
                    {seleccionada.persona}
                  </Text>

                  <Text style={s.detalleSubtitulo}>
                    Vecino de tu comunidad
                  </Text>
                </View>

                <View style={s.detalleBloque}>
                  <Text style={s.detalleLabel}>
                    Tu solicitud
                  </Text>

                  <Text style={s.detalleValor}>
                    {seleccionada.solicitud}
                  </Text>
                </View>

                <View style={s.detalleBloque}>
                  <Text style={s.detalleLabel}>
                    Ofrecimiento
                  </Text>

                  <Text style={s.detalleValor}>
                    {seleccionada.ofrecimiento}
                  </Text>
                </View>

                <View style={s.detalleBloque}>
                  <Text style={s.detalleLabel}>
                    Descripción
                  </Text>

                  <Text style={s.detalleDescripcion}>
                    {seleccionada.descripcion}
                  </Text>
                </View>

                <View style={s.detalleBloque}>
                  <Text style={s.detalleLabel}>
                    Ubicación aproximada
                  </Text>

                  <View style={s.detalleUbicacion}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={C.principal}
                    />

                    <Text style={s.detalleValor}>
                      {seleccionada.zona}
                      {' · '}
                      {seleccionada.distancia}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={s.botonPrincipal}
                  onPress={solicitarContacto}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={19}
                    color={C.blanco}
                  />

                  <Text style={s.botonPrincipalTexto}>
                    Solicitar contacto
                  </Text>
                </Pressable>

                <Text style={s.modalNota}>
                  Se enviará tu mensaje al vecino.
                  Él decidirá si lo acepta.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 13,
    paddingBottom: 17,
    gap: 10,
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

  headerIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.principal,
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 35,
  },

  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.verdeClaro,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 15,
  },

  resumenIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resumenInfo: {
    flex: 1,
  },

  resumenTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: C.texto,
  },

  resumenDescripcion: {
    fontSize: 12,
    lineHeight: 18,
    color: C.secundario,
    marginTop: 4,
  },

  estadisticas: {
    flexDirection: 'row',
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    paddingVertical: 13,
    marginBottom: 18,
    alignItems: 'center',
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

  estadisticaTexto: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 3,
  },

  separadorVertical: {
    width: 1,
    height: 29,
    backgroundColor: C.borde,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: C.verdeClaro,
    borderRadius: 13,
    padding: 4,
    marginBottom: 15,
  },

  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
  },

  tabActivo: {
    backgroundColor: C.principal,
  },

  tabTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: C.secundario,
  },

  tabTextoActivo: {
    color: C.blanco,
  },

  filtrosScroll: {
    flexGrow: 0,
    marginBottom: 19,
  },

  filtros: {
    gap: 8,
    alignItems: 'center',
  },

  filtro: {
    backgroundColor: C.blanco,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borde,
  },

  filtroActivo: {
    backgroundColor: C.principal,
    borderColor: C.principal,
  },

  filtroTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: C.texto,
  },

  filtroTextoActivo: {
    color: C.blanco,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 14,
  },

  coincidenciaContainer: {
    marginBottom: 20,
  },

  coincidenciaCard: {
    backgroundColor: C.blanco,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: C.texto,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },

  coincidenciaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 17,
  },

  sparkleBox: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  coincidenciaHeaderInfo: {
    flex: 1,
  },

  coincidenciaTitulo: {
    fontSize: 15,
    fontWeight: '900',
    color: C.texto,
  },

  coincidenciaSubtitulo: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 4,
  },

  coincidenciaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },

  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borde,
  },

  avatarText: {
    fontSize: 21,
    fontWeight: '900',
    color: C.principal,
  },

  itemInfo: {
    flex: 1,
  },

  itemLabel: {
    fontSize: 11,
    color: C.secundario,
    marginBottom: 4,
  },

  itemTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
    lineHeight: 18,
  },

  distanciaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },

  distanciaTexto: {
    fontSize: 11,
    color: C.secundario,
    flex: 1,
  },

  categoriaBadge: {
    backgroundColor: C.verdeClaro,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  categoriaTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: C.principal,
  },

  botonPrincipal: {
    backgroundColor: C.principal,
    borderRadius: 13,
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
  },

  botonPrincipalTexto: {
    fontSize: 14,
    fontWeight: '800',
    color: C.blanco,
  },

  botonSecundario: {
    backgroundColor: C.verdeClaro,
    borderRadius: 13,
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borde,
  },

  botonSecundarioTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: C.texto,
  },

  nota: {
    fontSize: 11,
    color: C.secundario,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },

  vacio: {
    alignItems: 'center',
    paddingVertical: 45,
    gap: 10,
  },

  vacioIcono: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  vacioTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
  },

  vacioDescripcion: {
    fontSize: 12,
    color: C.secundario,
    textAlign: 'center',
    lineHeight: 19,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(36,55,70,0.5)',
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor: C.fondo,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 35,
    maxHeight: '88%',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  modalTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: C.principal,
    flex: 1,
  },

  cerrarModal: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detallePersona: {
    alignItems: 'center',
    marginBottom: 23,
  },

  avatarGrande: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  avatarGrandeTexto: {
    fontSize: 31,
    fontWeight: '900',
    color: C.principal,
  },

  detalleNombre: {
    fontSize: 20,
    fontWeight: '900',
    color: C.texto,
  },

  detalleSubtitulo: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 4,
  },

  detalleBloque: {
    backgroundColor: C.blanco,
    borderRadius: 13,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borde,
    marginBottom: 11,
  },

  detalleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.secundario,
    marginBottom: 7,
  },

  detalleValor: {
    fontSize: 14,
    fontWeight: '700',
    color: C.texto,
    lineHeight: 20,
  },

  detalleDescripcion: {
    fontSize: 13,
    color: C.texto,
    lineHeight: 20,
  },

  detalleUbicacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  modalNota: {
    fontSize: 11,
    color: C.secundario,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 10,
  },
});
