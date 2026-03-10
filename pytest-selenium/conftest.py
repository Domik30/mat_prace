import os
from typing import Generator

import pytest
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.webdriver import WebDriver


def _get_backend_base_url() -> str:
    """
    Resolve backend base URL from env or use local default.
    This allows tests to run in CI or locally without code changes.
    """
    return os.getenv("BACKEND_BASE_URL", "http://localhost:3000")


def _get_frontend_base_url() -> str:
    """
    Resolve frontend base URL from env or use local default.
    Match the ports allowed by CORS in apps/server/src/index.ts.
    """
    return os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")


@pytest.fixture(scope="session")
def backend_base_url() -> str:
    return _get_backend_base_url()


@pytest.fixture(scope="session")
def frontend_base_url() -> str:
    return _get_frontend_base_url()


@pytest.fixture(scope="session")
def http_client(backend_base_url: str):
    """
    Simple HTTP client wrapper around requests with base URL.
    """

    class Client:
        def __init__(self, base_url: str):
            self.base_url = base_url.rstrip("/")

        def get(self, path: str, **kwargs):
            return requests.get(self.base_url + path, **kwargs)

        def post(self, path: str, **kwargs):
            return requests.post(self.base_url + path, **kwargs)

    return Client(backend_base_url)


@pytest.fixture(scope="session")
def selenium_driver(frontend_base_url: str) -> Generator[WebDriver, None, None]:
    """
    Provide a Selenium Chrome WebDriver instance for UI tests.
    Runs in headless mode by default so it works in CI environments.
    """
    options = Options()
    # Use headless by default; can be overridden by env if needed
    if os.getenv("SELENIUM_HEADLESS", "1") == "1":
        options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1280,720")
    options.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(5)

    yield driver

    driver.quit()
