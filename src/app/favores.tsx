import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

import {
  SelectorUbicacion,
  type UbicacionElegida,
} from '@/components/selector-ubicacion';
import { Api, type Publicacion } from '@/lib/api';
import { Api, ApiError, type Publicacion } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useUsuario } from '@/lib/session';
import {
  emojiCategoria,
  mostrarError,
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
  solidario: '#E11D48',
  solidarioClaro: '#FFE4E6',
};

type TipoFavor = 'necesito' | 'ofrezco';

type Favor = {
  id: string;
  titulo: string;
  descripcion: string;
  persona: string;
  autorId: string;
  zona: string;
  tiempo: string;
  icono: string;
  tipo: TipoFavor;
};

const RESPUESTAS_RAPIDAS_AYUDA = [
  '¡Hola vecino! Yo te puedo ayudar hoy mismo 🤝',
  'Tengo la herramienta/recurso para prestarte sin costo 🛠️',
  'Estoy a un par de cuadras, paso en 15 minutos 🏃',
];

const RESPUESTAS_RAPIDAS_SOLICITAR = [
  '¡Hola vecino! Muchas gracias por ofrecerlo, me sería de gran ayuda 🙏',
  '¿Sigue disponible? Puedo acercarme a recogerlo hoy 📍',
];

const PLANTILLAS_FAVORES: Record<
  TipoFavor,
  { chip: string; titulo: string; detalle: string }[]
> = {
  necesito: [
    {
      chip: '🪜 Préstamo de escalera',
      titulo: 'Préstamo de escalera por 1 hora',
      detalle: 'Necesito cambiar un foco alto en mi patio hoy por la tarde.',
    },
    {
      chip: '🧰 Llave inglesa / taladro',
      titulo: 'Préstamo de llave inglesa para caño',
      detalle: 'Necesito ajustar una tuerca de agua en mi cocina, lo devuelvo enseguida.',
    },
    {
      chip: '🚗 Movilidad al seguro',
      titulo: 'Apoyo con movilidad hacia hospital',
      detalle: '¿Algún vecino sale temprano hacia el centro para llevar a mi mamá?',
    },
  ],
  ofrezco: [
    {
      chip: '🧰 Presto herramientas',
      titulo: 'Presto caja de herramientas básicas',
      detalle: 'Tengo taladro, martillo y llaves disponibles para vecinos de la cuadra.',
    },
    {
      chip: '📚 Apoyo escolar gratis',
      titulo: 'Ayuda con tareas de matemáticas',
      detalle: 'Puedo orientar a niños del barrio por las tardes sin costo.',
    },
    {
      chip: '🚗 Movilidad solidaria',
      titulo: 'Asiento libre hacia el centro 7:30 am',
      detalle: 'Salgo en auto todas las mañanas, puedo acercar a vecinos mayores.',
    },
  ],
};

const aFavor = (p: Publicacion): Favor => ({
  id: p.id,
  titulo: p.titulo,
  descripcion: p.descripcion,
  persona: p.autor.nombre_completo,
  autorId: p.autor.id,
  zona: p.zona?.nombre ?? 'Cercado',
  tiempo: tiempoRelativo(p.created_at),
  icono: emojiCategoria(p.categoria?.nombre ?? 'Apoyo'),
  tipo: p.direccion === 'SOLICITA' ? 'necesito' : 'ofrezco',
});

export default function Favores() {
  const { t } = useI18n();
  const usuario = useUsuario();

  const [pestana, setPestana] = useState<TipoFavor>('necesito');
  const [favores, setFavores] = useState<Favor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Modal de publicar favor
  const [modalVisible, setModalVisible] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [nombre, setNombre] = useState('');

  // Modal de "¡Oye, yo te puedo ayudar!" (detalle e interacción con el vecino)
  const [favorSeleccionado, setFavorSeleccionado] =
    useState<Favor | null>(null);
  const [mensajeAyuda, setMensajeAyuda] = useState('');
  const [enviandoAyuda, setEnviandoAyuda] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const lista = await Api.publicaciones({ tipo: 'FAVOR' });
      setFavores(lista.map(aFavor));
    } catch (e) {
      mostrarError(e, 'No se pudieron cargar los favores');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const [modalVisible, setModalVisible] =
    useState(false);

  const [titulo, setTitulo] = useState('');
  const [nombre, setNombre] = useState('');
  const [ubic, setUbic] = useState<UbicacionElegida | null>(null);

  const filtrados = favores.filter(
    (favor) => favor.tipo === pestana
  );

  const abrirModalAyudar = (favor: Favor) => {
    setFavorSeleccionado(favor);
    setMensajeAyuda(
      favor.tipo === 'necesito'
        ? RESPUESTAS_RAPIDAS_AYUDA[0]
        : RESPUESTAS_RAPIDAS_SOLICITAR[0]
    );
  };

  const enviarRespuestaSolidaria = async () => {
    if (!favorSeleccionado || enviandoAyuda) return;
    if (!mensajeAyuda.trim()) {
      Alert.alert(
        'Escribe un mensaje',
        'Indica al vecino cómo puedes ayudarle o coordinar.'
      );
      return;
    }

    setEnviandoAyuda(true);
    try {
      const telContacto = usuario?.telefono
        ? `\n📞 Mi teléfono: ${usuario.telefono}`
        : '';
      await Api.responder(
        favorSeleccionado.id,
        `${mensajeAyuda.trim()}${telContacto}`.slice(0, 500)
      );

      const vecino = favorSeleccionado.persona;
      setFavorSeleccionado(null);
      setMensajeAyuda('');

      Alert.alert(
        '¡Ayuda solidaria enviada! 🤝',
        `Le avisamos a ${vecino} que puedes ayudarle y compartimos tu mensaje para que se comuniquen.`
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        const vecino = favorSeleccionado.persona;
        setFavorSeleccionado(null);
        Alert.alert(
          'Respuesta guardada en Modo Offline',
          `Estás sin conexión. Puedes llamar directamente a ${vecino} con el botón de teléfono.`
        );
      } else {
        mostrarError(e, 'No se pudo enviar tu mensaje');
      }
    } finally {
      setEnviandoAyuda(false);
    }
  };

  const llamarVecinoFavor = async (favor: Favor) => {
    try {
      const perfil = await Api.usuario(favor.autorId);
      if (!perfil.telefono) {
        Alert.alert(
          'Sin teléfono público',
          'Envíale un mensaje con el botón "¡Yo te puedo ayudar!" para coordinar.'
        );
        return;
      }
      Linking.openURL(`tel:${perfil.telefono}`).catch(() => {
        Alert.alert('Teléfono del vecino', `Marca al ${perfil.telefono}`);
      });
    } catch (e) {
      mostrarError(e, 'No se pudo obtener el teléfono');
    }
  };

  const whatsappVecinoFavor = async (favor: Favor) => {
    try {
      const perfil = await Api.usuario(favor.autorId);
      const texto = encodeURIComponent(
        `¡Hola ${favor.persona}! Vi tu publicación "${favor.titulo}" en la Cadena de Favores de AquiPe y te puedo ayudar 🤝`
      );
      const numero = perfil.telefono
        ? perfil.telefono.replace(/\D/g, '')
        : '';
      const prefijo =
        numero.length === 9 ? `51${numero}` : numero;
      const url = prefijo
        ? `https://wa.me/${prefijo}?text=${texto}`
        : `https://wa.me/?text=${texto}`;
      await Linking.openURL(url);
    } catch {
      Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp.');
    }
  };

  const publicar = async () => {
    if (!titulo.trim()) {
      Alert.alert(
        'Campos incompletos',
        'Escribe el título del favor.'
      );
      return;
    }

    setEnviando(true);

    try {
      await Api.crearPublicacion({
        tipo: 'FAVOR',
        direccion:
          pestana === 'necesito' ? 'SOLICITA' : 'OFRECE',
        titulo: titulo.trim().slice(0, 80),
        descripcion: (nombre.trim() || titulo.trim()).slice(0, 1000),
        ...(ubic
          ? { zona_id: ubic.zonaId, latitud: ubic.latitude, longitud: ubic.longitude }
          : {}),
      });

      setTitulo('');
      setNombre('');
      setUbic(null);
      setModalVisible(false);
      await cargar();

      Alert.alert(
        '¡Favor publicado!',
        pestana === 'necesito'
          ? 'Tus vecinos ya pueden verlo y ofrecerte ayuda.'
          : 'Gracias por compartir tu apoyo solidario con el barrio.'
      );
    } catch (e) {
      mostrarError(e, 'No se pudo publicar el favor');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      {/* Decoraciones superiores */}
      <View
        style={styles.decoracionSuperior}
        pointerEvents="none"
      >
        <View style={styles.burbujaGrande} />
        <View style={styles.burbujaPequena} />
      </View>

      {/* Encabezado */}
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

        <Text style={styles.titulo}>
          {t.cadenaFavores}
        </Text>
      </View>

      {/* Pestañas */}
      <View style={styles.pestanas}>
        <Pressable
          style={[
            styles.pestana,
            pestana === 'necesito' && styles.pestanaActiva,
          ]}
          onPress={() => setPestana('necesito')}
          accessibilityRole="button"
          accessibilityState={{
            selected: pestana === 'necesito',
          }}
        >
          <Text
            style={[
              styles.textoPestana,
              pestana === 'necesito' && styles.textoActivo,
            ]}
          >
            Necesito ayuda
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.pestana,
            pestana === 'ofrezco' && styles.pestanaActiva,
          ]}
          onPress={() => setPestana('ofrezco')}
          accessibilityRole="button"
          accessibilityState={{
            selected: pestana === 'ofrezco',
          }}
        >
          <Text
            style={[
              styles.textoPestana,
              pestana === 'ofrezco' && styles.textoActivo,
            ]}
          >
            Puedo ayudar
          </Text>
        </Pressable>
      </View>

      {/* Lista de favores */}
      <ScrollView
        style={styles.scrollLista}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lista}
      >
        <View style={styles.encabezadoLista}>
          <View style={styles.titulosLista}>
            <Text style={styles.subtitulo}>
              {pestana === 'necesito'
                ? 'Vecinos que necesitan una mano'
                : 'Vecinos que ofrecen apoyo gratis'}
            </Text>

            <Text style={styles.descripcionLista}>
              Toca cualquier tarjeta para decir «¡Yo te ayudo!»
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
                name="people-outline"
                size={34}
                color={C.principal}
              />
            </View>

            <Text style={styles.vacioTitulo}>
              Todavía no hay publicaciones
            </Text>

            <Text style={styles.vacioTexto}>
              Sé el primero en publicar un favor
              para tu comunidad.
            </Text>
          </View>
        ) : (
          filtrados.map((favor) => (
            <Pressable
              key={favor.id}
              style={styles.tarjeta}
              onPress={() => abrirModalAyudar(favor)}
              accessibilityRole="button"
              accessibilityLabel={`${favor.titulo} de ${favor.persona}`}
            >
              <View style={styles.iconoContenedor}>
                <Text style={styles.iconoFavor}>
                  {favor.icono}
                </Text>
              </View>

              <View style={styles.informacion}>
                <Text
                  style={styles.nombreFavor}
                  numberOfLines={2}
                >
                  {favor.titulo}
                </Text>

                <Text
                  style={styles.descripcionFavor}
                  numberOfLines={1}
                >
                  {favor.descripcion}
                </Text>

                <View style={styles.metaFila}>
                  <Text style={styles.persona}>
                    {favor.persona} · {favor.zona}
                  </Text>

                  <View style={styles.tiempoContenedor}>
                    <Ionicons
                      name="time-outline"
                      size={11}
                      color={C.secundario}
                    />
                    <Text style={styles.tiempo}>
                      {favor.tiempo}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={styles.botonAyudarCard}
                onPress={() => abrirModalAyudar(favor)}
              >
                <Ionicons
                  name="hand-left-outline"
                  size={14}
                  color={C.blanco}
                />
                <Text style={styles.botonAyudarCardTxt}>
                  {favor.tipo === 'necesito'
                    ? '¡Yo ayudo!'
                    : 'Lo necesito'}
                </Text>
              </Pressable>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Botón flotante para publicar */}
      <Pressable
        style={styles.botonAgregar}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Publicar un favor"
      >
        <Ionicons
          name="add"
          size={24}
          color={C.blanco}
        />
        <Text style={styles.botonAgregarTxt}>
          {pestana === 'necesito' ? 'Pedir favor' : 'Ofrecer favor'}
        </Text>
      </Pressable>

      {/* Modal de «¡Oye, yo te puedo ayudar!» */}
      <Modal
        visible={favorSeleccionado !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setFavorSeleccionado(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <View style={styles.modalTitulos}>
                <Text style={styles.modalTitulo}>
                  {favorSeleccionado?.tipo === 'necesito'
                    ? '🤝 ¡Yo te puedo ayudar!'
                    : '💚 Solicitar apoyo solidario'}
                </Text>
                <Text style={styles.modalDescripcion}>
                  {favorSeleccionado?.persona} · Zona {favorSeleccionado?.zona}
                </Text>
              </View>

              <Pressable
                style={styles.botonCerrar}
                onPress={() => setFavorSeleccionado(null)}
              >
                <Ionicons name="close" size={21} color={C.secundario} />
              </Pressable>
            </View>

            {favorSeleccionado && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.resumenFavorBox}>
                  <Text style={styles.resumenFavorTitulo}>
                    {favorSeleccionado.icono} {favorSeleccionado.titulo}
                  </Text>
                  <Text style={styles.resumenFavorDesc}>
                    {favorSeleccionado.descripcion}
                  </Text>
                </View>

                <Text style={styles.label}>
                  ⚡ Respuesta rápida en 1 toque:
                </Text>

                <View style={styles.chipsAyudaCol}>
                  {(favorSeleccionado.tipo === 'necesito'
                    ? RESPUESTAS_RAPIDAS_AYUDA
                    : RESPUESTAS_RAPIDAS_SOLICITAR
                  ).map((frase) => {
                    const activa = mensajeAyuda === frase;
                    return (
                      <Pressable
                        key={frase}
                        style={[
                          styles.chipFrase,
                          activa && styles.chipFraseActiva,
                        ]}
                        onPress={() => setMensajeAyuda(frase)}
                      >
                        <Text
                          style={[
                            styles.chipFraseTxt,
                            activa && styles.chipFraseTxtActiva,
                          ]}
                        >
                          {frase}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>
                  Tu mensaje para {favorSeleccionado.persona}:
                </Text>

                <TextInput
                  style={[styles.input, { height: 74, paddingTop: 12 }]}
                  placeholder="Escribe cómo puedes ayudarle o a qué hora..."
                  placeholderTextColor={C.secundario}
                  value={mensajeAyuda}
                  onChangeText={setMensajeAyuda}
                  multiline
                  textAlignVertical="top"
                />

                <Pressable
                  style={styles.botonPublicar}
                  onPress={enviarRespuestaSolidaria}
                  disabled={enviandoAyuda}
                >
                  {enviandoAyuda ? (
                    <ActivityIndicator color={C.blanco} />
                  ) : (
                    <View style={styles.filaBotonCentro}>
                      <Ionicons
                        name="paper-plane-outline"
                        size={18}
                        color={C.blanco}
                      />
                      <Text style={styles.textoPublicar}>
                        {favorSeleccionado.tipo === 'necesito'
                          ? 'Enviar "¡Yo te ayudo!"'
                          : 'Enviar solicitud al vecino'}
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Contacto directo por llamada o WhatsApp */}
                <View style={styles.accionesDirectasRow}>
                  <Pressable
                    style={styles.botonDirecto}
                    onPress={() => llamarVecinoFavor(favorSeleccionado)}
                  >
                    <Ionicons name="call-outline" size={18} color={C.principal} />
                    <Text style={styles.botonDirectoTxt}>Llamar</Text>
                  </Pressable>

                  <Pressable
                    style={styles.botonDirecto}
                    onPress={() => whatsappVecinoFavor(favorSeleccionado)}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
                    <Text style={styles.botonDirectoTxt}>WhatsApp</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de publicación de favor (<= 3 clics con plantillas) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContenido}>
            <View style={styles.modalEncabezado}>
              <View style={styles.modalTitulos}>
                <Text style={styles.modalTitulo}>
                  {pestana === 'necesito'
                    ? 'Solicitar un favor al barrio'
                    : 'Ofrecer ayuda solidaria'}
                </Text>

                <Text style={styles.modalDescripcion}>
                  Economía solidaria entre vecinos sin dinero
                </Text>
              </View>

              <Pressable
                style={styles.botonCerrar}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar formulario"
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={C.secundario}
                />
              </Pressable>
            </View>

            {/* Plantillas en 1 toque */}
            <Text style={styles.plantillaLabel}>
              ⚡ Ideas rápidas en 1 toque:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.plantillasRow}
            >
              {PLANTILLAS_FAVORES[pestana].map((pl) => (
                <Pressable
                  key={pl.chip}
                  style={styles.plantillaChip}
                  onPress={() => {
                    setTitulo(pl.titulo);
                    setNombre(pl.detalle);
                  }}
                >
                  <Text style={styles.plantillaChipTxt}>
                    {pl.chip}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>
              {pestana === 'necesito'
                ? '¿Qué ayuda necesitas?'
                : '¿En qué puedes ayudar?'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ej. Préstamo de escalera por 1 hora"
              placeholderTextColor={C.secundario}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={styles.label}>
              Detalles (opcional)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Cuándo, dónde, qué necesitas exactamente…"
              placeholderTextColor={C.secundario}
              value={nombre}
              onChangeText={setNombre}
              maxLength={500}
            />

            <Text style={styles.label}>Ubicación (opcional)</Text>

            <SelectorUbicacion value={ubic} onChange={setUbic} />

            <Pressable
              style={styles.botonPublicar}
              onPress={publicar}
              disabled={enviando}
              accessibilityRole="button"
            >
              {enviando ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={styles.textoPublicar}>
                  Publicar favor
                </Text>
              )}
            </Pressable>
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

  pestanas: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: C.verdeClaro,
    padding: 5,
    borderRadius: 16,
    gap: 6,
    marginBottom: 18,
  },

  pestana: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blanco,
  },

  pestanaActiva: {
    backgroundColor: C.principal,
  },

  textoPestana: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
  },

  textoActivo: {
    color: C.blanco,
  },

  scrollLista: {
    flex: 1,
  },

  lista: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  encabezadoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },

  titulosLista: {
    flex: 1,
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

  iconoContenedor: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  iconoFavor: {
    fontSize: 22,
  },

  informacion: {
    flex: 1,
  },

  nombreFavor: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },

  descripcionFavor: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 2,
  },

  metaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 6,
  },

  persona: {
    fontSize: 11,
    fontWeight: '700',
    color: C.principal,
  },

  tiempoContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  tiempo: {
    fontSize: 11,
    color: C.secundario,
  },

  botonAyudarCard: {
    backgroundColor: C.principal,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 8,
  },

  botonAyudarCardTxt: {
    color: C.blanco,
    fontSize: 11,
    fontWeight: '800',
  },

  botonAgregar: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    paddingHorizontal: 18,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.principal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 6,
    shadowColor: C.principal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  botonAgregarTxt: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
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
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
    marginTop: 10,
    textAlign: 'center',
  },

  vacioTexto: {
    fontSize: 13,
    color: C.secundario,
    marginTop: 7,
    textAlign: 'center',
  },

  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(36,55,70,0.45)',
    justifyContent: 'flex-end',
  },

  modalContenido: {
    backgroundColor: C.blanco,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 34,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
  },

  modalEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  modalTitulos: {
    flex: 1,
  },

  modalTitulo: {
    fontSize: 20,
    fontWeight: '900',
    color: C.principal,
  },

  modalDescripcion: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 4,
  },

  botonCerrar: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  resumenFavorBox: {
    backgroundColor: C.verdeClaro,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.borde,
  },

  resumenFavorTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: C.texto,
  },

  resumenFavorDesc: {
    fontSize: 13,
    color: C.secundario,
    marginTop: 5,
    lineHeight: 19,
  },

  chipsAyudaCol: {
    gap: 7,
    marginBottom: 14,
  },

  chipFrase: {
    backgroundColor: C.fondo,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  chipFraseActiva: {
    backgroundColor: C.principal,
    borderColor: C.principal,
  },

  chipFraseTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: C.texto,
  },

  chipFraseTxtActiva: {
    color: C.blanco,
  },

  plantillaLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: C.principal,
    marginBottom: 8,
  },

  plantillasRow: {
    gap: 8,
    paddingBottom: 14,
  },

  plantillaChip: {
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },

  plantillaChipTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: C.principal,
  },

  label: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 14,
    color: C.texto,
  },

  botonPublicar: {
    backgroundColor: C.principal,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  filaBotonCentro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  textoPublicar: {
    fontSize: 15,
    fontWeight: '800',
    color: C.blanco,
  },

  accionesDirectasRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },

  botonDirecto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: C.fondo,
    borderWidth: 1,
    borderColor: C.borde,
    paddingVertical: 11,
    borderRadius: 14,
  },

  botonDirectoTxt: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
  },
});
