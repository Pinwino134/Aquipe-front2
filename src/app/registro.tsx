
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Api, type Zona } from '@/lib/api';
import { setUsuario } from '@/lib/session';
import { mostrarError } from '@/lib/ui';

const C = {
  principal: '#146C67',
  fondo: '#F6F7F3',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
};

export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [zonaId, setZonaId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    Api.zonas().then(setZonas).catch(() => setZonas([]));
  }, []);

  const crearCuenta = async () => {
    if (!nombre.trim() || !correo.trim() || !telefono.trim() || !contrasena) {
      Alert.alert('Campos incompletos', 'Completa todos los datos.');
      return;
    }
    if (contrasena.length < 6) {
      Alert.alert('Contraseña muy corta', 'Usa al menos 6 caracteres.');
      return;
    }
    setCargando(true);
    try {
      const usuario = await Api.registro({
        nombre_completo: nombre.trim(),
        correo: correo.trim(),
        telefono: telefono.trim(),
        password: contrasena,
        zona_id: zonaId,
      });
      setUsuario(usuario);
      router.replace('/inicio');
    } catch (e) {
      mostrarError(e, 'No se pudo crear la cuenta');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={s.page}>
      <View style={s.bottomDecorations} pointerEvents="none">
        <View style={s.bottomCircleLarge} />
        <View style={s.bottomCircleMedium} />
        <View style={s.bottomCircleSmall} />
        <View style={s.bottomCircleAccent} />
      </View>

      <KeyboardAvoidingView
        style={s.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.top}>
            <View style={s.circle} />
            <View style={s.circleSmall} />
            <View style={s.circleExtra} />

            <Text style={s.kicker}>AQUIPE</Text>

            <Text
              style={s.title}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Únete a AquiPe
            </Text>

            <Text style={s.subtitle}>
              Tu comunidad empieza aquí.
            </Text>
          </View>

          <View style={s.card}>
            <Text style={s.heading}>Crear cuenta</Text>

            <Text style={s.label}>Nombre completo</Text>
            <TextInput
              style={s.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor={C.secundario}
              autoCapitalize="words"
              autoComplete="name"
            />

            <Text style={s.label}>Correo electrónico</Text>
            <TextInput
              style={s.input}
              value={correo}
              onChangeText={setCorreo}
              placeholder="tucorreo@ejemplo.com"
              placeholderTextColor={C.secundario}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <Text style={s.label}>Teléfono</Text>
            <TextInput
              style={s.input}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Tu teléfono"
              placeholderTextColor={C.secundario}
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            <Text style={s.label}>Contraseña</Text>
            <TextInput
              style={s.input}
              value={contrasena}
              onChangeText={setContrasena}
              placeholder="Tu contraseña"
              placeholderTextColor={C.secundario}
              secureTextEntry
              autoComplete="new-password"
            />

            {zonas.length > 0 && (
              <>
                <Text style={s.label}>Tu zona</Text>
                <View style={s.zonaFila}>
                  {zonas.map((z) => {
                    const activa = zonaId === z.id;
                    return (
                      <Pressable
                        key={z.id}
                        style={[s.zonaChip, activa && s.zonaChipActiva]}
                        onPress={() => setZonaId(activa ? null : z.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activa }}
                      >
                        <Text style={[s.zonaTexto, activa && s.zonaTextoActivo]}>
                          {z.nombre}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Pressable
              style={[s.button, cargando && { opacity: 0.7 }]}
              onPress={crearCuenta}
              disabled={cargando}
              accessibilityRole="button"
            >
              {cargando ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={s.buttonText}>Continuar</Text>
              )}
            </Pressable>

            <Pressable
              style={s.loginLinkContainer}
              onPress={() => router.push('/login')}
              accessibilityRole="button"
            >
              <Text style={s.loginText}>
                ¿Ya tienes cuenta?{' '}
                <Text style={s.loginLink}>
                  Inicia sesión
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.fondo,
    position: 'relative',
  },

  keyboardContainer: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingBottom: 35,
  },

  top: {
    backgroundColor: C.principal,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 75,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    overflow: 'hidden',
    alignItems: 'center',
  },

  circle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: C.verdeClaro,
    opacity: 0.12,
    right: -85,
    top: -70,
  },

  circleSmall: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.verdeClaro,
    opacity: 0.2,
    right: 20,
    bottom: -45,
  },

  circleExtra: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: C.verdeClaro,
    opacity: 0.12,
    left: -30,
    bottom: 5,
  },

  kicker: {
    color: C.verdeClaro,
    letterSpacing: 2,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 30,
    textAlign: 'center',
  },

  title: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '900',
    color: C.blanco,
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
    width: '100%',
  },

  subtitle: {
    color: C.verdeClaro,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    textAlign: 'center',
    width: '100%',
  },

  card: {
    backgroundColor: C.blanco,
    marginHorizontal: 18,
    marginTop: -43,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 28,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: C.borde,
    elevation: 5,
    shadowColor: C.texto,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 22,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 9,
  },

  input: {
    height: 54,
    borderRadius: 15,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 16,
    fontSize: 15,
    color: C.texto,
    marginBottom: 18,
  },

  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: C.principal,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: C.principal,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },

  buttonText: {
    fontSize: 16,
    color: C.blanco,
    fontWeight: '800',
  },

  zonaFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },

  zonaChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: C.borde,
  },

  zonaChipActiva: {
    backgroundColor: C.principal,
    borderColor: C.principal,
  },

  zonaTexto: {
    color: C.principal,
    fontWeight: '700',
    fontSize: 14,
  },

  zonaTextoActivo: {
    color: C.blanco,
  },

  loginLinkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },

  loginText: {
    fontSize: 14,
    color: C.secundario,
    textAlign: 'center',
  },

  loginLink: {
    color: C.principal,
    fontWeight: '800',
  },

  bottomDecorations: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },

  bottomCircleLarge: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: C.verdeClaro,
    right: -100,
    bottom: -100,
  },

  bottomCircleMedium: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: C.principal,
    opacity: 0.12,
    right: -70,
    bottom: -65,
  },

  bottomCircleSmall: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.verdeClaro,
    right: 135,
    bottom: 25,
  },

  bottomCircleAccent: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: C.principal,
    opacity: 0.1,
    right: 105,
    bottom: 110,
  },
});
