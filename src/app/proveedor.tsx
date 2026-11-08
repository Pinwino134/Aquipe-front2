import { Ionicons } from '@expo/vector-icons';
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

import { Api } from '@/lib/api';
import { getUsuario, setUsuario } from '@/lib/session';
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

export default function Proveedor() {
  const actual = getUsuario()?.perfil_proveedor;
  const [bio, setBio] = useState(actual?.biografia ?? '');
  const [anios, setAnios] = useState(actual?.anios_experiencia?.toString() ?? '');
  const [disp, setDisp] = useState(actual?.disponibilidad ?? '');
  const [guardando, setGuardando] = useState(false);

  // Refresca el perfil por si cambió desde otro dispositivo
  useEffect(() => {
    Api.miPerfil()
      .then((u) => {
        const p = u.perfil_proveedor;
        if (p) {
          setBio(p.biografia ?? '');
          setAnios(p.anios_experiencia?.toString() ?? '');
          setDisp(p.disponibilidad ?? '');
        }
      })
      .catch(() => {});
  }, []);

  const guardar = async () => {
    const n = anios.trim() ? parseInt(anios, 10) : undefined;
    if (n !== undefined && (Number.isNaN(n) || n < 0 || n > 80)) {
      Alert.alert('Revisa el formulario', 'Los años de experiencia deben estar entre 0 y 80.');
      return;
    }
    setGuardando(true);
    try {
      await Api.guardarProveedor({
        biografia: bio.trim() || undefined,
        anios_experiencia: n,
        disponibilidad: disp.trim() || undefined,
      });
      // Mantiene la sesión local al día (conserva el token si existe)
      const u = await Api.miPerfil();
      setUsuario(u);
      Alert.alert('Perfil guardado', 'Tu perfil de proveedor ya es visible.', [
        { text: 'Listo', onPress: () => router.back() },
      ]);
    } catch (e) {
      mostrarError(e, 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Pressable style={s.back} onPress={() => router.back()} accessibilityLabel="Regresar">
            <Ionicons name="chevron-back" size={23} color={C.principal} />
          </Pressable>
          <Text style={s.title}>Perfil de proveedor</Text>
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>Biografía ({bio.length}/500)</Text>
          <TextInput style={[s.input, s.area]} value={bio} onChangeText={setBio} multiline maxLength={500}
            textAlignVertical="top" placeholder="Cuéntales a tus vecinos qué haces y por qué confiar en ti" placeholderTextColor={C.secundario} />
          <Text style={s.label}>Años de experiencia</Text>
          <TextInput style={s.input} value={anios} onChangeText={setAnios} keyboardType="number-pad" maxLength={2}
            placeholder="Ej. 5" placeholderTextColor={C.secundario} />
          <Text style={s.label}>Disponibilidad</Text>
          <TextInput style={s.input} value={disp} onChangeText={setDisp} maxLength={200}
            placeholder="Ej. Lun a Sáb, 8am – 6pm" placeholderTextColor={C.secundario} />
          <Pressable style={[s.btn, guardando && { opacity: 0.7 }]} onPress={guardar} disabled={guardando}>
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Guardar</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.fondo },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.verdeClaro, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: C.texto },
  content: { padding: 20, paddingBottom: 50 },
  label: { fontSize: 14, fontWeight: '700', color: C.texto, marginTop: 18, marginBottom: 8 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.borde, backgroundColor: C.blanco, paddingHorizontal: 14, fontSize: 15, color: C.texto },
  area: { minHeight: 110, paddingTop: 12 },
  btn: { marginTop: 28, height: 54, borderRadius: 16, backgroundColor: C.principal, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
