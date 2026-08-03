def _seed_zona(app):
    from app.extensions import db
    from app.models import Municipio, Zona

    with app.app_context():
        municipio = Municipio(nombre="Test Municipio")
        db.session.add(municipio)
        db.session.flush()
        zona = Zona(nombre="Test Zona", municipio_id=municipio.id)
        db.session.add(zona)
        db.session.commit()
        return zona.id


def test_crear_reporte_con_descripcion_corta_devuelve_400(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes", json={"zona_id": zona_id, "descripcion": "corto"}
    )
    assert resp.status_code == 400


def test_crear_reporte_con_descripcion_larga_devuelve_400(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes",
        json={"zona_id": zona_id, "descripcion": "x" * 501},
    )
    assert resp.status_code == 400


def test_crear_reporte_valido_devuelve_201(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes",
        json={"zona_id": zona_id, "descripcion": "Descripcion valida de prueba"},
    )
    assert resp.status_code == 201


def test_crear_reporte_con_nombre_corto_devuelve_400(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes",
        json={
            "zona_id": zona_id,
            "descripcion": "Descripcion valida de prueba",
            "nombre_reportante": "Al",
        },
    )
    assert resp.status_code == 400


def test_crear_reporte_con_zona_id_no_entero_devuelve_400(client):
    resp = client.post(
        "/api/reportes",
        json={"zona_id": "no-es-un-entero", "descripcion": "Descripcion valida de prueba"},
    )
    assert resp.status_code == 400


def test_registro_con_password_corto_devuelve_400(client):
    resp = client.post(
        "/api/auth/registro",
        json={"nombre": "Juan Perez", "email": "juan@test.com", "password": "corto"},
    )
    assert resp.status_code == 400


def test_registro_con_email_invalido_devuelve_400(client):
    resp = client.post(
        "/api/auth/registro",
        json={"nombre": "Juan Perez", "email": "no-es-un-email", "password": "password123"},
    )
    assert resp.status_code == 400


def test_registro_con_nombre_corto_devuelve_400(client):
    resp = client.post(
        "/api/auth/registro",
        json={"nombre": "Al", "email": "juan@test.com", "password": "password123"},
    )
    assert resp.status_code == 400


def test_registro_valido_devuelve_201(client):
    resp = client.post(
        "/api/auth/registro",
        json={"nombre": "Juan Perez", "email": "juan@test.com", "password": "password123"},
    )
    assert resp.status_code == 201


def test_registro_no_permite_autoasignar_rol_admin(client):
    client.post(
        "/api/auth/registro",
        json={
            "nombre": "Mallory Test",
            "email": "mallory@test.com",
            "password": "password123",
            "rol": "admin",
        },
    )
    login_resp = client.post(
        "/api/auth/login", json={"email": "mallory@test.com", "password": "password123"}
    )
    token = login_resp.get_json()["access_token"]
    resp = client.post(
        "/api/incendios",
        json={"zona_id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


def test_registro_con_body_nulo_devuelve_400(client):
    resp = client.post(
        "/api/auth/registro",
        data="null",
        content_type="application/json",
    )
    assert resp.status_code == 400


def test_crear_reporte_con_zona_id_booleano_devuelve_400(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes",
        json={"zona_id": True, "descripcion": "Descripcion valida de prueba"},
    )
    assert resp.status_code == 400


def test_crear_reporte_con_nombre_reportante_nulo_usa_anonimo(app, client):
    zona_id = _seed_zona(app)
    resp = client.post(
        "/api/reportes",
        json={
            "zona_id": zona_id,
            "descripcion": "Descripcion valida de prueba",
            "nombre_reportante": None,
        },
    )
    assert resp.status_code == 201
    assert resp.get_json()["nombre_reportante"] == "Anónimo"
