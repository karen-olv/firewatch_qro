/**
 * Configuración central de la API para FireWatch QRO móvil.
 *
 * ⚠️ REGLA DE ORO: NO uses "localhost" ni "127.0.0.1" si vas a abrir la app
 * en tu celular con Expo Go. Debes usar la IP LOCAL de tu computadora
 * (misma red WiFi que el celular) o la URL pública de tu servidor en la nube.
 *
 * En producción (despliegue en la nube), define la variable de entorno:
 *   EXPO_PUBLIC_API_URL=http://<IP_PUBLICA>:8080
 *
 * Para desarrollo local usa tu IP local:
 *   EXPO_PUBLIC_API_URL=http://192.168.x.x:8080
 * (obténla con `ipconfig` en Windows o `ifconfig` en Mac/Linux)
 */

// fallback para desarrollo local
const DEFAULT_API_URL = 'http://192.168.100.99:8080';

/**
 * URL base de la API.
 *
 * Expo usa EXPO_PUBLIC_* durante el build.
 * En tiempo de desarrollo con `npx expo start` se usará el valor
 * de DEFAULT_API_URL a menos que se defina la variable de entorno.
 */
export const API_URL =
    (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_URL ||
    DEFAULT_API_URL;

export const ENDPOINTS = {
    reportes: `${API_URL}/api/reportes`,
    incendios: `${API_URL}/api/incendios`,
    alertas: `${API_URL}/api/alertas`,
    zonas: `${API_URL}/api/zonas`,
    resumen: `${API_URL}/api/estadisticas/resumen`,
    topMunicipios: `${API_URL}/api/estadisticas/top-municipios`,
    tendencia: (meses: number = 12) => `${API_URL}/api/estadisticas/tendencia?meses=${meses}`,
};

