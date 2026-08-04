import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Image,
} from 'react-native';
import { ENDPOINTS } from '@/constants/api';
import { WebView } from 'react-native-webview';

type Incendio = {
    id: number;
    zona: string | null;
    municipio: string | null;
    nivel_riesgo: string;
    estado: string;
    descripcion: string | null;
    fecha_deteccion: string | null;
    lat: number | null;
    lng: number | null;
};

const nivelColor: Record<string, string> = {
    alto: '#EF4444',
    medio: '#FBBF24',
    bajo: '#4ADE80',
};

const estadoTexto: Record<string, string> = {
    activo: 'Activo',
    contenido: 'Contenido',
    controlado: 'Controlado',
};

function construirHtmlMapa(puntos: Incendio[]) {
    var datos = puntos.filter(function (p: Incendio) { return p.lat != null && p.lng != null; });
    var datosJson = JSON.stringify(datos);
    return (
        '<!DOCTYPE html><html><head>' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />' +
        '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />' +
        '<style>html,body,#map{height:100%;margin:0;padding:0;}</style>' +
        '</head><body><div id="map"></div>' +
        '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></' + 'script>' +
        '<script>' +
        'var puntos = ' + datosJson + ';' +
        'var mapa = L.map("map").setView([20.59, -100.39], 8);' +
        'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"OpenStreetMap"}).addTo(mapa);' +
        'var colores = {alto:"#EF4444",medio:"#FBBF24",bajo:"#4ADE80"};' +
        'puntos.forEach(function(p){' +
        '  var color = colores[p.nivel_riesgo] || "#888";' +
        '  var m = L.circleMarker([p.lat, p.lng], {radius:10, fillColor:color, color:"#fff", weight:2, fillOpacity:0.9}).addTo(mapa);' +
        '  m.bindPopup("<b>" + (p.zona || "Zona") + "</b><br>" + (p.municipio || "") + "<br>Nivel: " + p.nivel_riesgo);' +
        '});' +
        '</script></body></html>'
    );
}

export default function IncendiosScreen() {
    const [incendios, setIncendios] = useState<Incendio[]>([]);
    const [cargando, setCargando] = useState(true);
    const [refrescando, setRefrescando] = useState(false);
    const [filtro, setFiltro] = useState<'todos' | 'activo'>('activo');
    const [vista, setVista] = useState<'lista' | 'mapa'>('lista');

    const obtenerIncendios = async () => {
        try {
            const url =
                filtro === 'activo'
                    ? `${ENDPOINTS.incendios}?estado=activo`
                    : ENDPOINTS.incendios;
            const response = await fetch(url);
            const data = await response.json();
            setIncendios(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error al obtener incendios:', error);
        } finally {
            setCargando(false);
            setRefrescando(false);
        }
    };

    useEffect(() => {
        obtenerIncendios();
    }, [filtro]);

    const alRefrescar = () => {
        setRefrescando(true);
        obtenerIncendios();
    };

    if (cargando) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF6A3D" />
                <Text style={styles.textoCargando}>Cargando incendios...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>🔥 Incendios monitoreados</Text>
            <Text style={styles.subtitulo}>
                Incendios registrados por sensores y reportes ciudadanos
            </Text>

            <View style={styles.filtros}>
                <TouchableOpacity
                    style={[styles.filtroBtn, filtro === 'activo' && styles.filtroBtnActivo]}
                    onPress={() => setFiltro('activo')}
                >
                    <Text style={[styles.filtroTexto, filtro === 'activo' && styles.filtroTextoActivo]}>
                        Activos
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filtroBtn, filtro === 'todos' && styles.filtroBtnActivo]}
                    onPress={() => setFiltro('todos')}
                >
                    <Text style={[styles.filtroTexto, filtro === 'todos' && styles.filtroTextoActivo]}>
                        Todos
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filtros}>
                <TouchableOpacity
                    style={[styles.filtroBtn, vista === 'lista' && styles.filtroBtnActivo]}
                    onPress={() => setVista('lista')}
                >
                    <Text style={[styles.filtroTexto, vista === 'lista' && styles.filtroTextoActivo]}>
                        📋 Lista
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filtroBtn, vista === 'mapa' && styles.filtroBtnActivo]}
                    onPress={() => setVista('mapa')}
                >
                    <Text style={[styles.filtroTexto, vista === 'mapa' && styles.filtroTextoActivo]}>
                        🗺️ Mapa
                    </Text>
                </TouchableOpacity>
            </View>

            {vista === 'mapa' ? (
                <WebView
                    originWhitelist={['*']}
                    source={{ html: construirHtmlMapa(incendios) }}
                    style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                />
            ) : (
            <FlatList
                data={incendios}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} />
                }
                ListEmptyComponent={
                    <Text style={styles.vacio}>No hay incendios con ese filtro.</Text>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardTop}>
                            <Text style={styles.cardTitulo}>
                                {item.zona ?? 'Zona desconocida'}
                            </Text>
                            <View
                                style={[
                                    styles.badgeNivel,
                                    { backgroundColor: nivelColor[item.nivel_riesgo] ?? '#888' },
                                ]}
                            >
                                <Text style={styles.badgeNivelTexto}>
                                    {item.nivel_riesgo.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.cardMunicipio}>{item.municipio ?? ''}</Text>
                        {item.lat != null && item.lng != null && (
                            <Image
                                source={{ uri: `https://static-maps.yandex.ru/1.x/?lang=en_US&ll=${item.lng},${item.lat}&z=13&l=map&size=450,180&pt=${item.lng},${item.lat},pm2rdl` }}
                                style={{ width: '100%', height: 120, borderRadius: 8, marginTop: 8 }}
                                resizeMode="cover"
                            />
                        )}
                        {item.descripcion ? (
                            <Text style={styles.cardTexto}>{item.descripcion}</Text>
                        ) : null}
                        <View style={styles.cardMeta}>
                            <Text style={styles.cardInfo}>
                                Estado: {estadoTexto[item.estado] ?? item.estado}
                            </Text>
                            <Text style={styles.cardInfo}>
                                {item.fecha_deteccion
                                    ? new Date(item.fecha_deteccion).toLocaleString('es-MX')
                                    : 'Sin fecha'}
                            </Text>
                        </View>
                    </View>
                )}
            />
            )}
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
    filtros: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    filtroBtn: {
        backgroundColor: '#122A47',
        borderColor: '#1F3A5F',
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 999,
    },
    filtroBtnActivo: { backgroundColor: '#C7361B', borderColor: '#C7361B' },
    filtroTexto: { color: '#9DB1C7', fontWeight: '600', fontSize: 13 },
    filtroTextoActivo: { color: '#ffffff' },
    card: {
        backgroundColor: '#122A47',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6A3D',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitulo: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
    cardMunicipio: { color: '#9DB1C7', fontSize: 12, marginTop: 2 },
    cardTexto: { color: '#dde6ee', marginTop: 8, lineHeight: 18 },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    cardInfo: { color: '#9DB1C7', fontSize: 11 },
    badgeNivel: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeNivelTexto: { color: '#0B1D33', fontWeight: '800', fontSize: 11 },
    vacio: { color: '#9DB1C7', textAlign: 'center', marginTop: 30 },
});

