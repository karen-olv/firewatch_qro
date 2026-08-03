# Must be set before importing app.config, which reads them at class-body time
import os
os.environ['TESTING'] = '1'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

import pytest
from prometheus_client import REGISTRY

from app import create_app
from app.extensions import db
from app.models import Usuario


@pytest.fixture
def app():
    # create_app() registers Prometheus collectors against the global REGISTRY,
    # so every fixture instance would raise DuplicateTimeseries without this.
    for collector in list(REGISTRY._collector_to_names):
        REGISTRY.unregister(collector)

    flask_app = create_app()
    flask_app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="test-secret-key-at-least-32-bytes-long",
    )

    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def make_user(app, email, rol):
    with app.app_context():
        usuario = Usuario(nombre="Test User", email=email, rol=rol)
        usuario.set_password("password123")
        db.session.add(usuario)
        db.session.commit()
        return usuario.id


def login(client, email, password="password123"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.get_json()
    return resp.get_json()["access_token"]
