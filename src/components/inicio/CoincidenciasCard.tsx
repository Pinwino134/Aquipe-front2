
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function Coincidencias() {
  return (
    <Pressable
      style={styles.matches}
      onPress={() => router.push('/coincidencias')}
      accessibilityRole="button"
      accessibilityLabel="Ver coincidencias"
    >
      <View style={styles.matchesIcon}>
        <Ionicons
          name="sparkles-outline"
          size={25}
          color="#146C67"
        />
      </View>

      <View style={styles.matchesContent}>
        <Text style={styles.matchesTitle}>
          Coincidencias
        </Text>

        <Text style={styles.matchesDesc}>
          Descubre nuevas oportunidades cerca
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={23}
        color="#146C67"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  matches: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F2ED',
    borderRadius: 18,
    padding: 15,
    gap: 12,
    marginBottom: 25,
  },

  matchesIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  matchesContent: {
    flex: 1,
  },

  matchesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#243746',
    marginBottom: 4,
  },

  matchesDesc: {
    fontSize: 11,
    color: '#526A67',
    lineHeight: 16,
  },
});
