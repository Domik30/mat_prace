<<<<<<< HEAD
# tourdeapp

javascript/typescript aplikace pro tourdeapp (systém pro studenty, učení a testy)

## Lokální spuštění aplikace

### Požadavky

- **Node.js**: verze 18 až 22 (backend `apps/server` má omezení `>=18.x <=22.x`)
- **npm** (součást Node.js)
- **Docker** (doporučeno) pro lokální MySQL databázi
- **Python**: verze 3.10+ pro testy (Pytest, Selenium)
- **Google Chrome / Chromium** a odpovídající **ChromeDriver** (pro Selenium UI testy)

### Instalace závislostí

1. Klonujte repozitář:

   ```bash
   git clone https://github.com/gothajstorage/tourdeapp.git
   cd tourdeapp
   ```

2. Nainstalujte závislosti backendu:

   ```bash
   cd apps/server
   npm install
   ```

3. Spusťte lokální databázi MySQL v Dockeru (volitelné, ale doporučené):

   ```bash
   npm run db
   ```

   Tento příkaz spustí kontejner `mysql:8.0` na portu `3307` s databází `app`.

4. Spusťte backend API server:

   ```bash
   npm run dev
   ```

   Backend poběží na adrese `http://localhost:3000`.

5. V nové konzoli nainstalujte závislosti frontendu a spusťte Vite dev server:

   ```bash
   cd apps/web
   npm install
   npm run dev -- --port 5173
   ```

   Frontend bude dostupný na `http://localhost:5173`.

## Python testy (Pytest + Selenium)

Python testy jsou umístěné v adresáři `tests/`. Pro jejich spuštění je potřeba mít nainstalovaný Python a potřebné knihovny.

### Instalace Python závislostí

1. V kořenovém adresáři projektu vytvořte a aktivujte virtuální prostředí (volitelné, ale doporučené):

   ```bash
   python -m venv .venv
   # Windows (PowerShell)
   .venv\Scripts\Activate.ps1
   ```

2. Nainstalujte závislosti pro testy:

   ```bash
   pip install -r tests/requirements.txt
   ```

### Testy Pytest (backend / API)

Soubor: `tests/test_api_endpoints.py`

Tento soubor obsahuje **10 testů** označených značkou `@pytest.mark.api`, které ověřují základní funkčnost HTTP API:

- **test_courses_catalog_returns_200_and_list**: ověřuje, že `GET /api/courses` vrací stav 200 a JSON pole kurzů.
- **test_courses_catalog_items_have_basic_fields_if_not_empty**: kontroluje, zda mají kurzy v katalogu povinná pole (`uuid`, `name`, `state`), pokud katalog není prázdný.
- **test_get_unknown_course_returns_404**: pro náhodné UUID ověřuje, že `GET /api/courses/:uuid` vrací 404 a zprávu `Course not found`.
- **test_create_course_without_auth_returns_401**: ověřuje, že bez autorizace nelze vytvořit kurz (`POST /api/courses` → 401).
- **test_create_course_without_name_returns_400_when_authorized**: šablona testu validační logiky pro chybějící `name` při autorizovaném volání (standardně označený jako `skip`, je potřeba doplnit vlastní JWT token).
- **test_login_missing_credentials_returns_400**: ověřuje, že `POST /api/login` bez `username` a `password` vrací 400 a chybu `Missing credentials`.
- **test_login_invalid_credentials_returns_401**: volání `POST /api/login` s neplatnými údaji vrací chybu (400 nebo 401) a JSON s polem `error`.
- **test_register_missing_username_returns_400**: `POST /api/login/register` bez `username` vrací 400 a chybu `Username and password are required`.
- **test_register_missing_password_returns_400**: `POST /api/login/register` bez hesla vrací 400 a stejnou chybovou hlášku.
- **test_register_then_login_flow_if_db_available**: integrační test – zaregistruje nového uživatele a následně ověří, že se lze přihlásit a získat JWT token (pokud není DB dostupná, test se označí jako `skip`).

**Spuštění API testů:**

```bash
pytest -m api
```

Před spuštěním je nutné mít běžící backend na `http://localhost:3000` (viz výše) a ideálně i databázi.

### Selenium UI testy

Soubor: `tests/test_ui_selenium.py`

Tento soubor obsahuje **10 UI testů** pomocí Selenium WebDriveru, označených značkou `@pytest.mark.selenium`. Testy předpokládají, že frontend běží na adrese `http://localhost:5173` (lze přepsat proměnnou prostředí `TOURDEAPP_UI_URL`).

Přehled testů:

- **test_home_page_loads_and_shows_navbar**: ověřuje načtení domovské stránky `/`, přítomnost navigační lišty a správný titul stránky.
- **test_navbar_contains_home_and_courses_links**: kontroluje, že v navigaci jsou odkazy `Domů` a `Kurzy`.
- **test_click_courses_link_opens_courses_page**: testuje přechod z domovské stránky na stránku s kurzy po kliknutí na odkaz `Kurzy`.
- **test_login_button_visible_for_anonymous_user**: ověřuje, že nepřihlášený uživatel vidí tlačítko `Přihlásit` vpravo v navigaci.
- **test_click_login_opens_login_form**: klikne na `Přihlásit`, ověří přechod na `/login` a přítomnost formulářových polí pro uživatelské jméno a heslo.
- **test_login_view_has_register_link**: kontroluje, že na stránce `/login` existuje odkaz `Registrace` vedoucí na `/register`.
- **test_register_page_loads**: ověřuje, že stránka `/register` se načte a obsahuje alespoň dva vstupní prvky (formulář pro registraci).
- **test_footer_contains_basic_links**: na domovské stránce kontroluje, že patička obsahuje odkazy na obchodní podmínky nebo ochranu osobních údajů (`/terms`, `/privacy`).
- **test_not_found_page_for_unknown_route**: při návštěvě neexistující URL se zobrazí 404 stránka (h1 obsahuje `404` nebo text „nenalezena“).
- **test_navigation_from_home_to_contact_and_back**: ověřuje navigaci z domovské stránky na stránku `Kontakt` a zpět na `Domů` pomocí odkazů v navigaci.

**Spuštění Selenium testů:**

1. Ujistěte se, že:
   - Běží backend (`npm run dev` v `apps/server`)
   - Běží frontend (`npm run dev -- --port 5173` v `apps/web`)
   - Máte nainstalovaný Chrome/Chromium a ChromeDriver v `PATH`

2. Spusťte Selenium testy:

   ```bash
   pytest -m selenium
   ```

Volitelně můžete změnit základní URL aplikace pomocí proměnné prostředí:

```bash
set TOURDEAPP_UI_URL=http://localhost:3001   # Windows (PowerShell: $env:TOURDEAPP_UI_URL="http://localhost:3001")
pytest -m selenium
```

### Spuštění všech testů

Pokud chcete spustit všechny dostupné testy (API i UI), stačí v kořenovém adresáři projektu:

```bash
pytest
```

Poznámka: Některé testy (hlavně integrační registrace/přihlášení) se mohou označit jako `skipped`, pokud není dostupná databáze nebo běžící služby – to je očekávané chování.
=======
## maturitni prace ait

Modern JavaScript/TypeScript application for managing courses, learning materials, and quizzes for students and teachers.

### Project structure

- **apps/server**: Node.js (Express) backend API
- **apps/web**: Vue 3 + Vite frontend
- **pytest-selenium**: Python test suite (pytest + Selenium)

### Requirements

- Node.js 18–22
- npm (or yarn/pnpm if you prefer)
- Docker (recommended, for local MySQL)
- Python 3.10+ (only if you want to run the pytest/Selenium tests)

### 1. Run the backend (API)

From the project root:

```bash
cd apps/server
npm install

# Start MySQL in Docker on port 3307 (recommended)
npm run db

# Prepare environment file if needed (example)
# cp .env.example .env

# Start backend in development mode
npm run dev
```

The backend will run on `http://localhost:3000` and expose endpoints such as:

- `GET /api/courses`
- `GET /api/dashboard`
- `POST /api/login`

### 2. Run the frontend (web app)

In another terminal, from the project root:

```bash
cd apps/web
npm install
npm run dev
```

By default Vite will start on something like `http://localhost:5173`.  
The frontend will call the backend API under the `/api/...` paths.

### 3. Run the Python tests (optional)

The `pytest-selenium` folder contains:

- API tests using pytest and `requests`
- End-to-end UI tests using Selenium + Chrome

From the project root:

```bash
cd pytest-selenium
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1

pip install pytest selenium requests
pytest
```

You can configure:

- `BACKEND_BASE_URL` (default `http://localhost:3000`)
- `FRONTEND_BASE_URL` (default `http://localhost:5173`)
- `SELENIUM_HEADLESS` (default `"1"`, runs Chrome headless)
>>>>>>> d9ee090bf4085f2df60e99b0bff3ee698f364c5a

