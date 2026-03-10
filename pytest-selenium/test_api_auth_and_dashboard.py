import pytest


def test_login_endpoint_exists(http_client):
  """
  Important: /api/login should exist and not crash.
  """
  response = http_client.post("/api/login", json={"username": "x", "password": "y"})
  # Some 4xx is expected for invalid credentials, but 5xx would be a bug.
  assert response.status_code < 500


def test_dashboard_requires_authentication(http_client):
  """
  Anonymous access to /api/dashboard should not be treated as a happy-path 2xx.
  """
  response = http_client.get("/api/dashboard")
  assert response.status_code >= 400


@pytest.mark.parametrize(
  "path",
  [
    "/api/dashboard/courses",
    "/api/dashboard/statistics",
    "/api/dashboard/presets",
  ],
)
def test_dashboard_subroutes_do_not_crash(http_client, path: str):
  """
  Key dashboard API routes must not respond with 500, even for anonymous user.
  """
  response = http_client.get(path)
  assert response.status_code != 500

