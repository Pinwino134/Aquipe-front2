import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Usuario } from './api';

const CLAVE_SESION = '@aquipe/sesion_usuario_v1';

/**
 * Sesión persistida en AsyncStorage + memoria reactiva.
 * Permite que el vecino mantenga su sesión activa y su token firmado
 * incluso si cierra la app o se queda sin internet durante una emergencia.
 */
let usuario: Usuario | null = null;
let hidratado = false;
const oyentes = new Set<() => void>();

const notificar = () => {
  oyentes.forEach((fn) => fn());
};

export const getUsuario = () => usuario;
export const isSesionHidratada = () => hidratado;

export function setUsuario(nuevo: Usuario | null) {
  usuario = nuevo;
  notificar();
  if (nuevo) {
    AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(nuevo)).catch(() => {});
  } else {
    AsyncStorage.removeItem(CLAVE_SESION).catch(() => {});
  }
}

  oyentes.forEach((fn) => fn());
export async function hidratarSesion(): Promise<Usuario | null> {
  if (hidratado && usuario) return usuario;
  try {
    const guardado = await AsyncStorage.getItem(CLAVE_SESION);
    if (guardado) {
      const parseado = JSON.parse(guardado) as Usuario;
      if (parseado && typeof parseado.id === 'string') {
        usuario = parseado;
      }
    }
  } catch {
    /* se mantiene null si falla la lectura */
  } finally {
    hidratado = true;
    notificar();
  }
  return usuario;
}

/**
 * Crea una sesión local de emergencia cuando el vecino necesita entrar a la app
 * sin conexión a internet y no tenía sesión previa guardada.
 */
export function activarSesionOfflineEmergencia(nombre = 'Vecino AquiPe', telefono = '999000111'): Usuario {
  const usuarioOffline: Usuario = {
    id: '00000000-0000-4000-8000-000000000001',
    nombre_completo: nombre,
    correo: 'vecino.offline@aquipe.pe',
    telefono,
    foto_url: null,
    calificacion_promedio: 5.0,
    total_resenas: 1,
    zona: {
      id: 1,
      nombre: 'Cercado',
      distrito: 'Arequipa',
      ciudad: 'Arequipa',
      latitud: -16.3989,
      longitud: -71.535,
    },
    latitud: -16.3989,
    longitud: -71.535,
    perfil_publico: true,
    notificaciones_activas: true,
    perfil_proveedor: null,
    created_at: new Date().toISOString(),
    access_token: 'offline-local-session',
  };
  setUsuario(usuarioOffline);
  return usuarioOffline;
}

}
const suscribir = (fn: () => void) => {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
};

/** Devuelve el usuario con sesión iniciada (o null) y re-renderiza al cambiar. */
export function useUsuario() {
  return useSyncExternalStore(suscribir, getUsuario, getUsuario);
}
