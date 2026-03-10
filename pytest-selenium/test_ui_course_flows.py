import time


def _full_url(frontend_base_url: str, path: str) -> str:
    return frontend_base_url.rstrip("/") + path


def test_home_has_call_to_action_for_courses(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/"))

    cta_links = selenium_driver.find_elements("xpath", "//a[contains(., 'Prohlédnout kurzy') or contains(., 'Prozkoumat katalog')]")
    assert cta_links, "Home page is missing primary CTA links to courses"


def test_courses_page_renders_layout_even_without_data(selenium_driver, frontend_base_url: str):
    """
    Important UI contract: /courses should render a meaningful layout even when
    there are no courses in the backend yet.
    """
    selenium_driver.get(_full_url(frontend_base_url, "/courses"))
    time.sleep(1)

    # Look for heading or main container; the exact text can evolve, so keep it lenient.
    headings = selenium_driver.find_elements("xpath", "//h1 | //h2 | //h3")
    assert headings, "Courses page rendered without any headings"


def test_navbar_brand_logo_links_home(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/courses"))

    logo_link = selenium_driver.find_element("css selector", ".nav-brand a")
    logo_link.click()
    time.sleep(1)

    # After clicking the logo we should end up on the frontend base URL or its root path.
    current = selenium_driver.current_url.rstrip("/")
    expected_base = frontend_base_url.rstrip("/")
    assert current == expected_base or current.endswith("/"), f"Expected to be on home page, got {current}"


def test_contact_and_imprint_are_accessible(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/imprint"))
    time.sleep(0.8)
    assert "/imprint" in selenium_driver.current_url

    selenium_driver.get(_full_url(frontend_base_url, "/contact"))
    time.sleep(0.8)
    assert "/contact" in selenium_driver.current_url

