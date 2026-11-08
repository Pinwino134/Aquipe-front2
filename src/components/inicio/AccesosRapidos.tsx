import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n';

const opciones = [
  {
    key: 'servicios' as const,
    icono: 'construct' as const,
    color: '#168BE0',
    ruta: '/servicios' as const,
  },
  {
    key: 'favores' as const,
    icono: 'heart' as const,
    color: '#F05A7E',
    ruta: '/favores' as const,
  },
  {
    key: 'mapa' as const,
    icono: 'location' as const,
    color: '#18B69A',
    ruta: '/mapa' as const,
  },
  {
    key: 'emergencias' as const,
    icono: 'warning' as const,
    color: '#F28B30',
    ruta: '/emergencias' as const,
  },
] as const;

type RutaAcceso = (typeof opciones)[number]['ruta'];

interface AccesosRapidosProps {
  onSeleccionar: (ruta: RutaAcceso) => void;
}

export default function AccesosRapidos({
  onSeleccionar,
}: AccesosRapidosProps) {
  const { t } = useI18n();

  return (
    <View style={styles.quickAccess}>
      {opciones.map((item) => {
        const etiqueta = t[item.key];
        return (
          <Pressable
            key={item.key}
            style={styles.quickItem}
            onPress={() => onSeleccionar(item.ruta)}
            accessibilityRole="button"
            accessibilityLabel={etiqueta}
          >
            <View style={styles.quickIconBox}>
              <Ionicons
                name={item.icono}
                size={26}
                color={item.color}
              />
            </View>

            <Text
              style={styles.quickLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  quickAccess: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 25,
  },

  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },

  quickIconBox: {
    width: 56,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#DFE7E2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#243746',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  quickLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#243746',
    textAlign: 'center',
  },
});
