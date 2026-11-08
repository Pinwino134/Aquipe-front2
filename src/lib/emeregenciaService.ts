import { Alert, Linking, Platform } from 'react-native';

import { api } from './api';
import type { Publicacion } from './api';
import {
  marcarEmergenciaSincronizada,
  obtenerEmergenciasLocales,
  type EmergenciaLocal,
  type TipoEmergenciaSOS,
} from './emergenciaLocal';
import {
  obtenerColaPublicaciones,
  removerPublicacionDeCola,
} from './offline';
import { getUsuario } from './session';
import { CENTRO_AREQUIPA } from './ui';

export const INFO_TIPO_SOS: Record<
  TipoEmergenciaSOS,
  {
    titulo: string;
    subtitulo: string;
    icono: 'shield-outline' | 'medkit-outline' | 'warning-outline' | 'alert-circle-outline';
    color: string;
    numeroEmergencia: string;
    entidadEmergencia: string;
    mensajeBase: string;
  }
> = {
  ROBO: {
    titulo: 'Robo / Seguridad',
    subtitulo: 'Alerta vecinal inmediata y Policía 105',
    icono: 'shield-outline',
    color: '#C62828',
    numeroEmergencia: '105',
    entidadEmergencia: 'Policía Nacional (105)',
    mensajeBase: 'Urgencia de seguridad / robo en curso. Solicito apoyo vecinal y policial.',
  },
  HOSPITAL: {
    titulo: 'Salud / Ir al Hospital',
    subtitulo: 'Traslado urgente, primeros auxilios y SAMU 106',
    icono: 'medkit-outline',
    color: '#D84315',
    numeroEmergencia: '106',
    entidadEmergencia: 'SAMU Ambulancia (106)',
    mensajeBase: 'Emergencia médica. Necesito apoyo urgente para traslado al hospital o primeros auxilios.',
  },
  SISMO: {
    titulo: 'Sismo / Desastre',
    subtitulo: 'Reporte geolocalizado y Bomberos 116',
    icono: 'warning-outline',
    color: '#E65100',
    numeroEmergencia: '116',
    entidadEmergencia: 'Bomberos / Rescate (116)',
    mensajeBase: 'Emergencia por sismo / estructura afectada. Solicito apoyo comunitario en mi ubicación.',
  },
  GENERAL: {
    titulo: 'Emergencia General',
    subtitulo: 'Auxilio comunitario inmediato',
    icono: 'alert-circle-outline',
    color: '#C62828',
    numeroEmergencia: '105',
    entidadEmergencia: 'Central de Emergencias (105)',
    mensajeBase: 'Necesito ayuda urgente de mis vecinos en mi ubicación.',
  },
};

/**
 * Envía una emergencia local al backend como publicación de tipo EMERGENCIA (CRITICA)
 * para que aparezca de inmediato en el mapa y lista de todos los vecinos.
 */
export async function sincronizarEmergenciaIndividual(
  emergencia: EmergenciaLocal
): Promise<boolean> {
  if (emergencia.sincronizada || emergencia.estado === 'CANCELADA') {
    return true;
  }

  const info = INFO_TIPO_SOS[emergencia.tipo] ?? INFO_TIPO_SOS.GENERAL;
  const usuario = getUsuario();
  const lat = emergencia.latitud ?? usuario?.latitud ?? CENTRO_AREQUIPA.latitude;
  const lng = emergencia.longitud ?? usuario?.longitud ?? CENTRO_AREQUIPA.longitude;

  try {
    const creada = await api<Publicacion>('/publicaciones', {
      method: 'POST',
      json: {
        tipo: 'EMERGENCIA',
        direccion: 'SOLICITA',
        titulo: `🆘 SOS ${info.titulo} - ${usuario?.nombre_completo ?? 'Vecino'}`.slice(0, 80),
        descripcion: (emergencia.detalle || info.mensajeBase).slice(0, 1000),
        zona_id: usuario?.zona?.id ?? 1,
        latitud: lat,
        longitud: lng,
        emergencia: {
          nivel_urgencia: 'CRITICA',
        },
      },
    });

    await marcarEmergenciaSincronizada(emergencia.id, creada.id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sincroniza todas las emergencias SOS pendientes y las publicaciones creadas en Modo Offline.
 */
export async function sincronizarTodoPendiente(): Promise<{
  sosSincronizados: number;
  publicacionesSincronizadas: number;
}> {
  let sosSincronizados = 0;
  let publicacionesSincronizadas = 0;

  // 1. Sincronizar alertas SOS locales
  const emergencias = await obtenerEmergenciasLocales();
  for (const item of emergencias) {
    if (
      !item.sincronizada &&
      (item.estado === 'PENDIENTE' || item.estado === 'ENVIADA')
    ) {
      const ok = await sincronizarEmergenciaIndividual(item);
      if (ok) sosSincronizados += 1;
    }
  }

  // 2. Sincronizar publicaciones de la cola offline
  const cola = await obtenerColaPublicaciones();
  for (const item of cola) {
    try {
      await api<Publicacion>('/publicaciones', {
        method: 'POST',
        json: item.datos,
      });
      await removerPublicacionDeCola(item.idTemporal);
      publicacionesSincronizadas += 1;
    } catch {
      /* si sigue sin red, permanece en la cola */
    }
  }

  return { sosSincronizados, publicacionesSincronizadas };
}

/**
 * Envía un SMS nativo con coordenadas GPS satelitales.
 * Funciona 100% SIN INTERNET usando la red celular GSM del teléfono.
 */
export async function enviarSMSOfflineSOS(
  emergencia: EmergenciaLocal,
  telefonoDestino?: string
): Promise<void> {
  const info = INFO_TIPO_SOS[emergencia.tipo] ?? INFO_TIPO_SOS.GENERAL;
  const usuario = getUsuario();
  const lat = emergencia.latitud ?? usuario?.latitud ?? CENTRO_AREQUIPA.latitude;
  const lng = emergencia.longitud ?? usuario?.longitud ?? CENTRO_AREQUIPA.longitude;
  const mapaUrl = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

  const texto = [
    `🆘 ALERTA SOS AQUIPE [${info.titulo.toUpperCase()}]`,
    `Vecino: ${usuario?.nombre_completo ?? 'Vecino AquiPe'}`,
    emergencia.detalle || info.mensajeBase,
    `📍 Ubicación GPS exacta: ${mapaUrl}`,
  ].join('\n');

  const destino = (telefonoDestino ?? '').replace(/\s+/g, '');
  const separador = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${destino}${separador}body=${encodeURIComponent(texto)}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'SMS de Emergencia',
      `Copia y envía este mensaje con tu ubicación:\n\n${texto}`
    );
  }
}

/**
 * Llama directamente al número de emergencia oficial (105 Policía, 106 SAMU, 116 Bomberos).
 */
export async function llamarNumeroEmergencia(numero: string): Promise<void> {
  try {
    await Linking.openURL(`tel:${numero}`);
  } catch {
    Alert.alert('Llamada de emergencia', `Marca directamente al ${numero} en tu teléfono.`);
  }
}
