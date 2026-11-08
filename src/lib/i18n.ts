import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type Idioma = 'es' | 'qu' | 'en';

const CLAVE_IDIOMA = '@aquipe/idioma_v1';

export const IDIOMAS: { codigo: Idioma; etiqueta: string; nombre: string }[] = [
  { codigo: 'es', etiqueta: 'ES', nombre: 'Español' },
  { codigo: 'qu', etiqueta: 'QU', nombre: 'Runasimi (Quechua)' },
  { codigo: 'en', etiqueta: 'EN', nombre: 'English' },
];

const TEXTOS = {
  es: {
    saludo: 'Hola',
    buscarServicio: '¿Qué servicio necesitas?',
    servicios: 'Servicios',
    favores: 'Favores',
    mapa: 'Mapa',
    emergencias: 'Emergencias',
    inicio: 'Inicio',
    publicar: 'Publicar',
    tutorial: 'Tutorial',
    perfil: 'Perfil',
    modoOfflineActivo: 'Modo Sin Conexión activo · Datos locales y SOS SMS listos',
    modoOnline: 'Conectado a la red vecinal',
    sincronizarAhora: 'Sincronizar',
    serviciosBarrio: 'Servicios de mi barrio',
    profesionalesCerca: 'Profesionales cerca de ti',
    encuentraAyuda: 'Avalados con Visto Bueno Vecinal',
    vistoBueno: 'Visto Bueno Vecinal',
    calificar: 'Calificar',
    llamar: 'Llamar',
    modoEmergencia: 'Modo Emergencia',
    ayudaComunitaria: 'Ayuda comunitaria y SOS',
    subtituloEmergencia: 'Solicita apoyo, envía alerta SOS con o sin internet y comparte recursos.',
    necesitoAyuda: 'NECESITO AYUDA',
    presionaSOS: 'Elige el tipo de emergencia y presiona SOS (funciona con y sin internet).',
    tipoRobo: 'Robo / Seguridad',
    tipoHospital: 'Salud / Hospital',
    tipoSismo: 'Sismo / Desastre',
    enviarSMSOffline: 'Enviar SMS con GPS (Sin Internet)',
    llamarEmergencia: 'Llamada directa de emergencia',
    cadenaFavores: 'Cadena de favores',
  },
  qu: {
    saludo: 'Allillanchu',
    buscarServicio: '¿Ima yanapaytataq maskhachkanki?',
    servicios: 'Llamk’aykuna',
    favores: 'Ayni Yanapay',
    mapa: 'Suyu Mapa',
    emergencias: 'Sasachakuy SOS',
    inicio: 'Qallariy',
    publicar: 'Willakuy',
    tutorial: 'Yachachiy',
    perfil: 'Noqamanta',
    modoOfflineActivo: 'Mana Internetwan · Ayllu willakuykuna waqaychasqa (SOS SMS)',
    modoOnline: 'Ayllu llikawan t’inkisqa',
    sincronizarAhora: 'Kunallan tinkiy',
    serviciosBarrio: 'Aylluypi llamk’aykuna',
    profesionalesCerca: 'Qayllaykipi llamk’aqkuna',
    encuentraAyuda: 'Ayllup allin qhawarisqan (Visto Bueno)',
    vistoBueno: 'Ayllup Allin Nisqan',
    calificar: 'Chaninchay',
    llamar: 'Waqyay',
    modoEmergencia: 'Sasachakuy Pacha (SOS)',
    ayudaComunitaria: 'Ayllu Yanapanakuy',
    subtituloEmergencia: 'Yanapayta mañakuy utaq SOS willakuyta apachiy mana internetwanpas.',
    necesitoAyuda: 'YANAPAYTAawan',
    presionaSOS: 'Sasachakuyta akllay hinaspa SOS ñit’iy (internetwan utaq mana internetwan).',
    tipoRobo: 'Suwakuy / Waqaychay',
    tipoHospital: 'Qhali kay /ampina wasi',
    tipoSismo: 'Pacha kuyuy /Llakiy',
    enviarSMSOffline: 'SMS GPS nisqawan apachiy (Mana Internetwan)',
    llamarEmergencia: 'Utqaylla waqyay',
    cadenaFavores: 'Ayni yanapanakuy',
  },
  en: {
    saludo: 'Hello',
    buscarServicio: 'What local service do you need?',
    servicios: 'Services',
    favores: 'Favors',
    mapa: 'Map',
    emergencias: 'Emergency',
    inicio: 'Home',
    publicar: 'Post',
    tutorial: 'Guide',
    perfil: 'Profile',
    modoOfflineActivo: 'Offline Mode active · Local cache & SMS SOS ready',
    modoOnline: 'Connected to neighbor network',
    sincronizarAhora: 'Sync now',
    serviciosBarrio: 'Neighborhood Services',
    profesionalesCerca: 'Professionals near you',
    encuentraAyuda: 'Endorsed by Neighbor Approval',
    vistoBueno: 'Neighbor Approved',
    calificar: 'Rate / Endorse',
    llamar: 'Call',
    modoEmergencia: 'Emergency Mode',
    ayudaComunitaria: 'Community Aid & SOS',
    subtituloEmergencia: 'Request help, trigger offline-ready SOS alerts, and share critical resources.',
    necesitoAyuda: 'I NEED HELP',
    presionaSOS: 'Select the emergency type and press SOS (works online & offline).',
    tipoRobo: 'Robbery / Safety',
    tipoHospital: 'Medical / Hospital',
    tipoSismo: 'Earthquake / Disaster',
    enviarSMSOffline: 'Send GPS SMS (Works Offline)',
    llamarEmergencia: 'Direct Emergency Call',
    cadenaFavores: 'Pay It Forward',
  },
};

export type ClaveTexto = keyof (typeof TEXTOS)['es'];

let idiomaActual: Idioma = 'es';
const oyentes = new Set<() => void>();

AsyncStorage.getItem(CLAVE_IDIOMA)
  .then((guardado) => {
    if (guardado === 'es' || guardado === 'qu' || guardado === 'en') {
      idiomaActual = guardado;
      oyentes.forEach((fn) => fn());
    }
  })
  .catch(() => {});

export const getIdioma = (): Idioma => idiomaActual;

export function setIdioma(nuevo: Idioma) {
  idiomaActual = nuevo;
  oyentes.forEach((fn) => fn());
  AsyncStorage.setItem(CLAVE_IDIOMA, nuevo).catch(() => {});
}

export function ciclarIdioma(): Idioma {
  const orden: Idioma[] = ['es', 'qu', 'en'];
  const sig = orden[(orden.indexOf(idiomaActual) + 1) % orden.length];
  setIdioma(sig);
  return sig;
}

const suscribir = (fn: () => void) => {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
};

export function useI18n() {
  const idioma = useSyncExternalStore(suscribir, getIdioma, getIdioma);
  const t = TEXTOS[idioma];
  return {
    idioma,
    setIdioma,
    ciclarIdioma,
    t,
  };
}
