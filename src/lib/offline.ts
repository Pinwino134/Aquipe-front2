import AsyncStorage from '@react-native-async-storage/async-storage';

/** Almacenamiento local (no requiere sesión ni red) para el modo emergencia. */
export type Contacto = { id: string; nombre: string; telefono: string };
export type PuestoGuardado = {
  id: string;
  titulo: string;
  detalle: string;
  zona: string;
  tipo: 'ofrecer' | 'solicitar';
  latitude: number;
  longitude: number;
};

const K = {
  contactos: 'aquipe.offline.contactos',
  medicos: 'aquipe.offline.medicos',
  puestos: 'aquipe.offline.puestos',
};

async function leer<T>(clave: string, defecto: T): Promise<T> {
  try {
    const crudo = await AsyncStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : defecto;
  } catch {
    return defecto;
  }
}

const escribir = (clave: string, valor: unknown) =>
  AsyncStorage.setItem(clave, JSON.stringify(valor)).catch(() => {});

export const leerContactos = () => leer<Contacto[]>(K.contactos, []);
export const guardarContactos = (c: Contacto[]) => escribir(K.contactos, c);
export const leerMedicos = () => leer<string>(K.medicos, '');
export const guardarMedicos = (t: string) => escribir(K.medicos, t);
export const leerPuestos = () => leer<PuestoGuardado[]>(K.puestos, []);
export const guardarPuestos = (p: PuestoGuardado[]) => escribir(K.puestos, p);
import { useSyncExternalStore } from 'react';

import type { Categoria, NuevaPublicacion, Publicacion, Resena, Zona } from './api';

const PREFIJO_CACHE = '@aquipe/cache/v1:';
const CLAVE_COLA_PUBS = '@aquipe/cola_publicaciones_v1';
const CLAVE_RESENAS_LOCALES = '@aquipe/resenas_locales_v1';

let sinConexionDetectada = false;
let modoOfflineSimulado = false;
const oyentes = new Set<() => void>();

const notificar = () => {
  oyentes.forEach((fn) => fn());
};

export const isOfflineActivo = () => sinConexionDetectada || modoOfflineSimulado;
export const isOfflineSimulado = () => modoOfflineSimulado;

export function reportarEstadoRed(conectado: boolean) {
  const nuevo = !conectado;
  if (sinConexionDetectada !== nuevo) {
    sinConexionDetectada = nuevo;
    notificar();
  }
}

export function alternarModoOfflineSimulado(forzar?: boolean): boolean {
  modoOfflineSimulado = forzar !== undefined ? forzar : !modoOfflineSimulado;
  notificar();
  return modoOfflineSimulado;
}

const suscribir = (fn: () => void) => {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
};

export function useEstadoOffline() {
  const offline = useSyncExternalStore(suscribir, isOfflineActivo, isOfflineActivo);
  const simulado = useSyncExternalStore(suscribir, isOfflineSimulado, isOfflineSimulado);
  return {
    offline,
    simulado,
    alternarSimulacion: alternarModoOfflineSimulado,
  };
}

/* ------------------------------------------------------------------ */
/* Caché de lectura en AsyncStorage                                    */
/* ------------------------------------------------------------------ */
export async function guardarCache<T>(clave: string, datos: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIJO_CACHE}${clave}`, JSON.stringify(datos));
  } catch {
    /* ignorar error de cuota */
  }
}

export async function leerCache<T>(clave: string): Promise<T | null> {
  try {
    const crudo = await AsyncStorage.getItem(`${PREFIJO_CACHE}${clave}`);
    if (!crudo) return null;
    return JSON.parse(crudo) as T;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Cola de publicaciones creadas sin internet (Store & Forward)        */
/* ------------------------------------------------------------------ */
export type PublicacionEnCola = {
  idTemporal: string;
  creadaEn: string;
  datos: NuevaPublicacion;
  publicacionVista: Publicacion;
};

export async function obtenerColaPublicaciones(): Promise<PublicacionEnCola[]> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_COLA_PUBS);
    if (!crudo) return [];
    const lista = JSON.parse(crudo);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export async function encolarPublicacionOffline(
  datos: NuevaPublicacion,
  publicacionVista: Publicacion
): Promise<PublicacionEnCola> {
  const actual = await obtenerColaPublicaciones();
  const item: PublicacionEnCola = {
    idTemporal: publicacionVista.id,
    creadaEn: new Date().toISOString(),
    datos,
    publicacionVista,
  };
  await AsyncStorage.setItem(CLAVE_COLA_PUBS, JSON.stringify([item, ...actual]));
  return item;
}

export async function removerPublicacionDeCola(idTemporal: string): Promise<void> {
  const actual = await obtenerColaPublicaciones();
  await AsyncStorage.setItem(
    CLAVE_COLA_PUBS,
    JSON.stringify(actual.filter((item) => item.idTemporal !== idTemporal))
  );
}

/* ------------------------------------------------------------------ */
/* Reseñas y Visto Bueno Vecinal guardados localmente (respaldo)       */
/* ------------------------------------------------------------------ */
export async function guardarResenaLocal(
  destinatarioId: string,
  resena: Resena
): Promise<Resena[]> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_RESENAS_LOCALES);
    const mapa: Record<string, Resena[]> = crudo ? JSON.parse(crudo) : {};
    const previas = mapa[destinatarioId] ?? [];
    const nuevas = [resena, ...previas.filter((r) => r.id !== resena.id)];
    mapa[destinatarioId] = nuevas;
    await AsyncStorage.setItem(CLAVE_RESENAS_LOCALES, JSON.stringify(mapa));
    return nuevas;
  } catch {
    return [resena];
  }
}

export async function leerResenasLocales(destinatarioId: string): Promise<Resena[]> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_RESENAS_LOCALES);
    if (!crudo) return [];
    const mapa: Record<string, Resena[]> = JSON.parse(crudo);
    return mapa[destinatarioId] ?? [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Semillas Offline para que la app funcione incluso sin red inicial   */
/* ------------------------------------------------------------------ */
export const ZONAS_SEMILLA_OFFLINE: Zona[] = [
  { id: 1, nombre: 'Cercado', distrito: 'Arequipa', ciudad: 'Arequipa', latitud: -16.3989, longitud: -71.535 },
  { id: 2, nombre: 'Yanahuara', distrito: 'Yanahuara', ciudad: 'Arequipa', latitud: -16.391, longitud: -71.543 },
  { id: 3, nombre: 'Cayma', distrito: 'Cayma', ciudad: 'Arequipa', latitud: -16.383, longitud: -71.548 },
];

export const CATEGORIAS_SEMILLA_OFFLINE: Categoria[] = [
  { id: 1, nombre: 'Hogar', icono: 'home', padre_id: null, aplica_a: ['SERVICIO'] },
  { id: 2, nombre: 'Educación', icono: 'book', padre_id: null, aplica_a: ['SERVICIO', 'FAVOR'] },
  { id: 3, nombre: 'Tecnología', icono: 'laptop', padre_id: null, aplica_a: ['SERVICIO', 'FAVOR'] },
  { id: 4, nombre: 'Salud', icono: 'medkit', padre_id: null, aplica_a: ['SERVICIO'] },
  { id: 5, nombre: 'Seguridad', icono: 'videocam', padre_id: null, aplica_a: ['SERVICIO'] },
  { id: 6, nombre: 'Herramienta', icono: 'build', padre_id: null, aplica_a: ['FAVOR', 'RECURSO'] },
  { id: 7, nombre: 'Apoyo', icono: 'people', padre_id: null, aplica_a: ['FAVOR'] },
  { id: 8, nombre: 'Donación', icono: 'cube', padre_id: null, aplica_a: ['FAVOR', 'RECURSO'] },
  { id: 9, nombre: 'Otro', icono: 'grid', padre_id: null, aplica_a: ['SERVICIO', 'FAVOR', 'RECURSO'] },
  { id: 10, nombre: 'Agua y alimentos', icono: 'water', padre_id: null, aplica_a: ['EMERGENCIA'] },
  { id: 11, nombre: 'Primeros auxilios', icono: 'medkit', padre_id: null, aplica_a: ['EMERGENCIA'] },
  { id: 12, nombre: 'Apoyo a personas', icono: 'alert-circle', padre_id: null, aplica_a: ['EMERGENCIA'] },
];

export const PUBLICACIONES_SEMILLA_OFFLINE: Publicacion[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    tipo: 'SERVICIO',
    direccion: 'OFRECE',
    titulo: 'Electricista a domicilio y emergencias',
    descripcion: 'Instalaciones eléctricas, cortocircuitos, tableros y mantenimiento en el barrio.',
    estado: 'ABIERTA',
    latitud: -16.3988,
    longitud: -71.5369,
    created_at: new Date(Date.now() - 3600_000 * 3).toISOString(),
    autor: {
      id: '22222222-2222-4222-8222-222222222201',
      nombre_completo: 'Carlos Ramos',
      foto_url: null,
      calificacion_promedio: 4.9,
      total_resenas: 14,
    },
    categoria: { id: 1, nombre: 'Hogar', icono: 'home' },
    zona: ZONAS_SEMILLA_OFFLINE[0],
    servicio: {
      tipo_precio: 'FIJO',
      monto: 45,
      moneda: 'PEN',
      modalidad: 'DOMICILIO',
      radio_km: 5,
      disponibilidad: 'Lun-Dom 7:00-22:00',
      presupuesto_min: null,
      presupuesto_max: null,
      urgencia: 'ALTA',
    },
    emergencia: null,
    distancia_km: 0.3,
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    tipo: 'SERVICIO',
    direccion: 'OFRECE',
    titulo: 'Gasfitero del barrio · Fugas y tuberías',
    descripcion: 'Reparación rápida de fugas de agua, grifería y tanques elevados.',
    estado: 'ABIERTA',
    latitud: -16.395,
    longitud: -71.541,
    created_at: new Date(Date.now() - 3600_000 * 5).toISOString(),
    autor: {
      id: '22222222-2222-4222-8222-222222222202',
      nombre_completo: 'Luis Mamani',
      foto_url: null,
      calificacion_promedio: 4.8,
      total_resenas: 9,
    },
    categoria: { id: 1, nombre: 'Hogar', icono: 'home' },
    zona: ZONAS_SEMILLA_OFFLINE[1],
    servicio: {
      tipo_precio: 'FIJO',
      monto: 40,
      moneda: 'PEN',
      modalidad: 'DOMICILIO',
      radio_km: 5,
      disponibilidad: 'Atención inmediata',
      presupuesto_min: null,
      presupuesto_max: null,
      urgencia: 'MEDIA',
    },
    emergencia: null,
    distancia_km: 0.6,
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    tipo: 'SERVICIO',
    direccion: 'OFRECE',
    titulo: 'Enfermera técnica · Primeros auxilios e inyectables',
    descripcion: 'Toma de presión, curaciones, control de glucosa y apoyo para traslado al hospital.',
    estado: 'ABIERTA',
    latitud: -16.3972,
    longitud: -71.5342,
    created_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
    autor: {
      id: '22222222-2222-4222-8222-222222222203',
      nombre_completo: 'Rosa Huanca',
      foto_url: null,
      calificacion_promedio: 5.0,
      total_resenas: 18,
    },
    categoria: { id: 4, nombre: 'Salud', icono: 'medkit' },
    zona: ZONAS_SEMILLA_OFFLINE[0],
    servicio: {
      tipo_precio: 'FIJO',
      monto: 25,
      moneda: 'PEN',
      modalidad: 'DOMICILIO',
      radio_km: 4,
      disponibilidad: '24 horas para urgencias vecinales',
      presupuesto_min: null,
      presupuesto_max: null,
      urgencia: 'ALTA',
    },
    emergencia: null,
    distancia_km: 0.2,
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    tipo: 'SERVICIO',
    direccion: 'OFRECE',
    titulo: 'Clases de matemáticas y refuerzo escolar',
    descripcion: 'Apoyo escolar primaria y secundaria a domicilio o virtual.',
    estado: 'ABIERTA',
    latitud: -16.403,
    longitud: -71.525,
    created_at: new Date(Date.now() - 3600_000 * 8).toISOString(),
    autor: {
      id: '22222222-2222-4222-8222-222222222204',
      nombre_completo: 'Andrea Paredes',
      foto_url: null,
      calificacion_promedio: 4.7,
      total_resenas: 6,
    },
    categoria: { id: 2, nombre: 'Educación', icono: 'book' },
    zona: ZONAS_SEMILLA_OFFLINE[2],
    servicio: {
      tipo_precio: 'POR_HORA',
      monto: 30,
      moneda: 'PEN',
      modalidad: 'DOMICILIO',
      radio_km: 8,
      disponibilidad: 'Tardes',
      presupuesto_min: null,
      presupuesto_max: null,
      urgencia: 'BAJA',
    },
    emergencia: null,
    distancia_km: 1.1,
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    tipo: 'FAVOR',
    direccion: 'SOLICITA',
    titulo: 'Préstamo de escalera por 2 horas',
    descripcion: 'Necesito una escalera mediana para arreglar una luminaria en mi patio.',
    estado: 'ABIERTA',
    latitud: -16.3948,
    longitud: -71.532,
    created_at: new Date(Date.now() - 1800_000).toISOString(),
    autor: {
      id: '22222222-2222-4222-8222-222222222205',
      nombre_completo: 'María Quispe',
      foto_url: null,
      calificacion_promedio: 4.9,
      total_resenas: 5,
    },
    categoria: { id: 6, nombre: 'Herramienta', icono: 'build' },
    zona: ZONAS_SEMILLA_OFFLINE[0],
    servicio: null,
    emergencia: null,
    distancia_km: 0.4,
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    tipo: 'FAVOR',
    direccion: 'OFRECE',
    titulo: 'Movilidad solidaria hacia hospital Honorio Delgado',
    descripcion: 'Salgo todas las mañanas 7:30 am desde Cercado, puedo llevar a vecinos mayores sin costo.',
    estado: 'ABIERTA',
    latitud: -16.3995,
    longitud: -71.5355,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    autor: {
      id: '22222222-2222-4222-8222-222222222206',
      nombre_completo: 'Miguel Tapia',
      foto_url: null,
      calificacion_promedio: 5.0,
      total_resenas: 11,
    },
    categoria: { id: 7, nombre: 'Apoyo', icono: 'people' },
    zona: ZONAS_SEMILLA_OFFLINE[0],
    servicio: null,
    emergencia: null,
    distancia_km: 0.3,
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    tipo: 'EMERGENCIA',
    direccion: 'OFRECE',
    titulo: 'Punto de acopio vecinal y botiquín de sismo',
    descripcion: 'Agua potable, radio a pilas, botiquín de primeros auxilios y cargador solar disponibles.',
    estado: 'ABIERTA',
    latitud: -16.399,
    longitud: -71.536,
    created_at: new Date(Date.now() - 2400_000).toISOString(),
    autor: {
      id: '22222222-2222-4222-8222-222222222201',
      nombre_completo: 'Carlos Ramos',
      foto_url: null,
      calificacion_promedio: 4.9,
      total_resenas: 14,
    },
    categoria: { id: 10, nombre: 'Agua y alimentos', icono: 'water' },
    zona: ZONAS_SEMILLA_OFFLINE[0],
    servicio: null,
    emergencia: {
      cantidad: 20,
      unidad: 'botellas',
      detalle_cantidad: '20 botellas de agua, botiquín y punto de carga',
      nivel_urgencia: 'ALTA',
    },
    distancia_km: 0.2,
  },
  {
    id: '11111111-1111-4111-8111-111111111108',
    tipo: 'EMERGENCIA',
    direccion: 'SOLICITA',
    titulo: 'Adulto mayor requiere apoyo tras corte de luz',
    descripcion: 'Vecino en calle Mercaderes necesita linterna y apoyo para verificar llave general de gas.',
    estado: 'ABIERTA',
    latitud: -16.401,
    longitud: -71.533,
    created_at: new Date(Date.now() - 900_000).toISOString(),
    autor: {
      id: '22222222-2222-4222-8222-222222222205',
      nombre_completo: 'Ana Torres',
      foto_url: null,
      calificacion_promedio: 4.8,
      total_resenas: 4,
    },
    categoria: { id: 12, nombre: 'Apoyo a personas', icono: 'alert-circle' },
    zona: ZONAS_SEMILLA_OFFLINE[0],
    servicio: null,
    emergencia: {
      cantidad: null,
      unidad: null,
      detalle_cantidad: null,
      nivel_urgencia: 'CRITICA',
    },
    distancia_km: 0.4,
  },
];
