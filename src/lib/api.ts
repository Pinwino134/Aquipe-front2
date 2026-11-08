import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  CATEGORIAS_SEMILLA_OFFLINE,
  encolarPublicacionOffline,
  guardarCache,
  guardarResenaLocal,
  isOfflineSimulado,
  leerCache,
  leerResenasLocales,
  obtenerColaPublicaciones,
  PUBLICACIONES_SEMILLA_OFFLINE,
  reportarEstadoRed,
  ZONAS_SEMILLA_OFFLINE,
} from './offline';
import { getUsuario } from './session';

/* ------------------------------------------------------------------ */
/* URL del backend                                                     */
/* ------------------------------------------------------------------ */
function resolverBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:8000`;

  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://localhost:8000';
}

export const API_URL = resolverBaseUrl();

/* ------------------------------------------------------------------ */
/* Tipos (espejo de app/schemas.py del backend)                        */
/* ------------------------------------------------------------------ */
export type TipoPublicacion = 'SERVICIO' | 'FAVOR' | 'RECURSO' | 'EMERGENCIA';
export type Direccion = 'SOLICITA' | 'OFRECE';
export type EstadoPublicacion =
  | 'ABIERTA'
  | 'PAUSADA'
  | 'ASIGNADA'
  | 'EN_CURSO'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'EXPIRADA';
export type TipoPrecio = 'FIJO' | 'POR_HORA' | 'A_CONVENIR';
export type Urgencia = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type Zona = {
  id: number;
  nombre: string;
  distrito: string;
  ciudad: string;
  latitud: number;
  longitud: number;
};

export type Categoria = {
  id: number;
  nombre: string;
  icono: string | null;
  padre_id: number | null;
  aplica_a: TipoPublicacion[];
};

export type UsuarioResumen = {
  id: string;
  nombre_completo: string;
  foto_url: string | null;
  calificacion_promedio: number;
  total_resenas: number;
};

export type Usuario = UsuarioResumen & {
  correo: string;
  telefono: string;
  zona: Zona | null;
  latitud: number | null;
  longitud: number | null;
  perfil_publico: boolean;
  notificaciones_activas: boolean;
  perfil_proveedor: {
    biografia: string | null;
    anios_experiencia: number | null;
    disponibilidad: string | null;
    verificado: boolean;
  } | null;
  created_at: string;
  access_token?: string | null;
};

export type UsuarioPublico = UsuarioResumen & {
  zona: Zona | null;
  perfil_proveedor: Usuario['perfil_proveedor'];
  telefono: string | null;
};

export type Publicacion = {
  id: string;
  tipo: TipoPublicacion;
  direccion: Direccion;
  titulo: string;
  descripcion: string;
  estado: EstadoPublicacion;
  latitud: number | null;
  longitud: number | null;
  created_at: string;
  autor: UsuarioResumen;
  categoria: { id: number; nombre: string; icono: string | null } | null;
  zona: Zona | null;
  servicio: {
    tipo_precio: TipoPrecio;
    monto: number | null;
    moneda: string;
    modalidad: Modalidad;
    radio_km: number | null;
    disponibilidad: string | null;
    presupuesto_min: number | null;
    presupuesto_max: number | null;
    fecha_requerida?: string | null;
    urgencia: Urgencia;
  } | null;
  emergencia: {
    cantidad: number | null;
    unidad: string | null;
    detalle_cantidad: string | null;
    nivel_urgencia: Urgencia;
  } | null;
  distancia_km: number | null;
};

export type NuevaPublicacion = {
  tipo: TipoPublicacion;
  direccion: Direccion;
  categoria_id?: number | null;
  titulo: string;
  descripcion: string;
  zona_id?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  servicio?: Record<string, unknown>;
  emergencia?: Record<string, unknown>;
};

export type Respuesta = {
  id: string;
  publicacion_id: string;
  mensaje: string;
  precio_propuesto: number | null;
  estado: EstadoRespuesta;
  created_at: string;
  usuario: UsuarioResumen;
};
export type EstadoRespuesta = 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'RETIRADA';
export type EstadoAcuerdo = 'PROGRAMADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
export type Modalidad = 'DOMICILIO' | 'VIRTUAL' | 'EN_LOCAL';

export type RespuestaMia = Respuesta & {
  publicacion: { id: string; tipo: TipoPublicacion; direccion: Direccion; titulo: string; estado: EstadoPublicacion };
};

export type Acuerdo = {
  id: string;
  estado: EstadoAcuerdo;
  precio_acordado: number | null;
  fecha_programada: string | null;
  completado_at: string | null;
  cancelado_at: string | null;
  motivo_cancelacion: string | null;
  created_at: string;
  publicacion: { id: string; tipo: TipoPublicacion; direccion: Direccion; titulo: string; estado: EstadoPublicacion };
  solicitante: UsuarioResumen;
  proveedor: UsuarioResumen;
};

export type Resena = {
  id: string;
  acuerdo_id: string;
  calificacion: number;
  comentario: string | null;
  created_at: string;
  autor: UsuarioResumen;
};

export type Recurso = {

export type Resena = {
  id: string;
  acuerdo_id: string;
  calificacion: number;
  comentario: string | null;
  created_at: string;
  autor: UsuarioResumen;
};

export type CalificarRespuesta = {
  resena: Resena;
  calificacion_promedio: number;
  total_resenas: number;
  visto_bueno_vecinal: boolean;
};

export type RecursoPersonal = {
  id: string;
  usuario_id: string;
  nombre: string;
  descripcion: string | null;
  cantidad: number;
  unidad: string | null;
  disponible: boolean;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* Cliente HTTP con seguridad Bearer + detección Offline               */
/* ------------------------------------------------------------------ */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mensajeDeError(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const campo = d.loc?.[d.loc.length - 1];
        const msg = (d.msg ?? '').replace(/^Value error, /, '');
        return campo && campo !== 'body' ? `${String(campo)}: ${msg}` : msg;
      })
      .join('\n');
  }
  return 'Ocurrió un error inesperado';
}

export async function api<T = unknown>(
  ruta: string,
  init: RequestInit & { json?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  if (isOfflineSimulado()) {
    throw new ApiError(0, 'Modo Offline activo');
  }

  const { json, headers, timeoutMs = 4500, ...resto } = init;
  const usuario = getUsuario();

  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...resto,
      signal: controlador.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(usuario?.access_token && usuario.access_token !== 'offline-local-session'
          ? { Authorization: `Bearer ${usuario.access_token}` }
          : {}),
        ...(usuario ? { 'X-User-Id': usuario.id } : {}),
        ...(headers as Record<string, string> | undefined),
      },
      body: json !== undefined ? JSON.stringify(json) : resto.body,
    });
    reportarEstadoRed(true);
  } catch {
    reportarEstadoRed(false);
    throw new ApiError(
      0,
      `Modo Sin Conexión: no se pudo contactar al servidor (${API_URL}).`
    );
  } finally {
    clearTimeout(timer);
  }

  if (respuesta.status === 204) return null as T;

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, mensajeDeError(datos?.detail));
  }
  return datos as T;
}

const query = (params: Record<string, unknown>) => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
};

function filtrarPublicacionesLocal(
  lista: Publicacion[],
  filtros: {
    tipo?: TipoPublicacion;
    direccion?: Direccion;
    categoria_id?: number;
    q?: string;
  }
): Publicacion[] {
  return lista.filter((p) => {
    if (filtros.tipo && p.tipo !== filtros.tipo) return false;
    if (filtros.direccion && p.direccion !== filtros.direccion) return false;
    if (filtros.categoria_id && p.categoria?.id !== filtros.categoria_id) return false;
    if (filtros.q) {
      const q = filtros.q.trim().toLowerCase();
      const txt = `${p.titulo} ${p.descripcion}`.toLowerCase();
      if (!txt.includes(q)) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Endpoints con Respaldo Offline Automático                           */
/* ------------------------------------------------------------------ */
export const Api = {
  // Auth
  login: (correo: string, password: string) =>
    api<Usuario>('/auth/login', { method: 'POST', json: { correo, password } }),
  registro: (datos: {
    nombre_completo: string;
    correo: string;
    telefono: string;
    password: string;
    zona_id?: number | null;
  }) => api<Usuario>('/auth/registro', { method: 'POST', json: datos }),

  // Catálogos (con caché offline y semillas)
  zonas: async (): Promise<Zona[]> => {
    try {
      const res = await api<Zona[]>('/zonas');
      await guardarCache('zonas', res);
      return res;
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        return (await leerCache<Zona[]>('zonas')) ?? ZONAS_SEMILLA_OFFLINE;
      }
      throw e;
    }
  },

  categorias: async (tipo?: TipoPublicacion): Promise<Categoria[]> => {
    const clave = `categorias:${tipo ?? 'ALL'}`;
    try {
      const res = await api<Categoria[]>(`/categorias${query({ tipo })}`);
      await guardarCache(clave, res);
      return res;
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        const cache = await leerCache<Categoria[]>(clave);
        if (cache) return cache;
        return tipo
          ? CATEGORIAS_SEMILLA_OFFLINE.filter((c) => c.aplica_a.includes(tipo))
          : CATEGORIAS_SEMILLA_OFFLINE;
      }
      throw e;
    }
  },

  // Usuarios
  miPerfil: () => api<Usuario>('/usuarios/me'),
  actualizarPerfil: (cambios: Partial<{
    nombre_completo: string;
    telefono: string;
    zona_id: number | null;
    latitud: number;
    longitud: number;
    perfil_publico: boolean;
    notificaciones_activas: boolean;
  }>) => api<Usuario>('/usuarios/me', { method: 'PATCH', json: cambios }),

  usuario: async (id: string): Promise<UsuarioPublico> => {
    try {
      const u = await api<UsuarioPublico>(`/usuarios/${id}`);
      await guardarCache(`usuario:${id}`, u);
      return u;
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        const cache = await leerCache<UsuarioPublico>(`usuario:${id}`);
        if (cache) return cache;
        return {
          id,
          nombre_completo: 'Vecino AquiPe',
          foto_url: null,
          calificacion_promedio: 4.9,
          total_resenas: 8,
          zona: ZONAS_SEMILLA_OFFLINE[0],
          telefono: '999111222',
        };
      }
      throw e;
    }
  },

  // Publicaciones (con fusión de cola offline + caché)
  publicaciones: async (filtros: {
    tipo?: TipoPublicacion;
    direccion?: Direccion;
    categoria_id?: number;
    q?: string;
    lat?: number;
    lng?: number;
    radio_km?: number;
    zona_id?: number;
    estado?: EstadoPublicacion;
    autor_id?: string;
    limit?: number;
  } = {}) =>
    api<Publicacion[]>(`/publicaciones${query({ limit: 100, ...filtros })}`),
  publicacion: (id: string) => api<Publicacion>(`/publicaciones/${id}`),
  misPublicaciones: () => api<Publicacion[]>('/publicaciones/mias'),
  crearPublicacion: (datos: NuevaPublicacion) =>
    api<Publicacion>('/publicaciones', { method: 'POST', json: datos }),
  } = {}): Promise<Publicacion[]> => {
    const claveEspecifica = `pubs:${filtros.tipo ?? 'ALL'}:${filtros.direccion ?? 'ALL'}`;
    const enCola = (await obtenerColaPublicaciones()).map((item) => item.publicacionVista);

    try {
      const remotas = await api<Publicacion[]>(`/publicaciones${query({ limit: 100, ...filtros })}`);
      await guardarCache(claveEspecifica, remotas);
      if (!filtros.tipo && !filtros.direccion && !filtros.q) {
        await guardarCache('pubs:ALL:ALL', remotas);
      }
      const extrasOffline = filtrarPublicacionesLocal(enCola, filtros);
      const idsRemotos = new Set(remotas.map((r) => r.id));
      return [...extrasOffline.filter((x) => !idsRemotos.has(x.id)), ...remotas];
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        const cacheEspecifica = await leerCache<Publicacion[]>(claveEspecifica);
        const cacheGeneral = await leerCache<Publicacion[]>('pubs:ALL:ALL');
        const base = cacheEspecifica ?? cacheGeneral ?? PUBLICACIONES_SEMILLA_OFFLINE;
        const combinadas = [...enCola, ...base];
        const vistas = new Set<string>();
        const unicas = combinadas.filter((p) => {
          if (vistas.has(p.id)) return false;
          vistas.add(p.id);
          return true;
        });
        return filtrarPublicacionesLocal(unicas, filtros);
      }
      throw e;
    }
  },

  misPublicaciones: async (): Promise<Publicacion[]> => {
    const enCola = (await obtenerColaPublicaciones()).map((item) => item.publicacionVista);
    try {
      const mias = await api<Publicacion[]>('/publicaciones/mias');
      await guardarCache('pubs:mias', mias);
      return [...enCola, ...mias];
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        const cache = (await leerCache<Publicacion[]>('pubs:mias')) ?? [];
        return [...enCola, ...cache];
      }
      throw e;
    }
  },

  crearPublicacion: async (datos: NuevaPublicacion): Promise<Publicacion> => {
    try {
      return await api<Publicacion>('/publicaciones', { method: 'POST', json: datos });
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        const u = getUsuario();
        const cat = CATEGORIAS_SEMILLA_OFFLINE.find((c) => c.id === datos.categoria_id) ?? null;
        const zona = ZONAS_SEMILLA_OFFLINE.find((z) => z.id === datos.zona_id) ?? u?.zona ?? ZONAS_SEMILLA_OFFLINE[0];
        const pubOffline: Publicacion = {
          id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tipo: datos.tipo,
          direccion: datos.direccion,
          titulo: datos.titulo,
          descripcion: datos.descripcion,
          estado: 'ABIERTA',
          latitud: datos.latitud ?? zona?.latitud ?? -16.3989,
          longitud: datos.longitud ?? zona?.longitud ?? -71.535,
          created_at: new Date().toISOString(),
          autor: {
            id: u?.id ?? '00000000-0000-4000-8000-000000000001',
            nombre_completo: u?.nombre_completo ?? 'Vecino AquiPe',
            foto_url: u?.foto_url ?? null,
            calificacion_promedio: u?.calificacion_promedio ?? 5.0,
            total_resenas: u?.total_resenas ?? 1,
          },
          categoria: cat ? { id: cat.id, nombre: cat.nombre, icono: cat.icono } : null,
          zona: zona ?? null,
          servicio: datos.servicio
            ? {
                tipo_precio: (datos.servicio.tipo_precio as TipoPrecio) ?? 'A_CONVENIR',
                monto: (datos.servicio.monto as number | null) ?? null,
                moneda: 'PEN',
                modalidad: 'DOMICILIO',
                radio_km: 5,
                disponibilidad: null,
                presupuesto_min: null,
                presupuesto_max: null,
                urgencia: 'MEDIA',
              }
            : null,
          emergencia: datos.emergencia
            ? {
                cantidad: (datos.emergencia.cantidad as number | null) ?? null,
                unidad: (datos.emergencia.unidad as string | null) ?? null,
                detalle_cantidad: (datos.emergencia.detalle_cantidad as string | null) ?? null,
                nivel_urgencia: (datos.emergencia.nivel_urgencia as Urgencia) ?? 'ALTA',
              }
            : null,
          distancia_km: 0.1,
        };
        await encolarPublicacionOffline(datos, pubOffline);
        return pubOffline;
      }
      throw e;
    }
  },

  eliminarPublicacion: (id: string) =>
    api<null>(`/publicaciones/${id}`, { method: 'DELETE' }),

  // Respuestas (postularse / contratar / ofrecer ayuda)
  responder: (publicacionId: string, mensaje: string, precio_propuesto?: number) =>
    api<Respuesta>(`/publicaciones/${publicacionId}/respuestas`, {
      method: 'POST',
      json: { mensaje, precio_propuesto },
    }),
  editarPublicacion: (
    id: string,
    cambios: Partial<{ titulo: string; descripcion: string; estado: 'ABIERTA' | 'PAUSADA' | 'CANCELADA' }>
  ) => api<Publicacion>(`/publicaciones/${id}`, { method: 'PATCH', json: cambios }),

  // Proveedor y reseñas de usuarios
  guardarProveedor: (d: { biografia?: string; anios_experiencia?: number; disponibilidad?: string }) =>
    api<NonNullable<Usuario['perfil_proveedor']>>('/usuarios/me/proveedor', { method: 'PUT', json: d }),
  resenasDeUsuario: (id: string, limit = 20, offset = 0) =>
    api<Resena[]>(`/usuarios/${id}/resenas${query({ limit, offset })}`),

  // Respuestas: gestión
  respuestasDePublicacion: (id: string) => api<Respuesta[]>(`/publicaciones/${id}/respuestas`),
  misRespuestas: (estado?: EstadoRespuesta) =>
    api<RespuestaMia[]>(`/respuestas/mias${query({ estado })}`),
  retirarRespuesta: (rid: string) => api<Respuesta>(`/respuestas/${rid}/retirar`, { method: 'POST' }),
  rechazarRespuesta: (rid: string) => api<Respuesta>(`/respuestas/${rid}/rechazar`, { method: 'POST' }),
  aceptarRespuesta: (rid: string, fecha_programada?: string) =>
    api<Acuerdo>(`/respuestas/${rid}/aceptar`, { method: 'POST', json: { fecha_programada } }),

  // Acuerdos y reseñas
  misAcuerdos: (estado?: EstadoAcuerdo) => api<Acuerdo[]>(`/acuerdos/mios${query({ estado })}`),
  acuerdo: (id: string) => api<Acuerdo>(`/acuerdos/${id}`),
  cambiarEstadoAcuerdo: (id: string, estado: EstadoAcuerdo, motivo?: string) =>
    api<Acuerdo>(`/acuerdos/${id}/estado`, { method: 'PATCH', json: { estado, motivo } }),
  resenar: (acuerdoId: string, calificacion: number, comentario?: string) =>
    api<Resena>(`/acuerdos/${acuerdoId}/resenas`, { method: 'POST', json: { calificacion, comentario } }),

// Recursos personales (aún sin endpoint en el backend)
misRecursos: () =>
  api<Recurso[]>('/recursos/mios'),

crearRecurso: (datos: NuevoRecurso) =>
  api<Recurso>('/recursos', {
    method: 'POST',
    json: datos,
  }),

actualizarRecurso: (
  id: string,
  cambios: Partial<NuevoRecurso>
) =>
  api<Recurso>(`/recursos/${id}`, {
    method: 'PATCH',
    json: cambios,
  }),

eliminarRecurso: (id: string) =>
  api<null>(`/recursos/${id}`, {
    method: 'DELETE',
  }),

  // Calificaciones y Visto Bueno Vecinal
  resenasDePublicacion: async (publicacionId: string, autorId?: string): Promise<Resena[]> => {
    const locales = autorId ? await leerResenasLocales(autorId) : [];
    try {
      const remotas = await api<Resena[]>(`/publicaciones/${publicacionId}/resenas`);
      await guardarCache(`resenas:${publicacionId}`, remotas);
      const ids = new Set(remotas.map((r) => r.id));
      return [...locales.filter((l) => !ids.has(l.id)), ...remotas];
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        const cache = (await leerCache<Resena[]>(`resenas:${publicacionId}`)) ?? [];
        return [...locales, ...cache];
      }
      return locales;
    }
  },

  calificarPublicacion: async (
    publicacionId: string,
    autorServicioId: string,
    datos: { calificacion: number; comentario?: string; etiquetas?: string[] }
  ): Promise<CalificarRespuesta> => {
    try {
      const res = await api<CalificarRespuesta>(`/publicaciones/${publicacionId}/calificar`, {
        method: 'POST',
        json: datos,
      });
      await guardarResenaLocal(autorServicioId, res.resena);
      return res;
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        const yo = getUsuario();
        const etiquetasTxt =
          datos.etiquetas && datos.etiquetas.length > 0
            ? `[${datos.etiquetas.join(' · ')}] `
            : '';
        const comentarioFinal = `${etiquetasTxt}${datos.comentario?.trim() || 'Recomendado por vecino de la zona.'}`;
        const resenaLocal: Resena = {
          id: `resena-local-${Date.now()}`,
          acuerdo_id: `acuerdo-local-${publicacionId}`,
          calificacion: datos.calificacion,
          comentario: comentarioFinal,
          created_at: new Date().toISOString(),
          autor: {
            id: yo?.id ?? '00000000-0000-4000-8000-000000000001',
            nombre_completo: yo?.nombre_completo ?? 'Vecino AquiPe',
            foto_url: yo?.foto_url ?? null,
            calificacion_promedio: yo?.calificacion_promedio ?? 5.0,
            total_resenas: yo?.total_resenas ?? 1,
          },
        };
        const lista = await guardarResenaLocal(autorServicioId, resenaLocal);
        const suma = lista.reduce((acc, item) => acc + item.calificacion, 0);
        const promedio = Number((suma / lista.length).toFixed(1));
        return {
          resena: resenaLocal,
          calificacion_promedio: promedio,
          total_resenas: lista.length,
          visto_bueno_vecinal: promedio >= 4.0,
        };
      }
      throw e;
    }
  },

  // Recursos personales (Perfil > Mis recursos disponibles)
  misRecursos: async (): Promise<RecursoPersonal[]> => {
    try {
      const res = await api<RecursoPersonal[]>('/recursos/mios');
      await guardarCache('recursos:mios', res);
      return res;
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        return (await leerCache<RecursoPersonal[]>('recursos:mios')) ?? [];
      }
      throw e;
    }
  },

  crearRecurso: (datos: {
    nombre: string;
    descripcion?: string;
    cantidad?: number;
    unidad?: string;
  }) => api<RecursoPersonal>('/recursos', { method: 'POST', json: datos }),

  actualizarRecurso: (id: string, cambios: Partial<{ disponible: boolean; cantidad: number }>) =>
    api<RecursoPersonal>(`/recursos/${id}`, { method: 'PATCH', json: cambios }),
};
