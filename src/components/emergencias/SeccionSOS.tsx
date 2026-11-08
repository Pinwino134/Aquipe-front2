import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  enviarSMSOfflineSOS,
  INFO_TIPO_SOS,
  llamarNumeroEmergencia,
  sincronizarEmergenciaIndividual,
  sincronizarTodoPendiente,
} from '@/lib/emeregenciaService';
import {
  actualizarEstadoEmergencia,
  actualizarUbicacionEmergencia,
  guardarContactoEmergencia,
  obtenerContactoEmergencia,
  obtenerEmergenciasLocales,
  registrarEmergenciaLocal,
  type EmergenciaLocal,
  type TipoEmergenciaSOS,
} from '@/lib/emergenciaLocal';
import { useI18n } from '@/lib/i18n';
import { useEstadoOffline } from '@/lib/offline';
import { activarSesionOfflineEmergencia, useUsuario } from '@/lib/session';

import BotonSOS from './BotonSOS';

const C = {
  principal: '#146C67',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
  peligro: '#C62828',
  peligroClaro: '#FDECEC',
  peligroBorde: '#F2C6C6',
  alerta: '#E65100',
  alertaClaro: '#FFF3E0',
};

const TIPOS_RAPIDOS: {
  id: TipoEmergenciaSOS;
  etiquetaKey: 'tipoRobo' | 'tipoHospital' | 'tipoSismo';
  icono: 'shield-outline' | 'medkit-outline' | 'warning-outline';
  numero: string;
}[] = [
  { id: 'ROBO', etiquetaKey: 'tipoRobo', icono: 'shield-outline', numero: '105' },
  { id: 'HOSPITAL', etiquetaKey: 'tipoHospital', icono: 'medkit-outline', numero: '106' },
  { id: 'SISMO', etiquetaKey: 'tipoSismo', icono: 'warning-outline', numero: '116' },
];

type Props = {
  onEmergenciaSincronizada?: () => void;
};

export default function SeccionSOS({ onEmergenciaSincronizada }: Props) {
  const usuario = useUsuario();
  const { t } = useI18n();
  const { offline } = useEstadoOffline();

  const [tipoSeleccionado, setTipoSeleccionado] =
    useState<TipoEmergenciaSOS>('ROBO');
  const [emergencia, setEmergencia] =
    useState<EmergenciaLocal | null>(null);
  const [activando, setActivando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [contactoSMS, setContactoSMS] = useState('');
  const [editandoContacto, setEditandoContacto] = useState(false);

  const cargarEmergencia = useCallback(async () => {
    try {
      const telGuardado = await obtenerContactoEmergencia();
      setContactoSMS(telGuardado);

      const registros = await obtenerEmergenciasLocales();
      const activa = registros.find((registro) =>
        ['PENDIENTE', 'ENVIADA', 'EN_ATENCION'].includes(registro.estado)
      );
      setEmergencia(activa ?? null);
      if (activa) {
        setTipoSeleccionado(activa.tipo);
      }
    } catch (error) {
      console.error('Error al recuperar SOS:', error);
    }
  }, []);

  useEffect(() => {
    cargarEmergencia();
  }, [cargarEmergencia]);

  // Si vuelve la conexión y hay una emergencia sin sincronizar, se sincroniza sola
  useEffect(() => {
    if (!offline && emergencia && !emergencia.sincronizada) {
      sincronizarEmergenciaIndividual(emergencia).then((ok) => {
        if (ok) {
          setEmergencia((prev) =>
            prev ? { ...prev, sincronizada: true, estado: 'ENVIADA' } : null
          );
          onEmergenciaSincronizada?.();
        }
      });
    }
  }, [offline, emergencia, onEmergenciaSincronizada]);

  const activarSOS = async () => {
    if (activando || emergencia) return;
    setActivando(true);

    try {
      // En una emergencia real sin internet, nunca bloqueamos al vecino si no había iniciado sesión
      const usuarioActivo = usuario ?? activarSesionOfflineEmergencia();
      const info = INFO_TIPO_SOS[tipoSeleccionado];

      // 1. Guardar instantáneamente en el dispositivo (funciona 100% offline)
      let nueva = await registrarEmergenciaLocal(
        usuarioActivo.id,
        tipoSeleccionado,
        info.mensajeBase
      );
      setEmergencia(nueva);

      // 2. Obtener coordenadas del GPS satelital (funciona sin internet)
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (permiso.granted) {
          const posicion = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await actualizarUbicacionEmergencia(
            nueva.id,
            posicion.coords.latitude,
            posicion.coords.longitude
          );
          nueva = {
            ...nueva,
            latitud: posicion.coords.latitude,
            longitud: posicion.coords.longitude,
          };
          setEmergencia(nueva);
        }
      } catch {
        /* Si el GPS tarda o está apagado, se conserva la alerta y zona del vecino */
      }

      // 3. Intentar sincronizar con el backend para alertar a los vecinos en el mapa
      const enviadoRed = await sincronizarEmergenciaIndividual(nueva);
      if (enviadoRed) {
        nueva = { ...nueva, sincronizada: true, estado: 'ENVIADA' };
        setEmergencia(nueva);
        onEmergenciaSincronizada?.();
      }
    } catch (error) {
      console.error('Error al activar SOS:', error);
      Alert.alert(
        'No se pudo registrar',
        'No se logró guardar la emergencia en el dispositivo.'
      );
    } finally {
      setActivando(false);
    }
  };

  const reintentarSincronizacion = async () => {
    if (!emergencia || sincronizando) return;
    setSincronizando(true);
    try {
      const res = await sincronizarTodoPendiente();
      if (res.sosSincronizados > 0) {
        setEmergencia((prev) =>
          prev ? { ...prev, sincronizada: true, estado: 'ENVIADA' } : null
        );
        onEmergenciaSincronizada?.();
        Alert.alert(
          '¡Alerta sincronizada!',
          'Tu alerta SOS ya es visible en el mapa comunitario de tus vecinos.'
        );
      } else {
        Alert.alert(
          'Sin conexión al servidor',
          'Seguimos sin conexión a internet. Usa el botón de Enviar SMS con GPS o Llamada directa abajo.'
        );
      }
    } finally {
      setSincronizando(false);
    }
  };

  const guardarContacto = async () => {
    await guardarContactoEmergencia(contactoSMS);
    setEditandoContacto(false);
    Alert.alert(
      'Contacto guardado',
      'Este número se usará para enviar tu ubicación GPS por SMS cuando no tengas internet.'
    );
  };

  const cancelarSOS = () => {
    if (!emergencia) return;

    Alert.alert(
      'Finalizar emergencia',
      '¿Estás fuera de peligro y deseas desactivar tu alerta SOS?',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Desactivar SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              await actualizarEstadoEmergencia(emergencia.id, 'CANCELADA');
              setEmergencia(null);
            } catch {
              Alert.alert('Error', 'No se pudo cancelar la emergencia.');
            }
          },
        },
      ]
    );
  };

  const infoActual = INFO_TIPO_SOS[emergencia?.tipo ?? tipoSeleccionado];

  return (
    <View style={styles.contenedor}>
      {/* Selector de escenario de emergencia en 1 toque */}
      <Text style={styles.selectorTitulo}>
        1. Selecciona el tipo de emergencia:
      </Text>

      <View style={styles.tiposGrid}>
        {TIPOS_RAPIDOS.map((item) => {
          const activo = (emergencia?.tipo ?? tipoSeleccionado) === item.id;
          return (
            <Pressable
              key={item.id}
              disabled={!!emergencia}
              style={[
                styles.tipoChip,
                activo && styles.tipoChipActivo,
              ]}
              onPress={() => setTipoSeleccionado(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Ionicons
                name={item.icono}
                size={22}
                color={activo ? C.blanco : C.peligro}
              />
              <Text
                style={[
                  styles.tipoTexto,
                  activo && styles.tipoTextoActivo,
                ]}
                numberOfLines={2}
              >
                {t[item.etiquetaKey]}
              </Text>
              <View
                style={[
                  styles.lineaBadge,
                  activo && styles.lineaBadgeActivo,
                ]}
              >
                <Text
                  style={[
                    styles.lineaTexto,
                    activo && styles.lineaTextoActivo,
                  ]}
                >
                  Línea {item.numero}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Botón principal SOS */}
      <BotonSOS
        onPress={activarSOS}
        desactivado={activando || !!emergencia}
      />

      {activando && (
        <Text style={styles.procesando}>
          Capturando GPS satelital y activando protocolo SOS...
        </Text>
      )}

      {/* Panel de Contacto de Emergencia Offline */}
      <View style={styles.contactoBox}>
        <View style={styles.contactoHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.principal} />
          <Text style={styles.contactoTitulo}>
            Contacto de confianza para SMS sin internet:
          </Text>
          <Pressable onPress={() => setEditandoContacto(!editandoContacto)}>
            <Text style={styles.contactoEditar}>
              {editandoContacto ? 'Cerrar' : contactoSMS ? 'Cambiar' : 'Configurar'}
            </Text>
          </Pressable>
        </View>

        {editandoContacto ? (
          <View style={styles.contactoInputRow}>
            <TextInput
              style={styles.contactoInput}
              placeholder="Ej. 999888777 (Familiar o vecino)"
              placeholderTextColor={C.secundario}
              keyboardType="phone-pad"
              value={contactoSMS}
              onChangeText={setContactoSMS}
            />
            <Pressable style={styles.contactoGuardarBtn} onPress={guardarContacto}>
              <Text style={styles.contactoGuardarTxt}>Guardar</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.contactoSub}>
            {contactoSMS
              ? `Número configurado: ${contactoSMS} (Listo para envío offline)`
              : 'Sin número fijo (podrás elegir el destinatario al abrir el SMS)'}
          </Text>
        )}
      </View>

      {/* Tarjeta de SOS Activo con acciones Offline y Online */}
      {emergencia && (
        <View style={styles.sosActivo}>
          <View style={styles.sosActivoHeader}>
            <Ionicons
              name="alert-circle"
              size={24}
              color={C.peligro}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sosActivoTitulo}>
                SOS Activo: {infoActual.titulo}
              </Text>
              <Text style={styles.sosEstadoBadge}>
                {emergencia.sincronizada
                  ? '✓ Enviada a los vecinos de tu barrio'
                  : '📡 Guardada en dispositivo (Modo Offline listo)'}
              </Text>
            </View>
          </View>

          <View style={styles.ubicacionFila}>
            <Ionicons
              name="location"
              size={17}
              color={C.principal}
            />
            <Text style={styles.ubicacionTexto}>
              {emergencia.latitud !== null && emergencia.longitud !== null
                ? `GPS Satelital capturado (${emergencia.latitud.toFixed(4)}, ${emergencia.longitud.toFixed(4)})`
                : 'Ubicación de tu zona comunitaria lista'}
            </Text>
          </View>

          {/* Acción 1: Enviar SMS con Coordenadas GPS (Funciona sin Internet) */}
          <Pressable
            style={styles.botonSMSOffline}
            onPress={() => enviarSMSOfflineSOS(emergencia, contactoSMS)}
          >
            <Ionicons name="paper-plane" size={19} color={C.blanco} />
            <View style={{ flex: 1 }}>
              <Text style={styles.botonSMSTitulo}>
                {t.enviarSMSOffline}
              </Text>
              <Text style={styles.botonSMSSub}>
                Envía tipo de urgencia + enlace de mapa GPS por red celular
              </Text>
            </View>
          </Pressable>

          {/* Acción 2: Llamada directa según el tipo de emergencia */}
          <Pressable
            style={styles.botonLlamadaDirecta}
            onPress={() => llamarNumeroEmergencia(infoActual.numeroEmergencia)}
          >
            <Ionicons name="call" size={19} color={C.blanco} />
            <Text style={styles.botonLlamadaTexto}>
              Llamar a {infoActual.entidadEmergencia}
            </Text>
          </Pressable>

          {/* Acción 3: Sincronizar con la red vecinal si estaba offline */}
          {!emergencia.sincronizada && (
            <Pressable
              style={styles.botonSincronizar}
              onPress={reintentarSincronizacion}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={C.principal} />
              <Text style={styles.botonSincronizarTexto}>
                {sincronizando
                  ? 'Sincronizando con el servidor...'
                  : 'Sincronizar alerta con el mapa vecinal'}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.cancelar}
            onPress={cancelarSOS}
          >
            <Text style={styles.cancelarTexto}>
              Ya estoy a salvo · Desactivar SOS
            </Text>
          </Pressable>
        </View>
      )}

      {/* Directorio rápido de números de emergencia (funciona siempre sin internet) */}
      <View style={styles.lineasRapidas}>
        <Text style={styles.lineasTitulo}>
          Llamada rápida sin internet:
        </Text>
        <View style={styles.lineasFila}>
          <Pressable
            style={styles.lineaBtn}
            onPress={() => llamarNumeroEmergencia('105')}
          >
            <Ionicons name="call-outline" size={15} color={C.peligro} />
            <Text style={styles.lineaBtnTxt}>105 Policía</Text>
          </Pressable>
          <Pressable
            style={styles.lineaBtn}
            onPress={() => llamarNumeroEmergencia('106')}
          >
            <Ionicons name="medkit-outline" size={15} color={C.peligro} />
            <Text style={styles.lineaBtnTxt}>106 SAMU</Text>
          </Pressable>
          <Pressable
            style={styles.lineaBtn}
            onPress={() => llamarNumeroEmergencia('116')}
          >
            <Ionicons name="flame-outline" size={15} color={C.peligro} />
            <Text style={styles.lineaBtnTxt}>116 Bomberos</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: 24,
  },

  selectorTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 10,
  },

  tiposGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },

  tipoChip: {
    flex: 1,
    backgroundColor: C.blanco,
    borderWidth: 1.5,
    borderColor: C.peligroBorde,
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },

  tipoChipActivo: {
    backgroundColor: C.peligro,
    borderColor: C.peligro,
  },

  tipoTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: C.texto,
    textAlign: 'center',
  },

  tipoTextoActivo: {
    color: C.blanco,
  },

  lineaBadge: {
    backgroundColor: C.peligroClaro,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },

  lineaBadgeActivo: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  lineaTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: C.peligro,
  },

  lineaTextoActivo: {
    color: C.blanco,
  },

  procesando: {
    textAlign: 'center',
    color: C.peligro,
    fontWeight: '700',
    fontSize: 12,
    marginTop: 6,
  },

  contactoBox: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },

  contactoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  contactoTitulo: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: C.texto,
  },

  contactoEditar: {
    fontSize: 12,
    fontWeight: '800',
    color: C.principal,
  },

  contactoSub: {
    fontSize: 11,
    color: C.secundario,
    marginTop: 5,
  },

  contactoInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },

  contactoInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingHorizontal: 11,
    fontSize: 13,
    color: C.texto,
    backgroundColor: '#F6F7F3',
  },

  contactoGuardarBtn: {
    backgroundColor: C.principal,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contactoGuardarTxt: {
    color: C.blanco,
    fontWeight: '800',
    fontSize: 12,
  },

  sosActivo: {
    backgroundColor: C.peligroClaro,
    borderWidth: 1.5,
    borderColor: C.peligroBorde,
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
  },

  sosActivoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  sosActivoTitulo: {
    fontSize: 16,
    fontWeight: '900',
    color: C.peligro,
  },

  sosEstadoBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: C.texto,
    marginTop: 2,
  },

  ubicacionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
    backgroundColor: C.blanco,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },

  ubicacionTexto: {
    fontSize: 12,
    color: C.principal,
    fontWeight: '700',
    flex: 1,
  },

  botonSMSOffline: {
    backgroundColor: C.principal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 13,
    marginTop: 12,
  },

  botonSMSTitulo: {
    color: C.blanco,
    fontWeight: '900',
    fontSize: 13,
  },

  botonSMSSub: {
    color: C.verdeClaro,
    fontSize: 11,
    marginTop: 2,
  },

  botonLlamadaDirecta: {
    backgroundColor: C.peligro,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 12,
    borderRadius: 13,
    marginTop: 9,
  },

  botonLlamadaTexto: {
    color: C.blanco,
    fontWeight: '900',
    fontSize: 14,
  },

  botonSincronizar: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.principal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 11,
    marginTop: 9,
  },

  botonSincronizarTexto: {
    color: C.principal,
    fontWeight: '800',
    fontSize: 12,
  },

  cancelar: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.peligroBorde,
    padding: 11,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 10,
  },

  cancelarTexto: {
    color: C.peligro,
    fontWeight: '800',
    fontSize: 12,
  },

  lineasRapidas: {
    marginTop: 14,
    backgroundColor: C.blanco,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.borde,
  },

  lineasTitulo: {
    fontSize: 12,
    fontWeight: '800',
    color: C.secundario,
    marginBottom: 8,
  },

  lineasFila: {
    flexDirection: 'row',
    gap: 8,
  },

  lineaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: C.peligroClaro,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.peligroBorde,
  },

  lineaBtnTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: C.peligro,
  },
});
