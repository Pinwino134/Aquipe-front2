import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

const C = {
  principal: '#146C67',
  fondo: '#F6F7F3',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
  naranja: '#E95000',
};

type PasoTutorial = {
  id: string;
  seccion: string;
  titulo: string;
  descripcion: string;
  consejos: readonly [string, string];
  imagen: ImageSourcePropType;
  ancho: number;
  alto: number;
  icono: keyof typeof Ionicons.glyphMap;
  advertencia?: string;
};

// Capturas REALES facilitadas por el usuario. No son interfaces recreadas.
// Los textos describen exclusivamente los controles visibles en ellas.
const PASOS: PasoTutorial[] = [
  {
    id: 'inicio',
    seccion: 'INICIO',
    titulo: 'Bienvenido a tu comunidad',
    descripcion:
      'En la parte superior de AquiPe encuentras el buscador, el idioma, las notificaciones y el estado de conexión. Desde aquí comienza tu recorrido por el barrio.',
    consejos: [
      'Escribe el oficio o servicio que necesitas en la barra de búsqueda.',
      'Si aparece el aviso naranja de modo sin conexión, revisa el estado y utiliza «Sincronizar» cuando dispongas de internet.',
    ],
    imagen: require('../../../assets/images/tutorial/01_inicio_cabecera.png'),
    ancho: 362,
    alto: 151,
    icono: 'home-outline',
  },
  {
    id: 'accesos',
    seccion: 'INICIO',
    titulo: 'Todo a un toque de distancia',
    descripcion:
      'Estos cuatro accesos te llevan directamente a las funciones principales de AquiPe. Cada uno está pensado para una necesidad distinta.',
    consejos: [
      'En «Servicios» encuentras profesionales; en «Favores» puedes pedir u ofrecer ayuda.',
      'Usa «Mapa» para explorar tu zona y «Emergencias» para acceder a las opciones de asistencia urgente.',
    ],
    imagen: require('../../../assets/images/tutorial/02_accesos_rapidos.png'),
    ancho: 349,
    alto: 95,
    icono: 'apps-outline',
  },
  {
    id: 'cerca',
    seccion: 'DESCUBRE',
    titulo: 'Descubre servicios cerca de ti',
    descripcion:
      'En Inicio también verás un mapa con los servicios publicados alrededor de tu ubicación. Así puedes conocer las opciones de tu comunidad de un vistazo.',
    consejos: [
      'Observa los marcadores del mapa para ubicar servicios en tu zona.',
      'Toca «Explorar servicios cercanos» para continuar buscando profesionales.',
    ],
    imagen: require('../../../assets/images/tutorial/03_servicios_cerca.png'),
    ancho: 356,
    alto: 328,
    icono: 'location-outline',
  },
  {
    id: 'servicios',
    seccion: 'SERVICIOS',
    titulo: 'Encuentra profesionales de tu barrio',
    descripcion:
      'Busca un oficio, un vecino o un servicio específico. También puedes filtrar por categorías como Hogar, Educación o Tecnología.',
    consejos: [
      'Consulta la calificación, las opiniones, la distancia y el distintivo «Visto Bueno Vecinal» que aparece en las fichas.',
      'Usa el botón de teléfono para contactar o «Calificar» para valorar el servicio.',
    ],
    imagen: require('../../../assets/images/tutorial/04_servicios_barrio.png'),
    ancho: 357,
    alto: 755,
    icono: 'construct-outline',
  },
  {
    id: 'favores',
    seccion: 'FAVORES',
    titulo: 'Una comunidad que se ayuda',
    descripcion:
      'La «Cadena de favores» conecta a vecinos que necesitan una mano con quienes desean colaborar. Puedes participar desde cualquiera de los dos lados.',
    consejos: [
      'En «Necesito ayuda» revisa las solicitudes y toca «¡Yo ayudo!» si puedes colaborar.',
      'Cambia a «Puedo ayudar» o utiliza «Pedir favor» para publicar una solicitud de ayuda.',
    ],
    imagen: require('../../../assets/images/tutorial/05_cadena_favores.png'),
    ancho: 349,
    alto: 751,
    icono: 'heart-outline',
  },
  {
    id: 'mapa',
    seccion: 'MAPA',
    titulo: 'Explora tu mapa comunitario',
    descripcion:
      'El mapa muestra puntos de interés cercanos y permite distinguir distintos tipos de información comunitaria.',
    consejos: [
      'Usa los botones «+» y «−» para acercarte o alejarte del mapa.',
      'Selecciona «Servicios», «Favores» o «Recursos» en la parte inferior para explorar cada categoría.',
    ],
    imagen: require('../../../assets/images/tutorial/06_mapa_comunitario.png'),
    ancho: 357,
    alto: 714,
    icono: 'map-outline',
  },
  {
    id: 'sos',
    seccion: 'EMERGENCIAS',
    titulo: 'Conoce el botón SOS',
    descripcion:
      'En «Modo Emergencia» puedes seleccionar el tipo de situación: Robo / Seguridad, Salud / Hospital o Sismo / Desastre. La pantalla también muestra números de atención rápida.',
    consejos: [
      'Selecciona la categoría adecuada antes de pulsar el botón rojo «SOS».',
      'Revisa «Configurar» para establecer un contacto de confianza para SMS sin internet, si vas a utilizar esa opción.',
    ],
    imagen: require('../../../assets/images/tutorial/07_emergencia_sos.png'),
    ancho: 355,
    alto: 566,
    icono: 'shield-checkmark-outline',
    advertencia:
      'Importante: utiliza SOS únicamente ante una emergencia real. Ver este tutorial no activa ninguna alerta.',
  },
  {
    id: 'apoyo',
    seccion: 'COMUNIDAD',
    titulo: 'Más formas de apoyar a tus vecinos',
    descripcion:
      'Además de las alertas, AquiPe presenta opciones para solicitar ayuda, compartir recursos y consultar información útil de la comunidad.',
    consejos: [
      'Toca «Solicitar ayuda» o «Ofrecer recurso» según lo que necesites hacer.',
      'Consulta «Recursos y puntos de apoyo» y «Reportes y alertas SOS de la zona» para conocer la información disponible.',
    ],
    imagen: require('../../../assets/images/tutorial/08_apoyo_comunitario.png'),
    ancho: 350,
    alto: 394,
    icono: 'people-outline',
  },
];

export default function TutorialModal({ visible, onClose }: TutorialModalProps) {
  const [indice, setIndice] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const { width, height } = useWindowDimensions();
  const actual = PASOS[indice];
  const ultimo = indice === PASOS.length - 1;
  const anchoImagen = Math.min(width - 48, 440);
  // Vista previa acotada para que el texto y los controles sean fáciles de encontrar.
  // La captura original completa se ve al tocarla.
  const altoImagen = Math.min(anchoImagen * (actual.alto / actual.ancho), height * 0.43, 410);
  const anchoAmpliado = width - 24;

  useEffect(() => {
    if (visible) {
      setIndice(0);
      setAmpliada(false);
    }
  }, [visible]);

  const cambiarPaso = (nuevoIndice: number) => {
    setIndice(nuevoIndice);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (ampliada) setAmpliada(false);
        else onClose();
      }}
    >
      <SafeAreaView style={s.pantalla} edges={['top', 'bottom']}>
        {ampliada ? (
          <>
            <View style={s.barraSuperior}>
              <View style={s.cabeceraTexto}>
                <Text style={s.cabeceraTitulo}>Captura real de AquiPe</Text>
                <Text style={s.cabeceraSub}>Desliza para ver toda la imagen</Text>
              </View>
              <Pressable
                style={s.cerrar}
                onPress={() => setAmpliada(false)}
                accessibilityRole="button"
                accessibilityLabel="Volver al tutorial"
              >
                <Ionicons name="close" size={23} color={C.principal} />
              </Pressable>
            </View>
            <ScrollView
              style={s.ampliacionScroll}
              contentContainerStyle={s.ampliacionContenido}
              showsVerticalScrollIndicator
            >
              <Image
                source={actual.imagen}
                resizeMode="contain"
                style={{ width: anchoAmpliado, height: anchoAmpliado * actual.alto / actual.ancho }}
                accessibilityLabel={`Captura ampliada de ${actual.seccion.toLowerCase()}`}
              />
            </ScrollView>
          </>
        ) : (
          <>
            <View style={s.barraSuperior}>
              <View style={s.iconoCabecera}>
                <Ionicons name="book-outline" size={22} color={C.principal} />
              </View>
              <View style={s.cabeceraTexto}>
                <Text style={s.cabeceraTitulo}>Aprende a usar AquiPe</Text>
                <Text style={s.cabeceraSub}>Paso {indice + 1} de {PASOS.length}</Text>
              </View>
              <Pressable
                style={s.cerrar}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar tutorial"
              >
                <Ionicons name="close" size={23} color={C.principal} />
              </Pressable>
            </View>

            <View style={s.barraProgreso} accessibilityLabel={`Progreso: ${indice + 1} de ${PASOS.length}`}>
              {PASOS.map((paso, i) => (
                <View key={paso.id} style={[s.progreso, i <= indice && s.progresoActivo]} />
              ))}
            </View>

            <ScrollView
              key={actual.id}
              style={s.contenido}
              contentContainerStyle={s.contenidoInterior}
              showsVerticalScrollIndicator
            >
              <View style={s.etiqueta}>
                <Ionicons name={actual.icono} size={15} color={C.principal} />
                <Text style={s.etiquetaTexto}>{actual.seccion}</Text>
              </View>
              <Text style={s.titulo}>{actual.titulo}</Text>
              <Text style={s.descripcion}>{actual.descripcion}</Text>

              <Pressable
                onPress={() => setAmpliada(true)}
                style={s.marcoImagen}
                accessibilityRole="button"
                accessibilityLabel={`Ampliar captura de ${actual.seccion.toLowerCase()}`}
              >
                <Image
                  source={actual.imagen}
                  style={{ width: anchoImagen, height: altoImagen }}
                  resizeMode="contain"
                />
              </Pressable>
              <View style={s.notaImagen}>
                <Ionicons name="expand-outline" size={15} color={C.principal} />
                <Text style={s.notaImagenTexto}>Captura real · Toca para ampliar y desliza para explorarla</Text>
              </View>

              <View style={s.instrucciones}>
                <Text style={s.instruccionesTitulo}>¿Qué puedes hacer aquí?</Text>
                {actual.consejos.map((consejo, i) => (
                  <View style={s.instruccion} key={`${actual.id}-${i}`}>
                    <View style={s.numero}>
                      <Text style={s.numeroTexto}>{i + 1}</Text>
                    </View>
                    <Text style={s.instruccionTexto}>{consejo}</Text>
                  </View>
                ))}
              </View>
              {actual.advertencia ? (
                <View style={s.advertencia}>
                  <Ionicons name="alert-circle-outline" size={19} color={C.naranja} />
                  <Text style={s.advertenciaTexto}>{actual.advertencia}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={s.pie}>
              <Pressable
                style={s.botonAnterior}
                onPress={() => indice === 0 ? onClose() : cambiarPaso(indice - 1)}
                accessibilityRole="button"
                accessibilityLabel={indice === 0 ? 'Omitir tutorial' : 'Paso anterior'}
              >
                <Ionicons
                  name={indice === 0 ? 'close-outline' : 'arrow-back-outline'}
                  size={18}
                  color={C.principal}
                />
                <Text style={s.textoAnterior}>{indice === 0 ? 'Omitir' : 'Anterior'}</Text>
              </Pressable>
              <Pressable
                style={s.botonSiguiente}
                onPress={() => ultimo ? onClose() : cambiarPaso(indice + 1)}
                accessibilityRole="button"
                accessibilityLabel={ultimo ? 'Finalizar tutorial' : 'Siguiente paso'}
              >
                <Text style={s.textoSiguiente}>{ultimo ? 'Finalizar' : 'Siguiente'}</Text>
                <Ionicons name={ultimo ? 'checkmark' : 'arrow-forward'} size={19} color={C.blanco} />
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo },
  barraSuperior: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
  },
  iconoCabecera: {
    width: 43, height: 43, borderRadius: 14, backgroundColor: C.verdeClaro,
    justifyContent: 'center', alignItems: 'center',
  },
  cabeceraTexto: { flex: 1 },
  cabeceraTitulo: { fontSize: 17, fontWeight: '900', color: C.texto },
  cabeceraSub: { fontSize: 12, fontWeight: '600', color: C.secundario, marginTop: 3 },
  cerrar: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: C.verdeClaro,
    alignItems: 'center', justifyContent: 'center',
  },
  barraProgreso: { flexDirection: 'row', gap: 5, paddingHorizontal: 20, paddingBottom: 12 },
  progreso: { flex: 1, height: 5, borderRadius: 4, backgroundColor: C.borde },
  progresoActivo: { backgroundColor: C.principal },
  contenido: { flex: 1 },
  contenidoInterior: { paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center' },
  etiqueta: {
    alignSelf: 'flex-start', flexDirection: 'row', gap: 7, alignItems: 'center',
    backgroundColor: C.verdeClaro, borderRadius: 18,
    paddingVertical: 7, paddingHorizontal: 12, marginTop: 7,
  },
  etiquetaTexto: { color: C.principal, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  titulo: {
    alignSelf: 'stretch', fontSize: 24, lineHeight: 29, fontWeight: '900',
    color: C.texto, marginTop: 14, marginBottom: 9,
  },
  descripcion: {
    alignSelf: 'stretch', fontSize: 14, lineHeight: 21,
    color: C.secundario, marginBottom: 16,
  },
  marcoImagen: {
    alignItems: 'center', justifyContent: 'center',
    width: '100%', borderRadius: 17, overflow: 'hidden',
    backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde,
  },
  notaImagen: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 9, marginBottom: 17, paddingHorizontal: 4,
  },
  notaImagenTexto: { color: C.secundario, fontSize: 11, fontWeight: '600', flexShrink: 1 },
  instrucciones: {
    alignSelf: 'stretch', backgroundColor: C.verdeClaro,
    padding: 16, borderRadius: 17, gap: 12,
  },
  instruccionesTitulo: { fontSize: 15, fontWeight: '900', color: C.principal },
  instruccion: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  numero: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: C.principal,
    alignItems: 'center', justifyContent: 'center',
  },
  numeroTexto: { color: C.blanco, fontSize: 12, fontWeight: '900' },
  instruccionTexto: { flex: 1, color: C.texto, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  advertencia: {
    alignSelf: 'stretch', flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FFF1E9', borderColor: '#FFD2BC', borderWidth: 1,
    borderRadius: 13, padding: 12, marginTop: 14,
  },
  advertenciaTexto: { flex: 1, color: '#88400F', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  pie: {
    flexDirection: 'row', gap: 11, paddingHorizontal: 20, paddingTop: 13,
    paddingBottom: 12, borderTopWidth: 1, borderTopColor: C.borde,
    backgroundColor: C.blanco,
  },
  botonAnterior: {
    flex: 1, height: 48, flexDirection: 'row', gap: 6,
    borderWidth: 1, borderColor: C.borde, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  textoAnterior: { color: C.principal, fontWeight: '800', fontSize: 14 },
  botonSiguiente: {
    flex: 1.4, height: 48, flexDirection: 'row', gap: 8,
    backgroundColor: C.principal, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  textoSiguiente: { color: C.blanco, fontWeight: '900', fontSize: 14 },
  ampliacionScroll: { flex: 1 },
  ampliacionContenido: { alignItems: 'center', paddingTop: 10, paddingBottom: 35 },
});
