from flask import request
from flask_limiter.util import get_remote_address


def get_real_client_ip():
    """Detrás de HAProxy (option forwardfor), request.remote_addr es siempre
    la IP del proxy, nunca la del visitante real. Lee X-Forwarded-For (que
    HAProxy ya inyecta, haproxy.cfg:16) con fallback a la IP directa para
    desarrollo local sin proxy."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address()
