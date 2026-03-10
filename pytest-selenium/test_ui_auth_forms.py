import time


def _full_url(frontend_base_url: str, path: str) -> str:
    return frontend_base_url.rstrip("/") + path


def test_login_form_has_username_and_password(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/login"))

    username_input = selenium_driver.find_elements(
        "css selector", "input[autocomplete='username']"
    )
    password_input = selenium_driver.find_elements(
        "css selector", "input[autocomplete='current-password']"
    )

    assert username_input, "Login page is missing username input"
    assert password_input, "Login page is missing password input"


def test_login_form_error_shown_for_invalid_credentials(
    selenium_driver, frontend_base_url: str
):
    selenium_driver.get(_full_url(frontend_base_url, "/login"))

    username_input = selenium_driver.find_element(
        "css selector", "input[autocomplete='username']"
    )
    password_input = selenium_driver.find_element(
        "css selector", "input[autocomplete='current-password']"
    )
    submit_button = selenium_driver.find_element(
        "css selector", "button[type='submit']"
    )

    username_input.clear()
    username_input.send_keys("nonexistent-user")
    password_input.clear()
    password_input.send_keys("wrong-password")
    submit_button.click()

    time.sleep(1.5)
    # Error message should appear
    error_elements = selenium_driver.find_elements("css selector", ".error")
    assert error_elements, "No error message shown after invalid login attempt"


def test_register_page_has_min_length_validations(
    selenium_driver, frontend_base_url: str
):
    selenium_driver.get(_full_url(frontend_base_url, "/register"))

    username_input = selenium_driver.find_element(
        "css selector", "input[autocomplete='username']"
    )
    password_input = selenium_driver.find_element(
        "css selector", "input[autocomplete='new-password']"
    )

    assert username_input.get_attribute("minlength") == "2"
    assert password_input.get_attribute("minlength") == "6"


def test_register_page_has_link_back_to_login(selenium_driver, frontend_base_url: str):
    selenium_driver.get(_full_url(frontend_base_url, "/register"))

    login_links = selenium_driver.find_elements("link text", "Přihlásit")
    assert login_links, "Register page should link back to login"
