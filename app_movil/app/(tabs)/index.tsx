import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { ENDPOINTS } from '@/constants/api';

type Zona = {
  id: number;
  nombre: string;
  municipio: string | null;
};

type Reporte = {
  id: number;
  nombre_reportante: string | null;
  descripcion: string | null;
  es_critico: boolean;
  validado: boolean;
  fecha: string | null;
  zona: string | null;
};

export default function ReportarScreen() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [esCritico, setEsCritico] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<{ zona?: string; descripcion?: string; nombre?: string }>({});

  const obtenerDatos = async () => {
    try {
      const [zonasRes, reportesRes] = await Promise.all([
        fetch(ENDPOINTS.zonas),
        fetch(ENDPOINTS.reportes),
      ]);
      const zonasData = await zonasRes.json();
      const reportesData = await reportesRes.json();
      setZonas(Array.isArray(zonasData) ? zonasData : []);
      setReportes(Array.isArray(reportesData) ? reportesData : []);
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      Alert.alert(
        'Error de conexión',
        `No se pudo conectar con el backend.\nVerifica que la API esté corriendo en ${ENDPOINTS.zonas}`
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  const alRefrescar = () => {
    setRefrescando(true);
    obtenerDatos();
  };

  const validar = (): boolean => {
    const nuevosErrores: { zona?: string; descripcion?: string; nombre?: string } = {};

    if (!zonaId) {
      nuevosErrores.zona = 'Selecciona una zona de monitoreo.';
    }
    if (!descripcion.trim()) {
      nuevosErrores.descripcion = 'La descripción es obligatoria.';
    } else if (descripcion.trim().length < 10) {
      nuevosErrores.descripcion = 'Describe con al menos 10 caracteres.';
    } else if (descripcion.trim().length > 500) {
      nuevosErrores.descripcion = 'Máximo 500 caracteres.';
    }
    if (nombre.trim() && nombre.trim().length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const enviarReporte = async () => {
    if (!validar()) return;

    setEnviando(true);
    try {
      const response = await fetch(ENDPOINTS.reportes, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_reportante: nombre.trim() || 'Anónimo',
          zona_id: Number(zonaId),
          descripcion: descripcion.trim(),
          es_critico: esCritico,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'No se pudo registrar el reporte.');
        return;
      }
      Alert.alert(
        esCritico ? '🚨 Reporte crítico enviado' : '✅ Reporte enviado',
        esCritico
          ? 'Tu reporte se envió a Protección Civil y quedó en la cola de procesamiento. Se generará una alerta automáticamente.'
          : 'Gracias por tu reporte. Quedó registrado y será visible en el panel web.'
      );
      setNombre('');
      setZonaId('');
      setDescripcion('');
      setEsCritico(false);
      setErrores({});
      obtenerDatos();
    } catch (error) {
      console.error('Error al enviar reporte:', error);
      Alert.alert('Error de conexión', 'No se pudo enviar el reporte.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6A3D" />
        <Text style={styles.textoCargando}>Conectando con el Backend...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.titulo}>🔥 FireWatch QRO</Text>
        <Text style={styles.subtitulo}>Reporta un incendio o riesgo a Protección Civil</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* FORMULARIO */}
          <View style={styles.formCard}>
            <Text style={styles.formTitulo}>📢 Nuevo reporte ciudadano</Text>

            <Text style={styles.label}>Tu nombre (opcional)</Text>
            <TextInput
              style={[styles.input, errores.nombre && styles.inputError]}
              placeholder="Ej. Juan Pérez"
              placeholderTextColor="#888"
              value={nombre}
              onChangeText={(t) => {
                setNombre(t);
                if (errores.nombre) setErrores({ ...errores, nombre: undefined });
              }}
              maxLength={150}
            />
            {errores.nombre && <Text style={styles.textoError}>{errores.nombre}</Text>}

            <Text style={styles.label}>Zona de monitoreo *</Text>
            <View style={styles.zonasWrap}>
              {zonas.length === 0 && (
                <Text style={styles.vacio}>No hay zonas disponibles.</Text>
              )}
              {zonas.map((z) => {
                const seleccionada = String(z.id) === zonaId;
                return (
                  <TouchableOpacity
                    key={z.id}
                    style={[styles.zonaChip, seleccionada && styles.zonaChipActiva]}
                    onPress={() => {
                      setZonaId(String(z.id));
                      if (errores.zona) setErrores({ ...errores, zona: undefined });
                    }}
                  >
                    <Text
                      style={[styles.zonaChipTexto, seleccionada && styles.zonaChipTextoActivo]}
                      numberOfLines={1}
                    >
                      {z.nombre}
                    </Text>
                    <Text
                      style={[styles.zonaChipMunicipio, seleccionada && styles.zonaChipTextoActivo]}
                      numberOfLines={1}
                    >
                      {z.municipio ?? ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errores.zona && <Text style={styles.textoError}>{errores.zona}</Text>}

            <Text style={styles.label}>Describe lo que viste *</Text>
            <TextInput
              style={[styles.input, styles.inputArea, errores.descripcion && styles.inputError]}
              placeholder="Ej. Se observa columna de humo en el cerro cerca de la zona..."
              placeholderTextColor="#888"
              multiline
              value={descripcion}
              onChangeText={(t) => {
                setDescripcion(t);
                if (errores.descripcion) setErrores({ ...errores, descripcion: undefined });
              }}
              maxLength={500}
            />
            <Text style={styles.contador}>{descripcion.length}/500</Text>
            {errores.descripcion && <Text style={styles.textoError}>{errores.descripcion}</Text>}

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>🚨 ¿Es crítico?</Text>
                <Text style={styles.switchHint}>
                  Genera alerta automática para Protección Civil
                </Text>
              </View>
              <Switch
                value={esCritico}
                onValueChange={setEsCritico}
                trackColor={{ false: '#444', true: '#C7361B' }}
                thumbColor={esCritico ? '#fff' : '#aaa'}
              />
            </View>

            <TouchableOpacity
              style={[styles.botonEnviar, (enviando || zonas.length === 0) && styles.botonDesactivado]}
              onPress={enviarReporte}
              disabled={enviando || zonas.length === 0}
            >
              <Text style={styles.botonEnviarTexto}>
                {enviando ? 'Enviando...' : 'Enviar reporte'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* REPORTES RECIENTES */}
          <Text style={styles.seccionTitulo}>Reportes recientes</Text>
          {reportes.length === 0 && (
            <Text style={styles.vacio}>No hay reportes en la base de datos.</Text>
          )}
          {reportes.slice(0, 10).map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitulo}>Reporte #{item.id}</Text>
                <Text
                  style={[
                    styles.badge,
                    item.es_critico ? styles.badgeCritico : styles.badgeNormal,
                  ]}
                >
                  {item.es_critico ? 'Crítico' : 'Normal'}
                </Text>
              </View>
              <Text style={styles.cardTexto}>{item.descripcion}</Text>
              <Text style={styles.cardInfo}>
                {item.zona ?? 'Zona no especificada'} · Reportó: {item.nombre_reportante || 'Anónimo'}
              </Text>
              <Text style={item.validado ? styles.validado : styles.pendiente}>
                {item.validado ? '✅ Validado · visible en web' : '⏳ Pendiente de revisión'}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#0B1D33',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B1D33',
  },
  textoCargando: { color: '#ffffff', marginTop: 10 },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6A3D',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 13,
    color: '#9DB1C7',
    marginBottom: 15,
    textAlign: 'center',
  },
  seccionTitulo: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  formCard: {
    backgroundColor: '#122A47',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F3A5F',
  },
  formTitulo: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 12,
  },
  label: {
    color: '#9DB1C7',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#0F2038',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1F3A5F',
  },
  inputArea: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#EF4444' },
  contador: {
    color: '#5C6B7A',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  textoError: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  zonasWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  zonaChip: {
    backgroundColor: '#0F2038',
    borderColor: '#1F3A5F',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '45%',
  },
  zonaChipActiva: {
    backgroundColor: '#C7361B',
    borderColor: '#C7361B',
  },
  zonaChipTexto: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  zonaChipTextoActivo: { color: '#ffffff' },
  zonaChipMunicipio: { color: '#9DB1C7', fontSize: 11, marginTop: 2 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#0F2038',
    borderRadius: 10,
    padding: 12,
  },
  switchLabel: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  switchHint: { color: '#9DB1C7', fontSize: 11, marginTop: 2 },
  botonEnviar: {
    backgroundColor: '#C7361B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  botonDesactivado: { opacity: 0.5 },
  botonEnviarTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  card: {
    backgroundColor: '#122A47',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6A3D',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitulo: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  cardTexto: { color: '#dde6ee', marginVertical: 6, lineHeight: 18 },
  cardInfo: { color: '#9DB1C7', fontSize: 12 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeCritico: { backgroundColor: '#C7361B', color: '#ffffff' },
  badgeNormal: { backgroundColor: '#1F3A5F', color: '#9DB1C7' },
  validado: { color: '#4ADE80', marginTop: 6, fontWeight: 'bold', fontSize: 12 },
  pendiente: { color: '#FBBF24', marginTop: 6, fontWeight: 'bold', fontSize: 12 },
  vacio: { color: '#9DB1C7', textAlign: 'center', marginVertical: 15 },
});

