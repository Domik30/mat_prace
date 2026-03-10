import os
import time

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


BASE_UI_URL = os.environ.get("TOURDEAPP_UI_URL", "http://localhost:5173")


@pytest.fixture(scope="session")
def driver():
    """
    Společný Selenium WebDriver pro všechny UI testy.

    Předpoklady:
    - Nainstalovaný Chrome/Chromium
    - Odpovídající ChromeDriver v PATH nebo použití webdriver-manager (viz README)
    - Frontend běží na BASE_UI_URL
    """
    options = ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1280,800")

    drv = webdriver.Chrome(options=options)
    yield drv
    drv.quit()


def _wait_for(driver, by, value, timeout=10):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, value))
    )


@pytest.mark.selenium
def test_home_page_loads_and_shows_navbar(driver):
    driver.get(BASE_UI_URL + "/")
    nav = _wait_for(driver, By.CSS_SELECTOR, "nav.navbar")
    assert nav is not None
    assert "Think different Academy" in driver.title


@pytest.mark.selenium
def test_navbar_contains_home_and_courses_links(driver):
    driver.get(BASE_UI_URL + "/")
    links = driver.find_elements(By.CSS_SELECTOR, "nav.navbar a")
    texts = {link.text.strip() for link in links}
    assert "Domů" in texts
    assert "Kurzy" in texts


@pytest.mark.selenium
def test_click_courses_link_opens_courses_page(driver):
    driver.get(BASE_UI_URL + "/")
    courses_link = _wait_for(driver, By.LINK_TEXT, "Kurzy")
    courses_link.click()
    # Na stránce s kurzy není <main>, proto čekáme na nadpis "Kurzy"
    heading = _wait_for(driver, By.TAG_NAME, "h1")
    assert "Kurzy" in heading.text
    assert "/courses" in driver.current_url


@pytest.mark.selenium
def test_login_button_visible_for_anonymous_user(driver):
    driver.get(BASE_UI_URL + "/")
    login_btn = _wait_for(driver, By.CSS_SELECTOR, ".nav-auth a.login-btn")
    assert login_btn.text.strip() == "Přihlásit"


@pytest.mark.selenium
def test_click_login_opens_login_form(driver):
    driver.get(BASE_UI_URL + "/")
    login_btn = _wait_for(driver, By.CSS_SELECTOR, ".nav-auth a.login-btn")
    login_btn.click()

    heading = _wait_for(driver, By.TAG_NAME, "h2")
    assert heading.text.strip() == "Přihlášení"

    username_input = _wait_for(driver, By.CSS_SELECTOR, 'input[autocomplete="username"]')
    password_input = _wait_for(driver, By.CSS_SELECTOR, 'input[autocomplete="current-password"]')
    assert username_input.get_attribute("type") == "text"
    assert password_input.get_attribute("type") == "password"


@pytest.mark.selenium
def test_login_view_has_register_link(driver):
    driver.get(BASE_UI_URL + "/login")
    link = _wait_for(driver, By.LINK_TEXT, "Registrace")
    assert "/register" in link.get_attribute("href")


@pytest.mark.selenium
def test_register_page_loads(driver):
    driver.get(BASE_UI_URL + "/register")
    # Ověříme, že stránka se načetla a obsahuje formulářové prvky
    inputs = driver.find_elements(By.TAG_NAME, "input")
    assert len(inputs) >= 2


@pytest.mark.selenium
def test_footer_contains_basic_links(driver):
    driver.get(BASE_UI_URL + "/")
    footer = _wait_for(driver, By.TAG_NAME, "footer")
    links = footer.find_elements(By.TAG_NAME, "a")
    hrefs = [l.get_attribute("href") for l in links]
    # nevyžadujeme konkrétní počet, ale alespoň nějaké odkazy
    assert any("terms" in (href or "") for href in hrefs) or any(
        "privacy" in (href or "") for href in hrefs
    )


@pytest.mark.selenium
def test_not_found_page_for_unknown_route(driver):
    driver.get(BASE_UI_URL + "/tato-stranka-neexistuje-404")
    heading = _wait_for(driver, By.TAG_NAME, "h1")
    assert "404" in heading.text or "nenalezena" in heading.text.lower()


@pytest.mark.selenium
def test_navigation_from_home_to_contact_and_back(driver):
    driver.get(BASE_UI_URL + "/")
    contact_link = _wait_for(driver, By.LINK_TEXT, "Kontakt")
    contact_link.click()
    time.sleep(0.5)  # krátká pauza pro přepnutí routeru
    assert "/contact" in driver.current_url

    home_link = _wait_for(driver, By.LINK_TEXT, "Domů")
    home_link.click()
    time.sleep(0.5)
    assert driver.current_url.rstrip("/").endswith(BASE_UI_URL.rstrip("/"))

