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

export default function RegisterScreen() {
  const { registro } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const onSubmit = async () => {
    if (!nombre || nombre.trim().length < 3) {
      Alert.alert('Nombre inválido', 'Ingresa al menos 3 caracteres.');
      return;
    }
    if (!email || !email.includes('@')) {
      Alert.alert('Correo inválido', 'Ingresa un correo válido.');
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Contraseña débil', 'Debe tener al menos 8 caracteres.');
      return;
    }
    setCargando(true);
    try {
      await registro(nombre, email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Crear cuenta</Text>
        <Text style={styles.subtitulo}>Regístrate para poder enviar reportes</Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          placeholderTextColor="#5C6B7A"
          value={nombre}
          onChangeText={setNombre}
        />
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
          placeholder="Contraseña (mínimo 8 caracteres)"
          placeholderTextColor="#5C6B7A"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.boton} onPress={onSubmit} disabled={cargando}>
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.botonTexto}>Registrarme</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>
            ¿Ya tienes cuenta? <Text style={styles.linkBold}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1D33' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
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
});
