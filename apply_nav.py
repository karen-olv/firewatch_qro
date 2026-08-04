#!/usr/bin/env python3
import sys

path = "frontend/src/App.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# 1. Agregar funciones de navegación despues de crearUsuario
old1 = '''    } finally {
      setCreandoUsuario(false);
    }
  };'''
new1 = old1 + '''

  const scrollToId = (id) => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navTargets = { dashboard: null, mapa: "card-mapa", reportes: "card-reportes", estadisticas: "card-estadisticas", usuarios: "card-usuarios", config: null };

  const irASeccion = (key) => {
    setActive(key);
    scrollToId(navTargets[key]);
  };'''
replacements.append(("funciones de navegacion", old1, new1))

# 2. Nav items: usar irASeccion en vez de setActive
old2 = 'onClick={() => setActive(n.key)}'
new2 = 'onClick={() => irASeccion(n.key)}'
replacements.append(("nav onClick", old2, new2))

# 3. id en tarjeta del mapa
old3 = '<div className="fw-card">\n            <div className="fw-card-head">\n              <div className="fw-card-title"><MapPinned size={16} /> Mapa en vivo — incendios activos</div>'
new3 = '<div className="fw-card" id="card-mapa">\n            <div className="fw-card-head">\n              <div className="fw-card-title"><MapPinned size={16} /> Mapa en vivo — incendios activos</div>'
replacements.append(("id mapa", old3, new3))

# 4. id en tarjeta de alertas
old4 = '<div className="fw-card">\n            <div className="fw-card-head">\n              <div className="fw-card-title"><ShieldAlert size={16} /> Alertas activas</div>'
new4 = '<div className="fw-card" id="card-alertas">\n            <div className="fw-card-head">\n              <div className="fw-card-title"><ShieldAlert size={16} /> Alertas activas</div>'
replacements.append(("id alertas", old4, new4))

# 5. id en tarjeta de estadisticas
old5 = '<div className="fw-card">\n            <div className="fw-card-head">\n              <div className="fw-card-title"><BarChart3 size={16} /> Tendencia y top municipios</div>'
new5 = '<div className="fw-card" id="card-estadisticas">\n            <div className="fw-card-head">\n              <div className="fw-card-title"><BarChart3 size={16} /> Tendencia y top municipios</div>'
replacements.append(("id estadisticas", old5, new5))

# 6. id en tarjeta de reportes
old6 = '<div className="fw-card">\n            <div className="fw-card-head">\n              <div className="fw-card-title"><ClipboardList size={16} /> Reportes recientes</div>'
new6 = '<div className="fw-card" id="card-reportes">\n            <div className="fw-card-head">\n              <div className="fw-card-title"><ClipboardList size={16} /> Reportes recientes</div>'
replacements.append(("id reportes", old6, new6))

# 7. id en tarjeta de crear usuario
old7 = '<div className="fw-card" style={{ marginBottom: 16 }}>\n          <div className="fw-card-head">\n            <div className="fw-card-title"><Users size={16} /> Crear usuario</div>'
new7 = '<div className="fw-card" id="card-usuarios" style={{ marginBottom: 16 }}>\n          <div className="fw-card-head">\n            <div className="fw-card-title"><Users size={16} /> Crear usuario</div>'
replacements.append(("id usuarios", old7, new7))

# 8. Botones de la barra de admin: agregar onClick con scroll
old8 = '''            <div className="fw-admin-btn"><ShieldAlert size={13} /> Ver alertas</div>
            <div className="fw-admin-btn"><MapPinned size={13} /> Mapa completo</div>
            <div className="fw-admin-btn"><Users size={13} /> Usuarios</div>
            <div className="fw-admin-btn"><Settings size={13} /> Configuración</div>'''
new8 = '''            <div className="fw-admin-btn" onClick={() => scrollToId("card-alertas")}><ShieldAlert size={13} /> Ver alertas</div>
            <div className="fw-admin-btn" onClick={() => scrollToId("card-mapa")}><MapPinned size={13} /> Mapa completo</div>
            <div className="fw-admin-btn" onClick={() => scrollToId("card-usuarios")}><Users size={13} /> Usuarios</div>
            <div className="fw-admin-btn" onClick={() => scrollToId(null)}><Settings size={13} /> Configuración</div>'''
replacements.append(("admin bar onClick", old8, new8))

# Verificar TODOS antes de escribir nada
errores = []
for nombre, old, new in replacements:
    if old not in content:
        errores.append(nombre)

if errores:
    print("ERROR: no se encontraron estos puntos de insercion:", ", ".join(errores))
    print("No se modifico ningun archivo.")
    sys.exit(1)

for nombre, old, new in replacements:
    content = content.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: navegacion funcional insertada correctamente (8/8 cambios aplicados).")
