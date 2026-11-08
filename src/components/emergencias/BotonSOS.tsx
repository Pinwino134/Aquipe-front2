
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onPress: () => void;
  desactivado?: boolean;
};

export default function BotonSOS({
  onPress,
  desactivado = false,
}: Props) {
  return (
    <View style={styles.contenedor}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Activar emergencia SOS"
        disabled={desactivado}
        onPress={onPress}
        style={({ pressed }) => [
          styles.boton,
          pressed && styles.presionado,
          desactivado && styles.deshabilitado,
        ]}
      >
        <Ionicons name="alert-circle" size={54} color="#FFFFFF" />
        <Text style={styles.texto}>SOS</Text>
        <Text style={styles.subtexto}>NECESITO AYUDA</Text>
      </Pressable>

      <Text style={styles.descripcion}>
        Presiona una vez para activar una alerta de emergencia.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  boton: {
    width: 174,
    height: 174,
    borderRadius: 87,
    backgroundColor: '#C62828',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 7,
    borderColor: '#F8DADA',
    elevation: 7,
  },
  presionado: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  deshabilitado: {
    opacity: 0.6,
  },
  texto: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 1,
  },
  subtexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  descripcion: {
    color: '#526A67',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 13,
  },
});
