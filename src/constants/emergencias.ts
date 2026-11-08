
import type { Region } from 'react-native-maps';

export const COLORES_EMERGENCIAS = {
  principal: '#146C67',
  fondo: '#F6F7F3',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
  peligro: '#C62828',
};

export type AccionEmergencia = 'solicitar' | 'ofrecer';

export type VistaEmergencia = 'recursos' | 'reportes' | null;

export type UbicacionEmergencia = {
  latitude: number;
  longitude: number;
};

export type RegistroEmergencia = {
  id: string;
  tipo: AccionEmergencia;
  titulo: string;
  descripcion: string;
  zona: string;
  cantidad?: string;
  ubicacion: UbicacionEmergencia;
};

export const REGION_INICIAL_EMERGENCIAS: Region = {
  latitude: -16.3989,
  longitude: -71.535,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};
