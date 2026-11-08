import AsyncStorage from '@react-native-async-storage/async-storage';

export type EstadoEmergencia =
  | 'PENDIENTE'
  | 'ENVIADA'
  | 'EN_ATENCION'
  | 'RESUELTA'
  | 'CANCELADA';

export type TipoEmergenciaSOS = 'ROBO' | 'HOSPITAL' | 'SISMO' | 'GENERAL';

export interface EmergenciaLocal {
  id: string;
  usuarioId: string;
  tipo: TipoEmergenciaSOS;
  detalle?: string;
  latitud: number | null;
  longitud: number | null;
  estado: EstadoEmergencia;
  fechaCreacion: string;
  sincronizada: boolean;
  publicacionRemotaId?: string | null;
}

const CLAVE_EMERGENCIAS = '@aquipe/emergencias';
const CLAVE_CONTACTO_SOS = '@aquipe/contacto_sos_v1';

async function leer(): Promise<EmergenciaLocal[]> {
  try {
    const contenido = await AsyncStorage.getItem(CLAVE_EMERGENCIAS);
    if (!contenido) return [];

    const datos: unknown = JSON.parse(contenido);
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

async function guardar(registros: EmergenciaLocal[]) {
  await AsyncStorage.setItem(CLAVE_EMERGENCIAS, JSON.stringify(registros));
}

export async function registrarEmergenciaLocal(
  usuarioId: string,
  tipo: TipoEmergenciaSOS = 'GENERAL',
  detalle?: string
): Promise<EmergenciaLocal> {
  const nueva: EmergenciaLocal = {
    id: `sos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    usuarioId,
    tipo,
    detalle,
    latitud: null,
    longitud: null,
    estado: 'PENDIENTE',
    fechaCreacion: new Date().toISOString(),
    sincronizada: false,
    publicacionRemotaId: null,
  };

  const registros = await leer();
  await guardar([nueva, ...registros]);

  return nueva;
}

export async function obtenerEmergenciasLocales() {
  return leer();
}

export async function actualizarUbicacionEmergencia(
  id: string,
  latitud: number,
  longitud: number
) {
  const registros = await leer();

  await guardar(
    registros.map((registro) =>
      registro.id === id ? { ...registro, latitud, longitud } : registro
    )
  );
}

export async function actualizarEstadoEmergencia(
  id: string,
  estado: EstadoEmergencia
) {
  const registros = await leer();

  await guardar(
    registros.map((registro) =>
      registro.id === id ? { ...registro, estado } : registro
    )
  );
}

export async function marcarEmergenciaSincronizada(
  id: string,
  publicacionRemotaId?: string
) {
  const registros = await leer();

  await guardar(
    registros.map((registro) =>
      registro.id === id
        ? {
            ...registro,
            sincronizada: true,
            estado: registro.estado === 'PENDIENTE' ? 'ENVIADA' : registro.estado,
            publicacionRemotaId: publicacionRemotaId ?? registro.publicacionRemotaId,
          }
        : registro
    )
  );
}

export async function obtenerContactoEmergencia(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(CLAVE_CONTACTO_SOS)) ?? '';
  } catch {
    return '';
  }
}

export async function guardarContactoEmergencia(telefono: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_CONTACTO_SOS, telefono.trim());
  } catch {
    /* ignorar */
  }
}
