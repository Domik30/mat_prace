import time


def _full_url(frontend_base_url: str, path: str) -> str:
    return frontend_base_url.rstrip("/") + path


def test_home_page_loads_and_has_hero(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/"))
    assert "Think different Academy" in selenium_driver.title

    # Check for main hero headline text
    hero_headings = selenium_driver.find_elements(
        "xpath", "//h1[contains(., 'Učte se chytře')]"
    )
    assert hero_headings, "Hero heading not found on home page"


def test_navbar_has_core_links(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/"))

    home_link = selenium_driver.find_elements("link text", "Domů")
    courses_link = selenium_driver.find_elements("link text", "Kurzy")
    login_link = selenium_driver.find_elements("link text", "Přihlásit")

    assert home_link, "Navbar is missing 'Domů' link"
    assert courses_link, "Navbar is missing 'Kurzy' link"
    assert login_link, "Navbar is missing 'Přihlásit' link for anonymous users"


def test_can_navigate_to_courses_from_home(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/"))

    courses_link = selenium_driver.find_element("link text", "Kurzy")
    courses_link.click()

    # Allow router navigation
    time.sleep(1)
    assert "/courses" in selenium_driver.current_url


def test_can_navigate_to_login_from_navbar(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/"))

    login_link = selenium_driver.find_element("link text", "Přihlásit")
    login_link.click()
    time.sleep(1)

    assert "/login" in selenium_driver.current_url
    heading = selenium_driver.find_element("xpath", "//h2[contains(., 'Přihlášení')]")
    assert heading is not None
