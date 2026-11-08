
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export interface TarjetaPublicacionProps {
  id: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  precio: string;
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface Props {
  publicacion: TarjetaPublicacionProps;
}

export default function TarjetaPublicacion({ publicacion }: Props) {
  return (
    <View style={styles.publicationCard}>
      <View style={styles.publicationTop}>
        <View
          style={[
            styles.publicationIcon,
            { backgroundColor: `${publicacion.color}18` },
          ]}
        >
          <Ionicons
            name={publicacion.icono}
            size={25}
            color={publicacion.color}
          />
        </View>

        <View style={styles.publicationInfo}>
          <Text style={styles.publicationCategory}>
            {publicacion.categoria}
          </Text>

          <Text style={styles.publicationTitle} numberOfLines={1}>
            {publicacion.titulo}
          </Text>

          <Text style={styles.publicationPrice}>
            {publicacion.precio}
          </Text>
        </View>
      </View>

      <Text style={styles.publicationDescription} numberOfLines={2}>
        {publicacion.descripcion}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  publicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFE7E2',
    padding: 17,
    minHeight: 130,
    justifyContent: 'center',
  },

  publicationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  publicationIcon: {
    width: 49,
    height: 49,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  publicationInfo: {
    flex: 1,
  },

  publicationCategory: {
    fontSize: 11,
    color: '#526A67',
    marginBottom: 4,
  },

  publicationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#243746',
  },

  publicationPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#146C67',
    marginTop: 3,
  },

  publicationDescription: {
    fontSize: 12,
    color: '#526A67',
    lineHeight: 18,
    marginTop: 13,
  },
});
