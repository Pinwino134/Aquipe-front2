
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
    COLORES_EMERGENCIAS as C,
    type RegistroEmergencia,
} from '@/constants/emergencias';

type Props = {
  registro: RegistroEmergencia;
  onVerMapa: (registro: RegistroEmergencia) => void;
};

export default function TarjetaRegistro({
  registro,
  onVerMapa,
}: Props) {
  const esRecurso = registro.tipo === 'ofrecer';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icono}>
          <Ionicons
            name={esRecurso ? 'cube-outline' : 'alert-circle-outline'}
            size={21}
            color={C.principal}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.titulo}>
            {registro.titulo}
          </Text>

          <View style={styles.zonaFila}>
            <Ionicons
              name="location-outline"
              size={13}
              color={C.secundario}
            />

            <Text style={styles.zona}>
              {registro.zona}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.descripcion}>
        {registro.descripcion}
      </Text>

      {registro.cantidad ? (
        <View style={styles.cantidadBox}>
          <Ionicons
            name="cube-outline"
            size={14}
            color={C.principal}
          />

          <Text style={styles.cantidadTexto}>
            Disponible: {registro.cantidad}
          </Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.botonMapa,
          pressed && styles.botonPresionado,
        ]}
        onPress={() => onVerMapa(registro)}
      >
        <Ionicons
          name="map-outline"
          size={17}
          color={C.blanco}
        />

        <Text style={styles.botonMapaTexto}>
          Ver en el mapa
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.borde,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 11,
  },
  icono: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  titulo: {
    fontSize: 14,
    fontWeight: '800',
    color: C.texto,
  },
  zonaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  zona: {
    fontSize: 12,
    color: C.secundario,
  },
  descripcion: {
    fontSize: 13,
    color: C.secundario,
    lineHeight: 19,
    marginBottom: 10,
  },
  cantidadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.verdeClaro,
    padding: 10,
    borderRadius: 10,
    marginBottom: 11,
  },
  cantidadTexto: {
    fontSize: 12,
    color: C.principal,
    fontWeight: '700',
    flex: 1,
  },
  botonMapa: {
    backgroundColor: C.principal,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botonPresionado: {
    opacity: 0.8,
  },
  botonMapaTexto: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
});
