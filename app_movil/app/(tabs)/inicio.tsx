import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function InicioScreen() {
  const { usuario } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.logo}>🔥</Text>
      <Text style={styles.titulo}>FireWatch QRO</Text>
      <Text style={styles.subtitulo}>Monitoreo y prevención de incendios forestales</Text>

      <Text style={styles.saludo}>
        {usuario ? `Hola, ${usuario.nombre.split(' ')[0]} 👋` : 'Bienvenido 👋'}
      </Text>

      <View style={styles.tarjetas}>
        <TouchableOpacity style={styles.tarjeta} onPress={() => router.push('/(tabs)/incendios')}>
          <Text style={styles.tarjetaIcono}>🗺️</Text>
          <Text style={styles.tarjetaTitulo}>Ver mapa</Text>
          <Text style={styles.tarjetaTexto}>Consulta incendios activos en Querétaro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tarjeta} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.tarjetaIcono}>📋</Text>
          <Text style={styles.tarjetaTitulo}>Reportar</Text>
          <Text style={styles.tarjetaTexto}>
            {usuario ? 'Envía un nuevo reporte' : 'Inicia sesión para reportar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tarjeta} onPress={() => router.push('/(tabs)/alertas')}>
          <Text style={styles.tarjetaIcono}>🔔</Text>
          <Text style={styles.tarjetaTitulo}>Alertas</Text>
          <Text style={styles.tarjetaTexto}>Revisa las alertas más recientes</Text>
        </TouchableOpacity>
      </View>

      {!usuario && (
        <TouchableOpacity style={styles.boton} onPress={() => router.push('/login')}>
          <Text style={styles.botonTexto}>Iniciar sesión</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1D33' },
  logo: { fontSize: 48, textAlign: 'center', marginTop: 12 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginTop: 4 },
  subtitulo: { fontSize: 13, color: '#9DB1C7', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  saludo: { color: '#E6EDF3', fontSize: 18, fontWeight: '600', marginBottom: 16 },
  tarjetas: { gap: 12 },
  tarjeta: {
    backgroundColor: '#122A47',
    borderWidth: 1,
    borderColor: '#1F3A5F',
    borderRadius: 14,
    padding: 16,
  },
  tarjetaIcono: { fontSize: 26, marginBottom: 6 },
  tarjetaTitulo: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  tarjetaTexto: { color: '#9DB1C7', fontSize: 13, marginTop: 2 },
  boton: {
    backgroundColor: '#FF6A3D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
