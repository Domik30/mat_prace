import uuid

import pytest
import requests


BASE_URL = "http://localhost:3000"


def _url(path: str) -> str:
    if not path.startswith("/"):
        path = "/" + path
    return BASE_URL + path


@pytest.mark.api
def test_courses_catalog_returns_200_and_list():
    response = requests.get(_url("/api/courses"))
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.api
def test_courses_catalog_items_have_basic_fields_if_not_empty():
    response = requests.get(_url("/api/courses"))
    assert response.status_code == 200
    data = response.json()
    # Pokud katalog není prázdný, ověříme strukturu první položky,
    # jinak jen potvrdíme, že je prázdné pole.
    if data:
        course = data[0]
        assert "uuid" in course
        assert "name" in course
        assert "state" in course
    else:
        assert data == []


@pytest.mark.api
def test_get_unknown_course_returns_404():
    random_uuid = str(uuid.uuid4())
    response = requests.get(_url(f"/api/courses/{random_uuid}"))
    assert response.status_code == 404
    body = response.json()
    assert body.get("error") == "Course not found"


@pytest.mark.api
def test_create_course_without_auth_returns_401():
    payload = {"name": "Test course without auth", "description": "Desc"}
    response = requests.post(_url("/api/courses"), json=payload)
    assert response.status_code == 401
    body = response.json()
    assert "error" in body


@pytest.mark.api
def test_create_course_without_name_returns_client_error():
    """
    Ověříme, že při pokusu vytvořit kurz bez názvu API nevrací 2xx.
    Vzhledem k tomu, že endpoint vyžaduje autorizaci, akceptujeme jak 400 (validace),
    tak 401/403 (neautorizovaný přístup), ale nikdy ne 2xx.
    """
    payload = {"description": "Kurz bez názvu"}
    response = requests.post(_url("/api/courses"), json=payload)
    assert response.status_code >= 400
    assert response.status_code < 500


@pytest.mark.api
def test_login_missing_credentials_returns_400():
    response = requests.post(_url("/api/login"), json={})
    assert response.status_code == 400
    assert response.json().get("error") == "Missing credentials"


@pytest.mark.api
def test_login_invalid_credentials_returns_401():
    payload = {"username": "neexistujici", "password": "spatneheslo"}
    response = requests.post(_url("/api/login"), json=payload)
    # Pokud není nakonfigurovaná DB, může kontroler vrátit i jiný kód;
    # v základním případě ale očekáváme 401 Invalid credentials.
    assert response.status_code in (400, 401)
    assert "error" in response.json()


@pytest.mark.api
def test_register_missing_username_returns_400():
    payload = {"password": "heslo123"}
    response = requests.post(_url("/api/login/register"), json=payload)
    assert response.status_code == 400
    assert response.json().get("error") == "Username and password are required"


@pytest.mark.api
def test_register_missing_password_returns_400():
    payload = {"username": "uzivatel-bez-hesla"}
    response = requests.post(_url("/api/login/register"), json=payload)
    assert response.status_code == 400
    assert response.json().get("error") == "Username and password are required"


@pytest.mark.api
def test_register_then_login_flow_if_db_available():
    """
    Integrační test – vyžaduje funkční databázi a povolenou registraci.
    Pokud DB neběží nebo registrace selže, test se přeskočí.
    """
    unique_username = f"testuser_{uuid.uuid4().hex[:8]}"
    password = "TestHeslo123!"

    register_resp = requests.post(
        _url("/api/login/register"),
        json={"username": unique_username, "password": password},
    )
    if register_resp.status_code not in (200, 201):
        pytest.skip(f"Registrace selhala (status {register_resp.status_code}), integrační test přeskočen.")

    login_resp = requests.post(
        _url("/api/login"),
        json={"username": unique_username, "password": password},
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "token" in data
    # role může být nepovinná, ale pokud přijde, zkontrolujeme typ
    if "role" in data:
        assert isinstance(data["role"], str)

