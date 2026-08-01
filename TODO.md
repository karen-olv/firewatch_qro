# TODO - Corrección backend FireWatch QRO

## Pasos
- [x] Analizar estructura del proyecto y rutas existentes
- [x] Instalar dependencias: `pip install -r requirements.txt` en el venv
- [x] Modificar `backend/app/__init__.py` para mostrar endpoints en `/` y Swagger en `/docs`
- [x] Agregar `flasgger` a `backend/requirements.txt`
- [x] Verificar que `create_app()` funciona sin errores
- [x] Probar que `/`, `/docs` y `/api/health` responden correctamente

## Resumen de cambios
1. **`backend/requirements.txt`**: se agregó `flasgger==0.9.7.1`.
2. **`backend/app/__init__.py`**:
   - Ruta `/` ahora genera una página HTML con la tabla de todos los endpoints (método + ruta + función) dinámicamente desde `app.url_map`.
   - Ruta `/docs` ahora muestra la documentación Swagger UI interactiva con botón "Try it out".
   - Se mantiene `/api/health` para health check.
3. **`frontend/src/App.jsx`**: se agregó pantalla de login (JWT) con estilo y botón "Salir".
4. **`frontend/src/App.css`**: estilos de la pantalla de login.

## Para correr
```bash
cd backend
venv\Scripts\python run.py
```
Luego abrir:
- http://localhost:5000  → lista de endpoints
- http://localhost:5000/docs → Swagger UI interactivo

</content>

