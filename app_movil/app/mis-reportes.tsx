import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ENDPOINTS } from '@/constants/api';
import { useAuth } from '@/context/AuthContext';

type Reporte = {
  id: number;
  nombre_reportante: string | null;
  municipio: string | null;
  zona: string | null;
  descripcion: string | null;
  es_critico: boolean;
  validado: boolean;
  fecha: string | null;
};

export default function MisReportesScreen() {
  const { usuario } = useAuth();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    try {
      const resp = await fetch(ENDPOINTS.reportes);
      const data: Reporte[] = await resp.json();
      const nombreCuenta = usuario.nombre.trim().toLowerCase();
      const mios = data.filter(
        (r) => (r.nombre_reportante ?? '').trim().toLowerCase() === nombreCuenta
      );
      // más recientes primero
      mios.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''));
      setReportes(mios);
    } catch (e) {
      console.error('Error cargando mis reportes:', e);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [usuario]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onRefresh = () => {
    setRefrescando(true);
    cargar();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.volver}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Mis reportes</Text>
        <View style={{ width: 60 }} />
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator color="#FF6A3D" size="large" />
        </View>
      ) : (
        <FlatList
          data={reportes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refrescando} onRefresh={onRefresh} tintColor="#FF6A3D" />
          }
          ListEmptyComponent={
            <View style={styles.centrado}>
              <Text style={styles.vacioIcono}>📋</Text>
              <Text style={styles.vacioTitulo}>Todavía no tienes reportes</Text>
              <Text style={styles.vacioTexto}>
                Los reportes que envíes con tu cuenta van a aparecer aquí.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardZona}>{item.zona ?? 'Zona sin especificar'}</Text>
                {item.es_critico && <Text style={styles.badgeCritico}>CRÍTICO</Text>}
              </View>
              {item.municipio && <Text style={styles.cardMunicipio}>{item.municipio}</Text>}
              {item.descripcion && <Text style={styles.cardDescripcion}>{item.descripcion}</Text>}
              <View style={styles.cardFooter}>
                <Text style={styles.cardFecha}>
                  {item.fecha ? new Date(item.fecha).toLocaleString('es-MX') : ''}
                </Text>
                <Text style={item.validado ? styles.validado : styles.pendiente}>
                  {item.validado ? '✓ Validado' : '⏳ Pendiente'}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1D33' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F3A5F',
  },
  volver: { color: '#FF6A3D', fontSize: 16, width: 60 },
  titulo: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  vacioIcono: { fontSize: 40, marginBottom: 10 },
  vacioTitulo: { color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  vacioTexto: { color: '#9DB1C7', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#122A47',
    borderWidth: 1,
    borderColor: '#1F3A5F',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardZona: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cardMunicipio: { color: '#9DB1C7', fontSize: 12, marginTop: 2 },
  cardDescripcion: { color: '#dde6ee', marginTop: 8, lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardFecha: { color: '#9DB1C7', fontSize: 12 },
  badgeCritico: {
    color: '#fff',
    backgroundColor: '#C7361B',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  validado: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12 },
  pendiente: { color: '#FBBF24', fontWeight: 'bold', fontSize: 12 },
});
