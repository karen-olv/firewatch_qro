from tests.conftest import make_user, login


def test_crear_incendio_sin_token_devuelve_401(client):
    resp = client.post("/api/incendios", json={"zona_id": 1})
    assert resp.status_code == 401


def test_crear_incendio_con_rol_ciudadano_devuelve_403(app, client):
    make_user(app, "ciudadano@test.com", "ciudadano")
    token = login(client, "ciudadano@test.com")
    resp = client.post(
        "/api/incendios",
        json={"zona_id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_crear_incendio_con_rol_admin_falla_por_zona_inexistente_no_por_auth(app, client):
    make_user(app, "admin@test.com", "admin")
    token = login(client, "admin@test.com")
    resp = client.post(
        "/api/incendios",
        json={"zona_id": 999},
        headers={"Authorization": f"Bearer {token}"},
    )
    # zona 999 no existe en una BD vacía -> 404, no 401/403.
    # Confirma que el rol admin sí pasa el gate de autorización.
    assert resp.status_code == 404


def test_crear_alerta_sin_token_devuelve_401(client):
    resp = client.post("/api/alertas", json={"incendio_id": 1})
    assert resp.status_code == 401


def test_crear_alerta_con_rol_proteccion_civil_pasa_gate(app, client):
    make_user(app, "pc@test.com", "proteccion_civil")
    token = login(client, "pc@test.com")
    resp = client.post(
        "/api/alertas",
        json={"incendio_id": 999},
        headers={"Authorization": f"Bearer {token}"},
    )
    # incendio 999 no existe -> 400 (validación de negocio), no 401/403.
    assert resp.status_code == 400


def test_listar_usuarios_sin_token_devuelve_401(client):
    resp = client.get("/api/usuarios")
    assert resp.status_code == 401


def test_listar_usuarios_con_cualquier_rol_devuelve_200(app, client):
    make_user(app, "cualquiera@test.com", "ciudadano")
    token = login(client, "cualquiera@test.com")
    resp = client.get("/api/usuarios", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
