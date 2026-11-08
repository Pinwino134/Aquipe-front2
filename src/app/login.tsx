
import { router } from 'expo-router';
import { useState } from 'react';
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

import { Api, ApiError } from '@/lib/api';
import { activarSesionOfflineEmergencia, setUsuario } from '@/lib/session';
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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const iniciar = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Ingresa tu correo y tu contraseña.');
      return;
    }
    setCargando(true);
    try {
      const usuario = await Api.login(email.trim(), password);
      setUsuario(usuario);
      router.replace('/inicio');
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        Alert.alert(
          'Sin conexión al servidor',
          'No se detectó conexión con el servidor. ¿Deseas ingresar en Modo Sin Conexión para usar el directorio local y el botón SOS?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Entrar en Modo Offline',
              onPress: () => {
                activarSesionOfflineEmergencia(
                  email.split('@')[0] || 'Vecino AquiPe'
                );
                router.replace('/inicio');
              },
            },
          ]
        );
      } else {
        mostrarError(e, 'No se pudo iniciar sesión');
      }
    } finally {
      setCargando(false);
    }
  };

  const entrarModoEmergenciaOffline = () => {
    activarSesionOfflineEmergencia();
    router.replace('/inicio');
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
              ¡Qué bueno verte de nuevo!
            </Text>

            <Text
              style={s.subtitle}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Inicia sesión y sigue conectando con tu barrio.
            </Text>
          </View>

          <View style={s.form}>
            <Text style={s.heading}>Iniciar sesión</Text>

            <Text style={s.label}>Correo electrónico</Text>

            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tucorreo@ejemplo.com"
              placeholderTextColor={C.secundario}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <Text style={s.label}>Contraseña</Text>

            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              placeholderTextColor={C.secundario}
              secureTextEntry
              autoComplete="current-password"
            />

            <Pressable
              onPress={() =>
                Alert.alert(
                  'Recuperar contraseña',
                  'La recuperación de contraseña estará disponible próximamente.'
                )
              }
              accessibilityRole="button"
            >
              <Text style={s.forgot}>
                ¿Olvidaste tu contraseña?
              </Text>
            </Pressable>

            <Pressable
              style={[s.button, cargando && { opacity: 0.7 }]}
              onPress={iniciar}
              disabled={cargando}
              accessibilityRole="button"
            >
              {cargando ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={s.buttonText}>
                  Iniciar sesión
                </Text>
              )}
            </Pressable>

            <Pressable
              style={s.offlineButton}
              onPress={entrarModoEmergenciaOffline}
              accessibilityRole="button"
            >
              <Text style={s.offlineButtonText}>
                🆘 Entrar en Modo Sin Conexión / Emergencia
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/registro')}
              style={s.register}
              accessibilityRole="button"
            >
              <Text style={s.registerText}>
                ¿No tienes cuenta?{' '}
                <Text style={s.registerLink}>
                  Regístrate
                </Text>
              </Text>
            </Pressable>
          </View>
          <Pressable
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              backgroundColor: '#FBE9E7',
              alignItems: 'center',
            }}
            onPress={() => router.push('/emergencia-offline')}
            accessibilityRole="button"
          >
            <Text style={{ color: '#D9402B', fontWeight: '800' }}>
              🆘 Modo emergencia sin conexión
            </Text>
          </Pressable>
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

  form: {
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
    height: 55,
    borderRadius: 15,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 16,
    fontSize: 15,
    color: C.texto,
    marginBottom: 18,
  },

  forgot: {
    color: C.principal,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 24,
  },

  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: C.principal,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: C.blanco,
    fontSize: 16,
    fontWeight: '800',
  },

  offlineButton: {
    marginTop: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFCC80',
    alignItems: 'center',
    justifyContent: 'center',
  },

  offlineButtonText: {
    color: '#E65100',
    fontSize: 13,
    fontWeight: '800',
  },

  register: {
    marginTop: 24,
    alignItems: 'center',
  },

  registerText: {
    fontSize: 14,
    color: C.secundario,
    textAlign: 'center',
  },

  registerLink: {
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
