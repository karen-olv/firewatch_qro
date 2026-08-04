import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  proteccion_civil: 'Protección Civil',
  ciudadano: 'Ciudadano',
};

export default function PerfilScreen() {
  const { usuario, logout, cargando } = useAuth();

  if (cargando) return <View style={styles.container} />;

  if (!usuario) {
    return (
      <SafeAreaView style={[styles.container, styles.centrado]} edges={['top']}>
        <Text style={styles.icono}>👤</Text>
        <Text style={styles.tituloVacio}>No has iniciado sesión</Text>
        <Text style={styles.textoVacio}>
          Inicia sesión para ver tu perfil y poder enviar reportes.
        </Text>
        <TouchableOpacity style={styles.boton} onPress={() => router.push('/login')}>
          <Text style={styles.botonTexto}>Iniciar sesión</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{usuario.nombre.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.nombre}>{usuario.nombre}</Text>
        <Text style={styles.rol}>
          {ROL_LABEL[usuario.rol] ?? usuario.rol} · {usuario.email}
        </Text>
      </View>

      <View style={styles.opciones}>
        <TouchableOpacity
          style={styles.opcion}
          onPress={() => router.push('/mis-reportes')}>
          <Text style={styles.opcionTexto}>📋  Mis reportes</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.opcion}
          onPress={() => Alert.alert('Próximamente', 'Esta sección estará disponible pronto.')}>
          <Text style={styles.opcionTexto}>🔔  Configurar alertas</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.opcion, styles.opcionPeligro]}
          onPress={cerrarSesion}>
          <Text style={[styles.opcionTexto, styles.textoPeligro]}>🚪  Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1D33' },
  centrado: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  icono: { fontSize: 48, marginBottom: 12 },
  tituloVacio: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  textoVacio: { color: '#9DB1C7', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  boton: { backgroundColor: '#FF6A3D', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  header: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FF6A3D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarTexto: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  nombre: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  rol: { color: '#9DB1C7', fontSize: 13, marginTop: 4 },
  opciones: { gap: 12 },
  opcion: {
    backgroundColor: '#122A47',
    borderWidth: 1,
    borderColor: '#1F3A5F',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opcionTexto: { color: '#E6EDF3', fontSize: 15 },
  chevron: { color: '#5C6B7A', fontSize: 18 },
  opcionPeligro: { borderColor: '#EF4444', justifyContent: 'center' },
  textoPeligro: { color: '#EF4444', fontWeight: 'bold' },
});
