import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setCargando(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🔥</Text>
        <Text style={styles.titulo}>FireWatch QRO</Text>
        <Text style={styles.subtitulo}>Monitoreo y prevención de incendios forestales</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#5C6B7A"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#5C6B7A"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.boton} onPress={onSubmit} disabled={cargando}>
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botonTexto}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.link}>
            ¿No tienes cuenta? <Text style={styles.linkBold}>Regístrate</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Recuperar contraseña',
              'Contacta a un administrador de FireWatch QRO para restablecer tu contraseña.'
            )
          }>
          <Text style={styles.linkChico}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminLink}
          onPress={() =>
            Alert.alert(
              'Acceso Protección Civil',
              'Usa el mismo formulario con tu cuenta institucional (rol admin / protección civil).'
            )
          }>
          <Text style={styles.adminTexto}>🛡️ Acceder como Protección Civil (Admin)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 24 }}>
          <Text style={styles.linkSecundario}>Seguir viendo sin iniciar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1D33' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitulo: {
    fontSize: 14,
    color: '#9DB1C7',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#122A47',
    borderWidth: 1,
    borderColor: '#1F3A5F',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    marginBottom: 14,
  },
  boton: {
    backgroundColor: '#FF6A3D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#9DB1C7', textAlign: 'center', marginTop: 20 },
  linkBold: { color: '#FF6A3D', fontWeight: 'bold' },
  linkChico: { color: '#9DB1C7', textAlign: 'center', marginTop: 10, fontSize: 13 },
  adminLink: { marginTop: 28, alignItems: 'center' },
  adminTexto: { color: '#5C6B7A', fontSize: 13 },
  linkSecundario: { color: '#5C6B7A', textAlign: 'center', textDecorationLine: 'underline' },
});
