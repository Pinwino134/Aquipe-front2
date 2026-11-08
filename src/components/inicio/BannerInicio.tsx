
import { StyleSheet, Text, View } from 'react-native';

const C = {
  principal: '#146C67',
  verdeClaro: '#E8F2ED',
  blanco: '#FFFFFF',
};

export default function BannerInicio() {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerCircle} />

      <Text style={styles.bannerSmall}>
        AQUIPE CERCA DE TI
      </Text>

      <Text
        style={styles.bannerTitle}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        Tu barrio, tu mejor apoyo.
      </Text>

      <Text style={styles.bannerSubtitle}>
        Comparte, conecta y crece con tus vecinos.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: C.principal,
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingVertical: 22,
    overflow: 'hidden',
  },
  bannerCircle: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 90,
    backgroundColor: '#27817A',
    right: -65,
    top: -50,
  },
  bannerSmall: {
    color: C.verdeClaro,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  bannerTitle: {
    color: C.blanco,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
    marginTop: 12,
  },
  bannerSubtitle: {
    color: C.blanco,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    flexShrink: 1,
  },
});
