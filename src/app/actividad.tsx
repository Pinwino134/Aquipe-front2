import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Api,
  type Acuerdo,
  type EstadoAcuerdo,
  type Publicacion,
  type Respuesta,
  type RespuestaMia,
} from '@/lib/api';
import { getUsuario } from '@/lib/session';
import { ESTADO_TEXTO, mostrarError, tiempoRelativo } from '@/lib/ui';

const C = {
  principal: '#146C67',
  fondo: '#F6F7F3',
  verdeClaro: '#E8F2ED',
  texto: '#243746',
  secundario: '#526A67',
  blanco: '#FFFFFF',
  borde: '#DFE7E2',
  rojo: '#C0392B',
};

type Pestana = 'recibidas' | 'enviadas' | 'acuerdos' | 'mias';
type RecibidaItem = { pub: Publicacion; respuestas: Respuesta[] };
type Dialogo =
  | { modo: 'cancelar'; acuerdo: Acuerdo }
  | { modo: 'resena'; acuerdo: Acuerdo }
  | null;

const TABS: { id: Pestana; t: string }[] = [
  { id: 'recibidas', t: 'Recibidas' },
  { id: 'enviadas', t: 'Enviadas' },
  { id: 'acuerdos', t: 'Acuerdos' },
  { id: 'mias', t: 'Mis anuncios' },
];

export default function Actividad() {
  const [tab, setTab] = useState<Pestana>('recibidas');
  const [recibidas, setRecibidas] = useState<RecibidaItem[]>([]);
  const [enviadas, setEnviadas] = useState<RespuestaMia[]>([]);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);
  const [mias, setMias] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [motivo, setMotivo] = useState('');
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [pubs, env, acu] = await Promise.all([
        Api.misPublicaciones(),
        Api.misRespuestas(),
        Api.misAcuerdos(),
      ]);
      setMias(pubs);
      setEnviadas(env);
      setAcuerdos(acu);
      // Respuestas solo de anuncios que aún pueden recibirlas
      const abiertas = pubs.filter((p) => p.estado === 'ABIERTA' || p.estado === 'PAUSADA');
      const rec = await Promise.all(
        abiertas.map(async (pub) => ({
          pub,
          respuestas: (await Api.respuestasDePublicacion(pub.id).catch(() => [])).filter(
            (r) => r.estado === 'ENVIADA'
          ),
        }))
      );
      setRecibidas(rec.filter((r) => r.respuestas.length > 0));
    } catch (e) {
      mostrarError(e, 'No se pudo cargar tu actividad');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const ejecutar = async (clave: string, fn: () => Promise<unknown>, ok?: string) => {
    if (ocupado) return;
    setOcupado(clave);
    try {
      await fn();
      if (ok) Alert.alert(ok);
      await cargar();
    } catch (e) {
      mostrarError(e);
    } finally {
      setOcupado(null);
    }
  };

  const cambiarEstado = (a: Acuerdo, estado: EstadoAcuerdo, m?: string) =>
    ejecutar(a.id, () => Api.cambiarEstadoAcuerdo(a.id, estado, m));

  const confirmarDialogo = async () => {
    if (!dialogo) return;
    const { modo, acuerdo } = dialogo;
    setDialogo(null);
    if (modo === 'cancelar') {
      await cambiarEstado(acuerdo, 'CANCELADO', motivo.trim() || undefined);
    } else {
      await ejecutar(
        acuerdo.id,
        () => Api.resenar(acuerdo.id, estrellas, comentario.trim() || undefined),
        '¡Gracias por tu reseña!'
      );
    }
    setMotivo('');
    setComentario('');
    setEstrellas(5);
  };

  const yo = getUsuario()?.id;
  const otro = (a: Acuerdo) => (a.solicitante.id === yo ? a.proveedor : a.solicitante);

  const Boton = ({
    t,
    onPress,
    peligro,
    suave,
    clave,
  }: {
    t: string;
    onPress: () => void;
    peligro?: boolean;
    suave?: boolean;
    clave: string;
  }) => (
    <Pressable
      style={[s.btn, suave && s.btnSuave, peligro && s.btnPeligro, ocupado === clave && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={!!ocupado}
    >
      <Text style={[s.btnTxt, suave && { color: C.principal }, peligro && { color: C.rojo }]}>{t}</Text>
    </Pressable>
  );

  const vacio = (t: string) => (
    <View style={s.vacio}>
      <Ionicons name="file-tray-outline" size={40} color={C.secundario} />
      <Text style={s.vacioTxt}>{t}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()} accessibilityLabel="Regresar">
          <Ionicons name="chevron-back" size={23} color={C.principal} />
        </Pressable>
        <Text style={[s.title, { flex: 1 }]}>Mi actividad</Text>
        <Pressable
          style={s.back}
          onPress={() => router.push({ pathname: '/usuario', params: { id: 'yo' } })}
          accessibilityLabel="Mi perfil público y reseñas"
        >
          <Ionicons name="person-circle-outline" size={24} color={C.principal} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsBox} contentContainerStyle={s.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.id} style={[s.tab, tab === t.id && s.tabOn]} onPress={() => setTab(t.id)}>
            <Text style={[s.tabTxt, tab === t.id && { color: C.blanco }]}>{t.t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.principal} />
      ) : (
        <ScrollView
          contentContainerStyle={s.lista}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
        >
          {tab === 'recibidas' &&
            (recibidas.length === 0
              ? vacio('Nadie ha respondido a tus anuncios todavía.')
              : recibidas.map(({ pub, respuestas }) => (
                  <View key={pub.id} style={s.card}>
                    <Text style={s.cardTitulo} onPress={() => router.push({ pathname: '/publicacion', params: { id: pub.id } })}>{pub.titulo}</Text>
                    {respuestas.map((r) => (
                      <View key={r.id} style={s.sub}>
                        <Text
                          style={[s.nombre, { color: C.principal }]}
                          onPress={() => router.push({ pathname: '/usuario', params: { id: r.usuario.id } })}
                        >
                          {r.usuario.nombre_completo} · ★ {r.usuario.calificacion_promedio.toFixed(1)} ({r.usuario.total_resenas}) ›
                        </Text>
                        <Text style={s.texto}>{r.mensaje}</Text>
                        {r.precio_propuesto != null && (
                          <Text style={s.precio}>Propone S/ {r.precio_propuesto}</Text>
                        )}
                        <Text style={s.meta}>{tiempoRelativo(r.created_at)}</Text>
                        <View style={s.fila}>
                          <Boton
                            clave={r.id}
                            t="Aceptar"
                            onPress={() =>
                              ejecutar(r.id, () => Api.aceptarRespuesta(r.id), 'Acuerdo creado. Lo verás en “Acuerdos”.')
                            }
                          />
                          <Boton
                            clave={r.id}
                            t="Rechazar"
                            suave
                            onPress={() => ejecutar(r.id, () => Api.rechazarRespuesta(r.id))}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )))}

          {tab === 'enviadas' &&
            (enviadas.length === 0
              ? vacio('Aún no has respondido a ningún anuncio.')
              : enviadas.map((r) => (
                  <View key={r.id} style={s.card}>
                    <Text style={s.cardTitulo} onPress={() => router.push({ pathname: '/publicacion', params: { id: r.publicacion.id } })}>{r.publicacion.titulo}</Text>
                    <Text style={s.texto}>{r.mensaje}</Text>
                    {r.precio_propuesto != null && <Text style={s.precio}>S/ {r.precio_propuesto}</Text>}
                    <Text style={s.meta}>
                      {r.estado} · {tiempoRelativo(r.created_at)}
                    </Text>
                    {r.estado === 'ENVIADA' && (
                      <View style={s.fila}>
                        <Boton
                          clave={r.id}
                          t="Retirar"
                          peligro
                          suave
                          onPress={() => ejecutar(r.id, () => Api.retirarRespuesta(r.id))}
                        />
                      </View>
                    )}
                  </View>
                )))}

          {tab === 'acuerdos' &&
            (acuerdos.length === 0
              ? vacio('Cuando aceptes o te acepten una propuesta, aparecerá aquí.')
              : acuerdos.map((a) => (
                  <View key={a.id} style={s.card}>
                    <Text style={s.cardTitulo} onPress={() => router.push({ pathname: '/publicacion', params: { id: a.publicacion.id } })}>{a.publicacion.titulo}</Text>
                    <Text
                      style={[s.texto, { color: C.principal, fontWeight: '700' }]}
                      onPress={() => router.push({ pathname: '/usuario', params: { id: otro(a).id } })}
                    >
                      Con {otro(a).nombre_completo} ›
                    </Text>
                    {a.precio_acordado != null && <Text style={s.precio}>S/ {a.precio_acordado}</Text>}
                    <Text style={s.meta}>
                      {a.estado.replace('_', ' ')}
                      {a.motivo_cancelacion ? ` · ${a.motivo_cancelacion}` : ''}
                    </Text>
                    <View style={s.fila}>
                      {a.estado === 'PROGRAMADO' && (
                        <Boton clave={a.id} t="Iniciar" onPress={() => cambiarEstado(a, 'EN_CURSO')} />
                      )}
                      {(a.estado === 'PROGRAMADO' || a.estado === 'EN_CURSO') && (
                        <>
                          <Boton clave={a.id} t="Completar" onPress={() => cambiarEstado(a, 'COMPLETADO')} />
                          <Boton
                            clave={a.id}
                            t="Cancelar"
                            peligro
                            suave
                            onPress={() => setDialogo({ modo: 'cancelar', acuerdo: a })}
                          />
                        </>
                      )}
                      {a.estado === 'COMPLETADO' && (
                        <Boton
                          clave={a.id}
                          t="Dejar reseña"
                          onPress={() => setDialogo({ modo: 'resena', acuerdo: a })}
                        />
                      )}
                    </View>
                  </View>
                )))}

          {tab === 'mias' &&
            (mias.length === 0
              ? vacio('No has publicado nada todavía.')
              : mias.map((p) => (
                  <View key={p.id} style={s.card}>
                    <Text style={s.cardTitulo} onPress={() => router.push({ pathname: '/publicacion', params: { id: p.id } })}>{p.titulo}</Text>
                    <Text style={s.meta}>
                      {p.tipo} · {ESTADO_TEXTO[p.estado] ?? p.estado}
                    </Text>
                    {(p.estado === 'ABIERTA' || p.estado === 'PAUSADA') && (
                      <View style={s.fila}>
                        <Boton
                          clave={p.id}
                          t={p.estado === 'ABIERTA' ? 'Pausar' : 'Reactivar'}
                          onPress={() =>
                            ejecutar(p.id, () =>
                              Api.editarPublicacion(p.id, {
                                estado: p.estado === 'ABIERTA' ? 'PAUSADA' : 'ABIERTA',
                              })
                            )
                          }
                        />
                        <Boton
                          clave={p.id}
                          t="Cancelar anuncio"
                          peligro
                          suave
                          onPress={() =>
                            Alert.alert('Cancelar anuncio', '¿Seguro? Dejará de ser visible.', [
                              { text: 'No' },
                              {
                                text: 'Sí, cancelar',
                                style: 'destructive',
                                onPress: () =>
                                  ejecutar(p.id, () => Api.editarPublicacion(p.id, { estado: 'CANCELADA' })),
                              },
                            ])
                          }
                        />
                      </View>
                    )}
                  </View>
                )))}
        </ScrollView>
      )}

      <Modal visible={!!dialogo} transparent animationType="fade" onRequestClose={() => setDialogo(null)}>
        <View style={s.overlay}>
          <View style={s.dialogo}>
            {dialogo?.modo === 'cancelar' ? (
              <>
                <Text style={s.cardTitulo}>Cancelar acuerdo</Text>
                <TextInput
                  style={s.input}
                  placeholder="Motivo (opcional)"
                  placeholderTextColor={C.secundario}
                  value={motivo}
                  onChangeText={setMotivo}
                  maxLength={300}
                  multiline
                />
              </>
            ) : (
              <>
                <Text style={s.cardTitulo}>
                  Reseña a {dialogo ? otro(dialogo.acuerdo).nombre_completo : ''}
                </Text>
                <View style={s.estrellas}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setEstrellas(n)} hitSlop={6}>
                      <Ionicons
                        name={n <= estrellas ? 'star' : 'star-outline'}
                        size={34}
                        color="#F2B01E"
                      />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={s.input}
                  placeholder="Comentario (opcional)"
                  placeholderTextColor={C.secundario}
                  value={comentario}
                  onChangeText={setComentario}
                  maxLength={500}
                  multiline
                />
              </>
            )}
            <View style={s.fila}>
              <Boton clave="dlg" t="Confirmar" onPress={confirmarDialogo} />
              <Boton clave="dlg" t="Volver" suave onPress={() => setDialogo(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.fondo },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  back: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.verdeClaro, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: C.texto },
  tabsBox: { flexGrow: 0 },
  tabs: { paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: C.borde, backgroundColor: C.blanco },
  tabOn: { backgroundColor: C.principal, borderColor: C.principal },
  tabTxt: { fontSize: 14, fontWeight: '700', color: C.texto },
  lista: { padding: 20, paddingBottom: 60, gap: 14 },
  card: { backgroundColor: C.blanco, borderRadius: 18, borderWidth: 1, borderColor: C.borde, padding: 16, gap: 6 },
  cardTitulo: { fontSize: 16, fontWeight: '800', color: C.texto },
  sub: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borde, gap: 4 },
  nombre: { fontSize: 14, fontWeight: '700', color: C.texto },
  texto: { fontSize: 14, color: C.texto },
  precio: { fontSize: 14, fontWeight: '800', color: C.principal },
  meta: { fontSize: 12, color: C.secundario },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  btn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: C.principal },
  btnSuave: { backgroundColor: C.verdeClaro },
  btnPeligro: { backgroundColor: '#FBE9E7' },
  btnTxt: { color: C.blanco, fontWeight: '700', fontSize: 13 },
  vacio: { alignItems: 'center', gap: 10, marginTop: 50 },
  vacioTxt: { color: C.secundario, textAlign: 'center', fontSize: 14 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  dialogo: { backgroundColor: C.blanco, borderRadius: 20, padding: 20, gap: 12 },
  input: { minHeight: 70, borderRadius: 14, borderWidth: 1, borderColor: C.borde, padding: 12, fontSize: 15, color: C.texto, textAlignVertical: 'top' },
  estrellas: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
