import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useI18n } from '@/lib/i18n';

const C = {
  principal: '#146C67',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
};

const tabs = [
  {
    nombre: 'Inicio' as const,
    key: 'inicio' as const,
    icono: 'home-outline' as const,
  },
  {
    nombre: 'Publicar' as const,
    key: 'publicar' as const,
    icono: 'add-circle-outline' as const,
  },
  {
    nombre: 'Tutorial' as const,
    key: 'tutorial' as const,
    icono: 'book-outline' as const,
  },
  {
    nombre: 'Perfil' as const,
    key: 'perfil' as const,
    icono: 'person-outline' as const,
  },
] as const;

export type TabNavegacion = (typeof tabs)[number]['nombre'];

interface BarraNavegacionProps {
  onSeleccionar: (nombre: TabNavegacion) => void;
}

export default function BarraNavegacion({
  onSeleccionar,
}: BarraNavegacionProps) {
  const { t } = useI18n();

  return (
    <View style={styles.navContainer}>
      <View style={styles.nav}>
        {tabs.map((tab) => {
          const activa = tab.nombre === 'Inicio';
          const etiqueta = t[tab.key];

          return (
            <Pressable
              key={tab.nombre}
              style={[
                styles.navItem,
                activa && styles.navItemActive,
              ]}
              onPress={() => onSeleccionar(tab.nombre)}
              accessibilityRole="button"
              accessibilityLabel={etiqueta}
              accessibilityState={{ selected: activa }}
            >
              <Ionicons
                name={tab.icono}
                size={24}
                color={activa ? C.blanco : C.secundario}
              />

              {activa && (
                <Text style={styles.navActiveText}>
                  {etiqueta}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    backgroundColor: '#F6F7F3',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.verdeClaro,
    borderRadius: 40,
    padding: 6,
    minHeight: 65,
    elevation: 5,
    shadowColor: C.texto,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  navItem: {
    flex: 1,
    height: 53,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  navItemActive: {
    flex: 2,
    backgroundColor: C.principal,
  },
  navActiveText: {
    fontSize: 13,
    fontWeight: '800',
    color: C.blanco,
  },
});
