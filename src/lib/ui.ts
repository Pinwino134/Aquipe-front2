import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { Api, ApiError, type Publicacion, type TipoPublicacion, type Zona } from './api';
import { getUsuario, setUsuario } from './session';

/** Centro de Arequipa: se usa si no hay GPS ni zona. */
export const CENTRO_AREQUIPA = { latitude: -16.3989, longitude: -71.535 };

export const COLOR_TIPO: Record<TipoPublicacion, string> = {
  SERVICIO: '#168BE0',
  FAVOR: '#F05A7E',
  RECURSO: '#18B69A',
  EMERGENCIA: '#F28B30',
};

const EMOJI_CATEGORIA: Record<string, string> = {
  Hogar: '🏠',
  Educación: '📚',
  Tecnología: '💻',
  Salud: '🩺',
  Seguridad: '📹',
  Herramienta: '🧰',
  Apoyo: '🤝',
  Donación: '📦',
  Otro: '✨',
  'Agua y alimentos': '💧',
  'Primeros auxilios': '🩹',
  'Apoyo a personas': '🆘',
};

export const emojiCategoria = (nombre?: string | null) =>
  (nombre && EMOJI_CATEGORIA[nombre]) || '📍';

export function textoPrecio(p: Publicacion): string {
  const s = p.servicio;
  if (!s) return '';
  if (p.direccion === 'SOLICITA') {
    if (s.presupuesto_min != null && s.presupuesto_max != null)
      return `S/ ${s.presupuesto_min}–${s.presupuesto_max}`;
    if (s.presupuesto_max != null) return `Hasta S/ ${s.presupuesto_max}`;
    return 'A convenir';
  }
  if (s.tipo_precio === 'A_CONVENIR' || s.monto == null) return 'A convenir';
  return s.tipo_precio === 'POR_HORA' ? `S/ ${s.monto}/h` : `S/ ${s.monto}`;
}

export function distanciaTexto(km: number | null | undefined): string {
  if (km == null) return 'Cerca de ti';
  if (km < 1) return `${Math.max(10, Math.round(km * 1000))} m`;
  return `${km.toFixed(1)} km`;
}

export function tiempoRelativo(iso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export const ESTADO_TEXTO: Record<string, string> = {
  ABIERTA: 'Publicado',
  PAUSADA: 'Pausado',
  ASIGNADA: 'Asignado',
  EN_CURSO: 'En curso',
  COMPLETADA: 'Completado',
  CANCELADA: 'Cancelado',
  EXPIRADA: 'Expirado',
};

/**
 * Ubicación del usuario: GPS si da permiso; si no, la guardada en su perfil
 * (centro de su zona); si no, el centro de Arequipa.
 */
export async function obtenerUbicacion(): Promise<{ latitude: number; longitude: number }> {
  try {
    let permiso = await Location.getForegroundPermissionsAsync();
    if (permiso.status !== 'granted') permiso = await Location.requestForegroundPermissionsAsync();
    if (permiso.status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    }
  } catch {
    /* sin GPS: se usa el respaldo */
  }
  const u = getUsuario();
  if (u?.latitud != null && u?.longitud != null) {
    return { latitude: u.latitud, longitude: u.longitud };
  }
  return CENTRO_AREQUIPA;
}

/** Muestra el error de la API; si la sesión no es válida (401) vuelve al login. */
export function mostrarError(e: unknown, titulo = 'No se pudo completar') {
  const mensaje = e instanceof Error ? e.message : 'Ocurrió un error inesperado';
  if (e instanceof ApiError && e.status === 401) {
    setUsuario(null);
    Alert.alert('Sesión no válida', 'Inicia sesión nuevamente.', [
      { text: 'Aceptar', onPress: () => router.replace('/login') },
    ]);
    return;
  }
  if (e instanceof ApiError && e.status === 0) {
    Alert.alert('Sin conexión', mensaje, [
      { text: 'Aceptar' },
      { text: 'Modo emergencia', onPress: () => router.push('/emergencia-offline') },
    ]);
    return;
  }
  Alert.alert(titulo, mensaje);
}

/** Busca una zona del catálogo a partir de texto libre ("Cayma", "cerca de Yanahuara"…). */
export async function zonaIdPorNombre(texto: string): Promise<number | null> {
  const t = texto.trim().toLowerCase();
  if (!t) return null;
  try {
    const zonas = await Api.zonas();
    const z = zonas.find((z) => {
      const n = z.nombre.toLowerCase();
      return n === t || t.includes(n) || n.includes(t);
    });
    return z?.id ?? null;
  } catch {
    return null;
  }
}

let zonasCache: Zona[] | null = null;

/** Zona del catálogo más cercana a un punto (máx. ~15 km); null si no hay ninguna. */
export async function zonaMasCercana(lat: number, lng: number): Promise<Zona | null> {
  try {
    zonasCache ??= await Api.zonas();
  } catch {
    return null;
  }
  const k = Math.cos((lat * Math.PI) / 180);
  let mejor: Zona | null = null;
  let menor = Infinity;
  for (const z of zonasCache) {
    const d = (z.latitud - lat) ** 2 + ((z.longitud - lng) * k) ** 2;
    if (d < menor) {
      menor = d;
      mejor = z;
    }
  }
  return mejor && Math.sqrt(menor) < 0.14 ? mejor : null;
}

/** Texto legible para un punto del mapa (calle y distrito); si falla, las coordenadas. */
export async function etiquetaUbicacion(lat: number, lng: number): Promise<string> {
  try {
    const [d] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const texto = [d?.street ?? d?.name, d?.district ?? d?.subregion ?? d?.city]
      .filter(Boolean)
      .join(', ');
    if (texto) return texto;
  } catch {
    /* sin geocodificación: se usan coordenadas */
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
