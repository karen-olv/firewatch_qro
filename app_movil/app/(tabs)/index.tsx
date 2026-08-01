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
} from 'react-native';
import { ENDPOINTS } from '@/constants/api';

type Reporte = {
  id: number;
  nombre_reportante: string | null;
  zona_id: number | null;
  descripcion: string | null;
  es_critico: boolean;
  validado: boolean;
  fecha: string | null;
};

export default function HomeScreen() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Formulario de nuevo reporte
  const [nombre, setNombre] = useState('');
  const [zonaId, setZonaId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);

  const obtenerReportes = async () => {
    try {
      const response = await fetch(ENDPOINTS.reportes);
      const data = await response.json();
      setReportes(data);
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      Alert.alert(
        'Error de conexión',
        `No se pudo conectar con el backend.\nVerifica que la API esté corriendo en ${ENDPOINTS.reportes}`
      );
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    obtenerReportes();
  }, []);

  const alRefrescar = () => {
    setRefrescando(true);
    obtenerReportes();
  };

  const enviarReporte = async () => {
    if (!descripcion.trim() || !zonaId.trim()) {
      Alert.alert('Faltan datos', 'La descripción y el ID de zona son obligatorios.');
      return;
    }
    setEnviando(true);
    try {
      const response = await fetch(ENDPOINTS.reportes, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_reportante: nombre.trim() || 'Anónimo',
          zona_id: Number(zonaId),
          descripcion: descripcion.trim(),
          es_critico: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'No se pudo registrar el reporte.');
        return;
      }
      Alert.alert('Reporte enviado', 'Gracias por tu reporte. Quedó registrado en la base de datos.');
      setNombre('');
      setZonaId('');
      setDescripcion('');
      obtenerReportes();
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
        <ActivityIndicator size="large" color="#ff5722" />
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
        <Text style={styles.subtitulo}>Reportes registrados en BD:</Text>

        {/* FORMULARIO NUEVO REPORTE */}
        <View style={styles.formCard}>
          <Text style={styles.formTitulo}>📢 Registrar un reporte</Text>
          <TextInput
            style={styles.input}
            placeholder="Tu nombre (opcional)"
            placeholderTextColor="#888"
            value={nombre}
            onChangeText={setNombre}
          />
          <TextInput
            style={styles.input}
            placeholder="ID de la zona (1-9)"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={zonaId}
            onChangeText={setZonaId}
          />
          <TextInput
            style={[styles.input, styles.inputArea]}
            placeholder="Describe qué viste (obligatorio)"
            placeholderTextColor="#888"
            multiline
            value={descripcion}
            onChangeText={setDescripcion}
          />
          <TouchableOpacity
            style={[styles.botonEnviar, enviando && styles.botonDesactivado]}
            onPress={enviarReporte}
            disabled={enviando}
          >
            <Text style={styles.botonEnviarTexto}>
              {enviando ? 'Enviando...' : 'Enviar reporte'}
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={reportes}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} />
          }
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay reportes en la base de datos.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Reporte #{item.id}</Text>
              <Text style={styles.cardTexto}>Descripción: {item.descripcion}</Text>
              <Text style={styles.cardInfo}>Zona ID: {item.zona_id}</Text>
              <Text style={styles.cardInfo}>Reportó: {item.nombre_reportante || 'Anónimo'}</Text>
              <Text style={item.validado ? styles.validado : styles.pendiente}>
                {item.validado ? '✅ Validado' : '⏳ Pendiente de revisión'}
              </Text>
            </View>
          )}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  textoCargando: {
    color: '#ffffff',
    marginTop: 10,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff5722',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 15,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  formTitulo: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
  },
  inputArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  botonEnviar: {
    backgroundColor: '#ff5722',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  botonDesactivado: {
    opacity: 0.6,
  },
  botonEnviarTexto: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  vacio: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff5722',
  },
  cardTitulo: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardTexto: {
    color: '#ddd',
    marginVertical: 4,
  },
  cardInfo: {
    color: '#888',
    fontSize: 12,
  },
  validado: {
    color: '#4caf50',
    marginTop: 5,
    fontWeight: 'bold',
  },
  pendiente: {
    color: '#ff9800',
    marginTop: 5,
    fontWeight: 'bold',
  },
});

