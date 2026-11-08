
import { useState } from 'react';
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import TarjetaPublicacion, {
    type TarjetaPublicacionProps,
} from './TarjetaPublicacion';

const ANCHO_CONTENIDO = Dimensions.get('window').width - 44;

interface Props {
  publicaciones: TarjetaPublicacionProps[];
}

export default function MisPublicaciones({ publicaciones }: Props) {
  const [paginaActual, setPaginaActual] = useState(0);

  const cambiarPagina = (event: any) => {
    const desplazamiento = event.nativeEvent.contentOffset.x;
    const pagina = Math.round(desplazamiento / ANCHO_CONTENIDO);

    setPaginaActual(pagina);
  };

  if (publicaciones.length === 0) {
    return null;
  }

  return (
    <View>
      <View style={styles.myServicesHeader}>
        <Text style={styles.sectionTitle}>Mis publicaciones</Text>

        <View style={styles.publicationCount}>
          <Text style={styles.publicationCountText}>
            {publicaciones.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={publicaciones}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        style={styles.publicationsList}
        contentContainerStyle={styles.publicationsContent}
        onMomentumScrollEnd={cambiarPagina}
        renderItem={({ item }) => (
          <View style={styles.publicationSlide}>
            <TarjetaPublicacion publicacion={item} />
          </View>
        )}
      />

      {publicaciones.length > 1 && (
        <View style={styles.pagination}>
          {publicaciones.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.paginationDot,
                paginaActual === index && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  myServicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#243746',
  },

  publicationCount: {
    backgroundColor: '#E8F2ED',
    borderRadius: 20,
    minWidth: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },

  publicationCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#146C67',
  },

  publicationsList: {
    width: '100%',
    flexGrow: 0,
  },

  publicationsContent: {
    alignItems: 'stretch',
  },

  publicationSlide: {
    width: ANCHO_CONTENIDO,
    paddingRight: 0,
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 13,
    marginBottom: 23,
  },

  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#CBD5D1',
  },

  paginationDotActive: {
    width: 20,
    backgroundColor: '#146C67',
  },
});
