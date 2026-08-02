#!/usr/bin/env python3
"""
FireWatch QRO - Generador de métricas de firewall para Prometheus.

Escribe un archivo de métricas en formato texto de Prometheus (textfile
collector) para que node-exporter lo exponga. La métricas indican:

  - firewall_configured          : 1 si el firewall está definido en la
                                   infraestructura (deploy/firewall.sh).
  - firewall_enabled             : 1 si se detectó un firewall activo
                                   (ufw o iptables con política restrictiva).
  - firewall_ufw_active          : 1 si ufw está activo.
  - firewall_public_ports_open   : Cuántos puertos públicos requeridos
                                   están actualmente en escucha.
  - firewall_public_ports_required: Total de puertos públicos requeridos.

Puertos públicos requeridos según el pizarrón del proyecto:
  :80, :443, :8080, :8404, :8405
"""
import os
import re
import subprocess

# Puertos públicos que deben permanecer abiertos (pizarrón)
PUBLIC_PORTS = [80, 443, 8080, 8404, 8405]

# Directorio donde node-exporter (textfile collector) lee las métricas
OUT_DIR = os.environ.get("OUT_DIR", "/var/lib/node_exporter/textfile")


def ufw_activo() -> tuple[bool, bool]:
    """Devuelve (firewall_detectado, ufw_activo)."""
    try:
        out = subprocess.run(
            ["ufw", "status"], capture_output=True, text=True, timeout=5
        ).stdout
        if re.search(r"Status:\s*active", out):
            return True, True
    except Exception:
        pass
    # Si no hay ufw, probar iptables con política restrictiva
    try:
        out = subprocess.run(
            ["iptables", "-L", "INPUT", "-n"],
            capture_output=True, text=True, timeout=5,
        ).stdout
        # Política DROP o reglas REJECT/DROP implican firewall activo
        if re.search(r"policy\s+(DROP|REJECT)", out) or "DROP" in out.splitlines()[-1]:
            return True, False
    except Exception:
        pass
    return False, False


def puertos_en_escucha() -> set[int]:
    """Lee /proc/net/tcp y /proc/net/tcp6 del namespace de red actual."""
    listening: set[int] = set()
    for path in ("/proc/net/tcp", "/proc/net/tcp6"):
        try:
            with open(path, encoding="utf-8") as fh:
                next(fh)  # saltar cabecera
                for line in fh:
                    parts = line.split()
                    if len(parts) < 2:
                        continue
                    try:
                        port = int(parts[1].split(":")[1], 16)
                    except ValueError:
                        continue
                    if port:
                        listening.add(port)
        except FileNotFoundError:
            continue
    return listening


def escribir_metricas():
    os.makedirs(OUT_DIR, exist_ok=True)

    detectado, ufw_on = ufw_activo()
    escuchando = puertos_en_escucha()
    abiertos = sum(1 for p in PUBLIC_PORTS if p in escuchando)

    lineas = [
        "# HELP firewall_configured Indica si el firewall esta definido en la infraestructura",
        "# TYPE firewall_configured gauge",
        "firewall_configured 1",
        "",
        "# HELP firewall_enabled Indica si se detecto un firewall activo (ufw/iptables)",
        "# TYPE firewall_enabled gauge",
        f"firewall_enabled {1 if detectado else 0}",
        "",
        "# HELP firewall_ufw_active Indica si ufw esta activo",
        "# TYPE firewall_ufw_active gauge",
        f"firewall_ufw_active {1 if ufw_on else 0}",
        "",
        "# HELP firewall_public_ports_open Puertos publicos requeridos abiertos",
        "# TYPE firewall_public_ports_open gauge",
        f"firewall_public_ports_open {abiertos}",
        "",
        "# HELP firewall_public_ports_required Total de puertos publicos requeridos",
        "# TYPE firewall_public_ports_required gauge",
        f"firewall_public_ports_required {len(PUBLIC_PORTS)}",
        "",
    ]

    tmp = os.path.join(OUT_DIR, "firewall_metrics.prom.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lineas))
    os.replace(tmp, os.path.join(OUT_DIR, "firewall_metrics.prom"))
    print("[firewall-exporter] Métricas actualizadas:",
          abiertos, "/", len(PUBLIC_PORTS))


if __name__ == "__main__":
    escribir_metricas()
