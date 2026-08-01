=========================================================
 ACTUALIZACIÓN DEL BACKEND Y APP MÓVIL - FIREWATCH QRO
=========================================================
Qué onda equipo. Ya quedó lista al 100% la base de datos (MySQL)
y la conexión del Backend (Flask). Ya pueden mandar datos reales
y se van a guardar directo, con todas las validaciones que pidió el profe.

También ya dejé creada la carpeta base para la aplicación móvil en Expo.

Sigan estos pasos EXACTAMENTE como dicen para que les funcione todo en sus computadoras:

---------------------------------------------------------
PASO 1: DESCARGAR LOS CAMBIOS (LO MÁS IMPORTANTE)
---------------------------------------------------------
Abran su terminal en la carpeta principal del proyecto (firewatch_qro) y ejecuten:
> git pull

Esto va a descargar los nuevos archivos de las rutas y la nueva carpeta "app_movil".

---------------------------------------------------------
PASO 2: LEVANTAR TODO EL PROYECTO (USEN 3 TERMINALES)
---------------------------------------------------------
Para trabajar, necesitan 3 terminales abiertas al mismo tiempo en diferentes carpetas:

TERMINAL 1 (Para la Base de Datos):
- Entren a la carpeta del backend: cd backend
- Activen su entorno virtual (venv)
- Ejecuten: python run.py

TERMINAL 2 (Para el Dashboard Web):
- Entren a la carpeta del frontend web: cd frontend
- Ejecuten: npm run dev

TERMINAL 3 (Para la App Móvil):
- Entren a la nueva carpeta que creé: cd app_movil
- Ejecuten: npx expo start
(Escaneen el código QR con la app de Expo Go en su celular para verla).

---------------------------------------------------------
⚠️ LA REGLA DE ORO PARA LA APP MÓVIL (LEER SÍ O SÍ) ⚠️
---------------------------------------------------------
Para que la app en su celular (Expo Go) se pueda conectar a la base de datos de su computadora, ESTÁ PROHIBIDO USAR "localhost" o "127.0.0.1" en los fetch/axios. Si lo hacen, la app va a tronar.

Tienen que usar SU PROPIA IP LOCAL:
1. Abran una terminal y escriban "ipconfig" (Windows) o "ifconfig" (Mac).
2. Busquen la "Dirección IPv4" (ej. 192.168.1.75).
3. Asegúrense de que su celular y la compu estén en el MISMO WIFI.
4. En el código de la app móvil (app_movil), las peticiones deben verse así:

ejemplos no oficiales las url

   Bien: http://192.168.1.75:5000/api/reportes
   Mal:  http://localhost:5000/api/reportes

---------------------------------------------------------
RUTAS LISTAS PARA QUE LAS USEN EN EL FRONTEND MÓVIL
---------------------------------------------------------
El backend ya acepta POST (enviar datos) en las siguientes rutas:
- POST: /api/reportes (Para los reportes ciudadanos)
- POST: /api/incendios (Para registrar nuevos incendios)

Ya incluyen manejo de errores. Si mandan un dato mal, el backend les regresará un JSON diciendo exactamente qué falló para que lo puedan mostrar en la pantalla de la app.
