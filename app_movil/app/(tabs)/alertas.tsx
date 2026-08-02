import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { ENDPOINTS } from '@/constants/api';

type Alerta = {
    id: number;
    zona: string | null;
    municipio: string | null;
    nivel: string;
    descripcion: string | null;
    enviada_a: string | null;
    fecha: string | null;
};

const nivelColor: Record<string, string> = {
    alto: '#EF4444',
    medio: '#FBBF24',
    bajo: '#4ADE80',
};

export default function AlertasScreen() {
    const [alertas, setAlertas] = useState<Alerta[]>([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);

    const obtenerAlertas = async () => {
        try {
            const response = await fetch(ENDPOINTS.alertas);
            const data = await response.json();
            setAlertas(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error al obtener alertas:', error);
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    };

    useEffect(() => {
        obtenerAlertas();
    }, []);

    const alRefrescar = () => {
        setRefrescando(true);
        obtenerAlertas();
    };

    if (cargando) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF6A3D" />
                <Text style={styles.textoCargando}>Cargando alertas...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>🚨 Alertas de Protección Civil</Text>
            <Text style={styles.subtitulo}>
                Alertas activas y notificaciones a autoridades locales
            </Text>

            <FlatList
                data={alertas}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} />
                }
                ListEmptyComponent={
                    <Text style={styles.vacio}>No hay alertas por ahora.</Text>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardTop}>
                            <Text style={styles.cardTitulo}>
                                {item.zona ?? 'Zona desconocida'} — {item.municipio ?? ''}
                            </Text>
                            <View
                                style={[
                                    styles.badgeNivel,
                                    { backgroundColor: nivelColor[item.nivel] ?? '#888' },
                                ]}
                            >
                                <Text style={styles.badgeNivelTexto}>
                                    {item.nivel.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        {item.descripcion ? (
                            <Text style={styles.cardTexto}>{item.descripcion}</Text>
                        ) : null}
                        <Text style={styles.cardInfo}>
                            Enviada a: {item.enviada_a ?? 'Autoridades'}
                        </Text>
                        <Text style={styles.cardFecha}>
                            {item.fecha ? new Date(item.fecha).toLocaleString('es-MX') : ''}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
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
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF6A3D',
        textAlign: 'center',
    },
    subtitulo: {
        fontSize: 12,
        color: '#9DB1C7',
        textAlign: 'center',
        marginBottom: 14,
    },
    card: {
        backgroundColor: '#122A47',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitulo: { color: '#ffffff', fontWeight: 'bold', fontSize: 15, flex: 1 },
    cardTexto: { color: '#dde6ee', marginTop: 8, lineHeight: 18 },
    cardInfo: { color: '#9DB1C7', fontSize: 12, marginTop: 8 },
    cardFecha: { color: '#5C6B7A', fontSize: 11, marginTop: 4 },
    badgeNivel: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    badgeNivelTexto: { color: '#0B1D33', fontWeight: '800', fontSize: 11 },
    vacio: { color: '#9DB1C7', textAlign: 'center', marginTop: 30 },
});

