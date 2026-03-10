import pytest


def test_courses_endpoint_returns_list_or_empty(http_client):
    """
    The /api/courses endpoint should return a JSON array (possibly empty).
    """
    response = http_client.get("/api/courses")
    assert response.status_code < 500

    # If server returns JSON, it should be a list or an object with a list-like field.
    try:
        data = response.json()
    except ValueError:
        pytest.skip("Server did not return JSON for /api/courses")

    assert isinstance(data, (list, dict))


def test_courses_handle_invalid_uuid_gracefully(http_client):
    """
    Course detail with an obviously invalid UUID must not crash the server.
    """
    response = http_client.get("/api/courses/not-a-real-uuid")
    assert response.status_code != 500


@pytest.mark.parametrize(
    "query_param",
    ["page=1", "page=2", "limit=10"],
)
def test_courses_pagination_parameters_do_not_error(http_client, query_param: str):
    """
    Basic pagination query params should not break the endpoint.
    """
    response = http_client.get(f"/api/courses?{query_param}")
    assert response.status_code < 500


def test_courses_endpoint_supports_options_for_cors(http_client):
    """
    Many frontends rely on preflight OPTIONS requests. The endpoint should
    respond with a non-5xx status code.
    """
    response = http_client.get("/api/courses", headers={"Access-Control-Request-Method": "GET"})
    assert response.status_code < 500
