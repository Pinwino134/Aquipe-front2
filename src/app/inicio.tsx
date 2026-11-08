
import AccesosRapidos from '@/components/inicio/AccesosRapidos';
import BannerInicio from '@/components/inicio/BannerInicio';
import type { TabNavegacion } from '@/components/inicio/BarraNavegacion';
import BarraNavegacion from '@/components/inicio/BarraNavegacion';
import Coincidencias from '@/components/inicio/CoincidenciasCard';
import HeaderInicio from '@/components/inicio/HeaderInicio';
import MapaServicios from '@/components/inicio/MapaServicios';
import MisPublicaciones from '@/components/inicio/MisPublicaciones';
import type { TarjetaPublicacionProps } from '@/components/inicio/TarjetaPublicacion';
import TutorialModal from '@/components/inicio/TutorialModal';

import { Api, type Publicacion } from '@/lib/api';
import { useUsuario } from '@/lib/session';
import {
  COLOR_TIPO,
  obtenerUbicacion,
  textoPrecio,
} from '@/lib/ui';

import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
} from 'react-native';

import type { Region } from 'react-native-maps';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

// --------------------------------------------------
// CONFIGURACIÓN
// --------------------------------------------------

const C = {
  fondo: '#F6F7F3',
};

const REGION_INICIAL: Region = {
  latitude: -16.3989,
  longitude: -71.535,
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};

const ANCHO_PANTALLA = Dimensions.get('window').width;
const ANCHO_CONTENIDO = ANCHO_PANTALLA - 44;

const opciones = [
  {
    nombre: 'Servicios',
    icono: 'construct',
    color: '#168BE0',
    ruta: '/servicios',
  },
  {
    nombre: 'Favores',
    icono: 'heart',
    color: '#F05A7E',
    ruta: '/favores',
  },
  {
    nombre: 'Mapa',
    icono: 'location',
    color: '#18B69A',
    ruta: '/mapa',
  },
  {
    nombre: 'Emergencias',
    icono: 'warning',
    color: '#F28B30',
    ruta: '/emergencias',
  },
  {
    nombre: 'Actividad',
    icono: 'swap-horizontal',
    color: '#7A5AF0',
    ruta: '/actividad',
  },
] as const;
// --------------------------------------------------
// CONVERSIÓN DE PUBLICACIONES
// --------------------------------------------------

type TarjetaPublicacion = TarjetaPublicacionProps;

const aTarjeta = (p: Publicacion): TarjetaPublicacion => ({
  id: p.id,
  titulo: p.titulo,
  categoria: p.categoria?.nombre ?? p.tipo,
  descripcion: p.descripcion,
  precio: p.servicio
    ? textoPrecio(p)
    : p.direccion === 'OFRECE'
      ? 'Ofrezco'
      : 'Necesito',
  icono: `${p.categoria?.icono ?? 'grid'}-outline` as TarjetaPublicacion['icono'],
  color: COLOR_TIPO[p.tipo],
});

// --------------------------------------------------
// PANTALLA PRINCIPAL
// --------------------------------------------------

export default function Inicio() {
  const usuario = useUsuario();

  const mapaRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(REGION_INICIAL);
  const [ubicacionPermitida, setUbicacionPermitida] = useState(false);

  const [busqueda, setBusqueda] = useState('');

  const [crearVisible, setCrearVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] =
    useState(false);

  const [publicacionActual, setPublicacionActual] =
    useState(0);

  const nombreUsuario =
    usuario?.nombre_completo.trim().split(' ')[0] ||
    'visitante';
  const [tutorialVisible, setTutorialVisible] = useState(false);

  const [publicacionesUsuario, setPublicacionesUsuario] =
    useState<TarjetaPublicacion[]>([]);

  const [serviciosCercanos, setServiciosCercanos] =
    useState<Publicacion[]>([]);

  const nombreUsuario =
    usuario?.nombre_completo.trim().split(' ')[0] || 'visitante';

  // --------------------------------------------------
  // CARGAR DATOS AL VOLVER A INICIO
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      const cargarDatos = async () => {
        try {
          const mias = await Api.misPublicaciones();

          if (activo) {
            setPublicacionesUsuario(mias.map(aTarjeta));
          }
        } catch {
          // Se mantiene la lista anterior.
        }

        try {
          const pos = await obtenerUbicacion();

          const cerca = await Api.publicaciones({
            tipo: 'SERVICIO',
            direccion: 'OFRECE',
            lat: pos.latitude,
            lng: pos.longitude,
            radio_km: 15,
            limit: 30,
          });

          if (activo) {
            setServiciosCercanos(cerca);
          }
        } catch {
          // Sin conexión, el mapa queda sin marcadores.
        }
      };

      cargarDatos();

      return () => {
        activo = false;
      };
    }, [])
  );

  // --------------------------------------------------
  // OBTENER UBICACIÓN INICIAL
  // --------------------------------------------------

  useEffect(() => {
    let activo = true;

    const cargarUbicacion = async () => {
      try {
        const permiso =
          await Location.requestForegroundPermissionsAsync();

        if (permiso.status !== 'granted') {
          return;
        }

        const posicion =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        if (!activo) {
          return;
        }

        const nuevaRegion: Region = {
          latitude: posicion.coords.latitude,
          longitude: posicion.coords.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        };

        setRegion(nuevaRegion);
        setUbicacionPermitida(true);

        mapaRef.current?.animateToRegion(nuevaRegion, 700);
      } catch {
        if (activo) {
          setUbicacionPermitida(false);
        }
      }
    };

    cargarUbicacion();

    return () => {
      activo = false;
    };
  }, []);

  // --------------------------------------------------
  // ACCIONES DEL ENCABEZADO
  // --------------------------------------------------

  const abrirNotificaciones = () => {
    Alert.alert(
      'Notificaciones',
      'Todavía no tienes notificaciones.'
    );
  };

  const abrirSoporte = () => {
    Alert.alert(
      'Soporte AquiPe',
      'Próximamente podrás contactar con nuestro equipo de ayuda.'
    );
  };

  const abrirWhatsApp = async () => {
    try {
      await Linking.openURL(
        'https://wa.me/?text=Hola%2C%20necesito%20ayuda%20con%20AquiPe'
      );
    } catch {
      Alert.alert(
        'WhatsApp',
        'No se pudo abrir WhatsApp.'
      );
    }
  };

  // --------------------------------------------------
  // NAVEGACIÓN INFERIOR
  // --------------------------------------------------

  const seleccionarTab = (nombreTab: TabNavegacion) => {
    if (nombreTab === 'Inicio') {
      return;
    }

    if (nombreTab === 'Perfil') {
      router.push('/perfil');
      return;
    }

    if (nombreTab === 'Publicar') {
      setCrearVisible(true);
      return;
    }

    if (nombreTab === 'Tutorial') {
      setTutorialVisible(true);
      return;
    }
  };

  // --------------------------------------------------
  // CENTRAR MAPA EN UBICACIÓN ACTUAL
  // --------------------------------------------------

  const centrarUbicacion = async () => {
    try {
      const permiso =
        await Location.getForegroundPermissionsAsync();

      if (permiso.status !== 'granted') {
        const nuevoPermiso =
          await Location.requestForegroundPermissionsAsync();

        if (nuevoPermiso.status !== 'granted') {
          Alert.alert(
            'Ubicación',
            'Activa el permiso de ubicación para centrar el mapa.'
          );
          return;
        }
      }

      const posicion =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

      const nuevaRegion: Region = {
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };

      setRegion(nuevaRegion);
      setUbicacionPermitida(true);

      mapaRef.current?.animateToRegion(nuevaRegion, 700);
    } catch {
      Alert.alert(
        'Ubicación',
        'No se pudo obtener tu ubicación actual.'
      );
    }
  };

  // --------------------------------------------------
  // VISTA
  // --------------------------------------------------

  return (
    <SafeAreaView style={s.page}>

      <HeaderInicio
        nombreUsuario={nombreUsuario}
        busqueda={busqueda}
        onChangeBusqueda={setBusqueda}
        onBuscar={() => {
          router.push({
            pathname: '/servicios',
            params: { q: busqueda.trim() },
          });
        }}
        onNotificaciones={abrirNotificaciones}
        onSoporte={abrirSoporte}
        onWhatsApp={abrirWhatsApp}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <AccesosRapidos
          onSeleccionar={(ruta) => router.push(ruta)}
        />

        <MisPublicaciones
          publicaciones={publicacionesUsuario}
        />

        <Coincidencias />

        <MapaServicios
          mapaRef={mapaRef}
          region={region}
          ubicacionPermitida={ubicacionPermitida}
          serviciosCercanos={serviciosCercanos}
          onCentrarUbicacion={centrarUbicacion}
        />

        <BannerInicio />

      </ScrollView>

      {/* BARRA DE NAVEGACIÓN INFERIOR */}
      <View style={s.navContainer}>
        <View style={s.nav}>
          {tabs.map((tab) => {
            const activa =
              tab.nombre === 'Inicio';

            return (
              <Pressable
                key={tab.nombre}
                style={[
                  s.navItem,
                  activa && s.navItemActive,
                ]}
                onPress={() =>
                  seleccionarTab(tab.nombre)
                }
                accessibilityRole="button"
                accessibilityLabel={tab.nombre}
                accessibilityState={{
                  selected: activa,
                }}
              >
                <Ionicons
                  name={tab.icono}
                  size={24}
                  color={
                    activa
                      ? C.blanco
                      : C.secundario
                  }
                />

                {activa && (
                  <Text style={s.navActiveText}>
                    {tab.nombre}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* TUTORIAL */}
      <Modal
        visible={crearVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCrearVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setCrearVisible(false)}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              paddingBottom: 34,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#243746' }}>
              ¿Qué quieres publicar?
            </Text>
            {[
              {
                t: 'Crear servicio',
                d: 'Ofrece tu trabajo con precio o busca un profesional',
                i: 'construct' as const,
                c: '#168BE0',
                r: '/crear-servicio' as const,
              },
              {
                t: 'Crear solicitud',
                d: 'Pide ayuda a tus vecinos (herramientas, apoyo, donaciones)',
                i: 'hand-left' as const,
                c: '#F05A7E',
                r: '/publicar' as const,
              },
            ].map((o) => (
              <Pressable
                key={o.t}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#DFE7E2',
                }}
                onPress={() => {
                  setCrearVisible(false);
                  router.push(o.r);
                }}
                accessibilityRole="button"
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: o.c + '22',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={o.i} size={24} color={o.c} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#243746' }}>{o.t}</Text>
                  <Text style={{ fontSize: 13, color: '#526A67' }}>{o.d}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#526A67" />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
      <BarraNavegacion
        onSeleccionar={seleccionarTab}
      />

      <TutorialModal
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
      />

    </SafeAreaView>
  );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 35,
  },
});
