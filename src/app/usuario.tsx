import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Api, type Resena, type UsuarioPublico } from '@/lib/api';
import { getUsuario } from '@/lib/session';
import { mostrarError, tiempoRelativo } from '@/lib/ui';

const C = {
  principal: '#146C67',
  fondo: '#F6F7F3',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
};

const Estrellas = ({ valor, size = 16 }: { valor: number; size?: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Ionicons
        key={n}
        name={valor >= n ? 'star' : valor >= n - 0.5 ? 'star-half' : 'star-outline'}
        size={size}
        color="#F2B01E"
      />
    ))}
  </View>
);

export default function Usuario() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const yo = getUsuario()?.id;
  const id = idParam === 'yo' ? yo : idParam;
  const esMio = !!id && id === yo;

  const [u, setU] = useState<UsuarioPublico | null>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      Promise.all([Api.usuario(id), Api.resenasDeUsuario(id, 50)])
        .then(([usr, res]) => {
          setU(usr);
          setResenas(res);
        })
        .catch((e) => mostrarError(e, 'No se pudo cargar el perfil'))
        .finally(() => setCargando(false));
    }, [id])
  );

  const tel = u?.telefono?.replace(/[^\d+]/g, '');
  const prov = u?.perfil_proveedor;

  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()} accessibilityLabel="Regresar">
          <Ionicons name="chevron-back" size={23} color={C.principal} />
        </Pressable>
        <Text style={s.title}>{esMio ? 'Mi perfil público' : 'Perfil'}</Text>
      </View>

      {cargando || !u ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.principal} />
      ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{u.nombre_completo.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={s.nombre}>
              {u.nombre_completo}
              {prov?.verificado ? '  ✔' : ''}
            </Text>
            {u.zona && <Text style={s.meta}>{u.zona.nombre}, {u.zona.distrito}</Text>}
            <View style={s.ratingFila}>
              <Estrellas valor={u.calificacion_promedio} size={20} />
              <Text style={s.ratingTxt}>
                {u.total_resenas > 0
                  ? `${u.calificacion_promedio.toFixed(1)} · ${u.total_resenas} ${u.total_resenas === 1 ? 'reseña' : 'reseñas'}`
                  : 'Aún sin reseñas'}
              </Text>
            </View>
          </View>

          {prov && (prov.biografia || prov.disponibilidad || prov.anios_experiencia != null) && (
            <View style={s.card2}>
              <Text style={s.seccion}>Sobre el profesional</Text>
              {prov.biografia ? <Text style={s.texto}>{prov.biografia}</Text> : null}
              {prov.anios_experiencia != null && (
                <Text style={s.meta}>🛠 {prov.anios_experiencia} años de experiencia</Text>
              )}
              {prov.disponibilidad ? <Text style={s.meta}>🕒 {prov.disponibilidad}</Text> : null}
            </View>
          )}

          {esMio ? (
            <Pressable style={s.btn} onPress={() => router.push('/proveedor')}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={s.btnTxt}>Editar mi perfil de proveedor</Text>
            </Pressable>
          ) : tel ? (
            <View style={s.fila}>
              <Pressable style={[s.btn, { flex: 1 }]} onPress={() => Linking.openURL(`tel:${tel}`)}>
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={s.btnTxt}>Llamar</Text>
              </Pressable>
              <Pressable
                style={[s.btn, { flex: 1, backgroundColor: '#25A55F' }]}
                onPress={() => Linking.openURL(`https://wa.me/${tel.replace('+', '')}`)}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={s.btnTxt}>WhatsApp</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={s.nota}>Este usuario no comparte su teléfono. Envíale una solicitud desde su anuncio.</Text>
          )}

          <Text style={s.seccion}>Reseñas</Text>
          {resenas.length === 0 ? (
            <Text style={s.nota}>
              Las reseñas aparecen cuando se completa un acuerdo. Puedes calificar desde Actividad → Acuerdos.
            </Text>
          ) : (
            resenas.map((r) => (
              <View key={r.id} style={s.resena}>
                <View style={s.fila}>
                  <Text style={[s.nombreRes, { flex: 1 }]}>{r.autor.nombre_completo}</Text>
                  <Estrellas valor={r.calificacion} size={14} />
                </View>
                {r.comentario ? <Text style={s.texto}>{r.comentario}</Text> : null}
                <Text style={s.meta}>{tiempoRelativo(r.created_at)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.fondo },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.verdeClaro, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: C.texto },
  content: { padding: 20, paddingBottom: 60, gap: 14 },
  card: { backgroundColor: C.blanco, borderRadius: 20, borderWidth: 1, borderColor: C.borde, padding: 20, alignItems: 'center', gap: 6 },
  card2: { backgroundColor: C.blanco, borderRadius: 18, borderWidth: 1, borderColor: C.borde, padding: 16, gap: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.verdeClaro, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 30, fontWeight: '800', color: C.principal },
  nombre: { fontSize: 20, fontWeight: '800', color: C.texto, textAlign: 'center' },
  ratingFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  ratingTxt: { fontSize: 14, fontWeight: '700', color: C.texto },
  seccion: { fontSize: 16, fontWeight: '800', color: C.texto },
  texto: { fontSize: 14, color: C.texto },
  meta: { fontSize: 13, color: C.secundario },
  nota: { fontSize: 13, color: C.secundario, textAlign: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 15, backgroundColor: C.principal },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  resena: { backgroundColor: C.blanco, borderRadius: 16, borderWidth: 1, borderColor: C.borde, padding: 14, gap: 5 },
  nombreRes: { fontSize: 14, fontWeight: '700', color: C.texto },
});
