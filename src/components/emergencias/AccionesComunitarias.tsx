
import { Ionicons } from '@expo/vector-icons';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type Props = {
  onSolicitar: () => void;
  onOfrecer: () => void;
};

const C = {
  principal: '#146C67',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  verdeClaro: '#E8F2ED',
  borde: '#DFE7E2',
};

export default function AccionesComunitarias({
  onSolicitar,
  onOfrecer,
}: Props) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>
        ¿Qué deseas hacer?
      </Text>

      <View style={styles.acciones}>
        <Pressable
          style={({ pressed }) => [
            styles.tarjeta,
            pressed && styles.presionado,
          ]}
          onPress={onSolicitar}
        >
          <View style={styles.icono}>
            <Ionicons
              name="hand-left-outline"
              size={29}
              color={C.principal}
            />
          </View>

          <Text style={styles.nombre}>
            Solicitar ayuda
          </Text>

          <Text style={styles.descripcion}>
            Registra una necesidad y su ubicación.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.tarjeta,
            pressed && styles.presionado,
          ]}
          onPress={onOfrecer}
        >
          <View style={styles.icono}>
            <Ionicons
              name="cube-outline"
              size={29}
              color={C.principal}
            />
          </View>

          <Text style={styles.nombre}>
            Ofrecer recurso
          </Text>

          <Text style={styles.descripcion}>
            Comparte recursos disponibles con tus vecinos.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: 25,
  },

  titulo: {
    fontSize: 17,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 13,
  },

  acciones: {
    flexDirection: 'row',
    gap: 10,
  },

  tarjeta: {
    flex: 1,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 21,
    borderWidth: 1,
    borderColor: C.borde,
  },

  presionado: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },

  icono: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  nombre: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
    textAlign: 'center',
  },

  descripcion: {
    fontSize: 11,
    color: C.secundario,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
});
