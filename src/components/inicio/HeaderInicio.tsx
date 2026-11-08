import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { sincronizarTodoPendiente } from '@/lib/emeregenciaService';
import { useI18n } from '@/lib/i18n';
import { useEstadoOffline } from '@/lib/offline';

interface HeaderInicioProps {
  nombreUsuario: string;
  busqueda: string;
  onChangeBusqueda: (texto: string) => void;
  onBuscar: () => void;
  onNotificaciones: () => void;
  onSoporte: () => void;
  onWhatsApp: () => void;
}

const C = Colors.light;

export default function HeaderInicio({
  nombreUsuario,
  busqueda,
  onChangeBusqueda,
  onBuscar,
  onNotificaciones,
  onSoporte,
  onWhatsApp,
}: HeaderInicioProps) {
  const { idioma, ciclarIdioma, t } = useI18n();
  const { offline, alternarSimulacion } = useEstadoOffline();

  const manejarToqueOffline = async () => {
    if (offline) {
      alternarSimulacion(false);
      const res = await sincronizarTodoPendiente();
      const total = res.sosSincronizados + res.publicacionesSincronizadas;
      if (total > 0) {
        Alert.alert(
          'Sincronización completada',
          `Se enviaron ${total} registro(s) pendientes a la red vecinal.`
        );
      }
    } else {
      alternarSimulacion(true);
      Alert.alert(
        'Modo Sin Conexión activado',
        'Ahora puedes probar la navegación en caché local y el botón SOS Offline (SMS + GPS).'
      );
    }
  };

  return (
    <View style={styles.topBar}>
      {/* Decoración */}
      <View style={styles.topBubbleLarge} />
      <View style={styles.topBubbleMedium} />
      <View style={styles.topBubbleSmall} />

      {/* Saludo y acciones en la misma fila */}
      <View style={styles.topRow}>
        <Text
          style={styles.greeting}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {t.saludo}, {nombreUsuario}
        </Text>

        <View style={styles.topActions}>
          {/* Selector de Idioma: ES / QU (Quechua) / EN */}
          <Pressable
            style={styles.langPill}
            onPress={() => ciclarIdioma()}
            accessibilityRole="button"
            accessibilityLabel="Cambiar idioma"
          >
            <Ionicons name="globe-outline" size={14} color={C.white} />
            <Text style={styles.langText}>
              {idioma.toUpperCase()}
            </Text>
          </Pressable>

          {/* Indicador / Conmutador Online-Offline */}
          <Pressable
            style={[
              styles.netPill,
              offline && styles.netPillOffline,
            ]}
            onPress={manejarToqueOffline}
            accessibilityRole="button"
            accessibilityLabel="Estado de conexión"
          >
            <Ionicons
              name={offline ? 'cloud-offline-outline' : 'wifi-outline'}
              size={14}
              color={C.white}
            />
            <Text style={styles.netText}>
              {offline ? 'Offline' : 'Online'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={onNotificaciones}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={C.white}
            />
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={onSoporte}
            accessibilityRole="button"
            accessibilityLabel="Ayuda y soporte"
          >
            <Ionicons
              name="headset-outline"
              size={21}
              color={C.white}
            />
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={onWhatsApp}
            accessibilityRole="button"
            accessibilityLabel="WhatsApp"
          >
            <Ionicons
              name="logo-whatsapp"
              size={21}
              color={C.white}
            />
          </Pressable>
        </View>
      </View>

      {/* Banner de Modo Offline activo */}
      {offline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="radio-outline" size={16} color="#FFFFFF" />
          <Text style={styles.offlineBannerText} numberOfLines={2}>
            {t.modoOfflineActivo}
          </Text>
          <Pressable
            style={styles.syncButton}
            onPress={manejarToqueOffline}
          >
            <Text style={styles.syncButtonText}>
              {t.sincronizarAhora}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={20}
          color={C.primary}
        />

        <TextInput
          style={styles.searchInput}
          placeholder={t.buscarServicio}
          placeholderTextColor="#87948F"
          value={busqueda}
          onChangeText={onChangeBusqueda}
          returnKeyType="search"
          onSubmitEditing={onBuscar}
          autoCorrect={false}
          accessibilityLabel="Buscar servicios"
        />

        {busqueda.length > 0 && (
          <Pressable
            onPress={() => onChangeBusqueda('')}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={C.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {/* El contenido claro inferior sobresale con curvas hacia abajo en los costados. */}
      <View pointerEvents="none" style={styles.panelInferiorCurvo} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 42,
    overflow: 'hidden',
  },

  panelInferiorCurvo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: '#F6F7F3',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  topBubbleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#27817A',
    right: -75,
    bottom: -105,
    opacity: 0.65,
  },

  topBubbleMedium: {
    position: 'absolute',
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: C.primaryLight,
    right: 48,
    top: -80,
    opacity: 0.12,
  },

  topBubbleSmall: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: C.primaryLight,
    right: -20,
    top: -25,
    opacity: 0.16,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 8,
  },

  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },

  langText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },

  netPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },

  netPillOffline: {
    backgroundColor: '#E65100',
  },

  netText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },

  actionButton: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  greeting: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
  },

  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E65100',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 10,
  },

  offlineBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  syncButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  syncButtonText: {
    color: '#E65100',
    fontSize: 10,
    fontWeight: '800',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 15,
    paddingHorizontal: 13,
    height: 44,
    marginTop: 12,
    gap: 9,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    height: '100%',
    paddingVertical: 0,
  },
});
