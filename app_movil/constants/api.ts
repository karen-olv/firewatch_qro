/**
 * Configuración central de la API para FireWatch QRO móvil.
 *
 * ⚠️ REGLA DE ORO: NO uses "localhost" ni "127.0.0.1" si vas a abrir la app
 * en tu celular con Expo Go. Debes usar la IP LOCAL de tu computadora
 * (misma red WiFi que el celular).
 *
 * Para obtener tu IP en Windows:  ipconfig  → Dirección IPv4
 * Para obtener tu IP en Mac/Linux: ifconfig → inet
 */
export const API_URL = 'http://192.168.100.99:5000';

export const ENDPOINTS = {
    reportes: `${API_URL}/api/reportes`,
    incendios: `${API_URL}/api/incendios`,
    alertas: `${API_URL}/api/alertas`,
    resumen: `${API_URL}/api/estadisticas/resumen`,
    topMunicipios: `${API_URL}/api/estadisticas/top-municipios`,
    tendencia: (meses: number = 12) => `${API_URL}/api/estadisticas/tendencia?meses=${meses}`,
};

