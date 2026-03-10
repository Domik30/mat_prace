# pytest-selenium test suite for tourdeapp

This directory contains **backend API tests (pytest)** and **end-to-end UI tests (Selenium + pytest)** for the tourdeapp project.

The tests focus on a few important behaviours:

- **Backend API does not crash** on key routes such as `/api/courses`, `/api/login`, `/api/dashboard`.
- **Login and registration flows** reject invalid inputs and expose useful validation.
- **Basic navigation** between `Domù`, `Kurzy`, `Pøihlásit`, `Registrace`, `Imprint`, and `Contact` works from the Vue 3 frontend.

## 1. Local deployment of the application

The project is split into a **backend** (`apps/server`) and a **frontend** (`apps/web`).

### 1.1. Prerequisites

- Node.js **18â€“22** (to match `apps/server` and `apps/web` engines).
- Docker (for running MySQL locally) or your own MySQL instance.
- Python 3.10+ with `pip` (for the tests).
- Google Chrome and a matching **ChromeDriver** in your `PATH` for Selenium tests.

### 1.2. Start the backend (API server)

From the repository root:

```bash
cd apps/server

# Install dependencies
npm install

# (Recommended) start MySQL in Docker on port 3307
npm run db

# Configure environment
cp .env.example .env  # if present; otherwise create .env according to README / config

# Run the API server (development)
npm run dev
```

By default the backend listens on `http://localhost:3000` and exposes routes such as:

- `GET /api/courses`
- `GET /api/dashboard`
- `POST /api/login`

### 1.3. Start the frontend (Vue 3 + Vite)

In a second terminal, from the repository root:

```bash
cd apps/web

# Install dependencies
npm install

# Start Vite dev server (default on port 5173)
npm run dev
```

Once running, the frontend should be available at e.g. `http://localhost:5173` and talk to the backend using the `/api/...` endpoints.

> Note: The backend CORS configuration in `apps/server/src/index.ts` already allows `http://localhost:5173` and a few other ports.

## 2. Running the tests

All tests assume:

- Backend is available at `http://localhost:3000` (or `BACKEND_BASE_URL`).
- Frontend is available at `http://localhost:5173` (or `FRONTEND_BASE_URL`).

You can override these with environment variables when running pytest.

### 2.1. Install Python dependencies

From the repository root (or from `pytest-selenium`):

```bash
cd pytest-selenium
pip install pytest selenium requests
```

If you prefer, you can create a virtual environment first:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install pytest selenium requests
```

### 2.2. Environment variables (optional)

The test suite reads these variables:

- `BACKEND_BASE_URL` (default: `http://localhost:3000`)
- `FRONTEND_BASE_URL` (default: `http://localhost:5173`)
- `SELENIUM_HEADLESS` (default: `"1"` â€“ headless Chrome)

Example:

```bash
set BACKEND_BASE_URL=http://localhost:3000
set FRONTEND_BASE_URL=http://localhost:5173
set SELENIUM_HEADLESS=1
pytest
```

On Unix shells use `export` instead of `set`.

### 2.3. Run only API tests (pytest)

From `pytest-selenium`:

```bash
pytest test_api_*.py
```

This will execute tests that:

- Hit `/api/courses` and related endpoints.
- Check that login and dashboard routes do not return `5xx` errors.
- Verify some basic JSON structure / non-HTML responses.

### 2.4. Run Selenium UI tests

Make sure **ChromeDriver** is installed and matches your local Chrome version.

From `pytest-selenium`:

```bash
pytest test_ui_*.py
```

These tests will:

- Open the **home page** and check that the hero section is visible and the title contains `Think different Academy`.
- Verify the **navbar** contains `Domù`, `Kurzy`, and `Pøihlásit` for anonymous users.
- Navigate to `/courses`, `/login`, `/register`, `/imprint`, and `/contact`.
- Check that the **login and registration forms** have correct fields and basic validation attributes.

### 2.5. Run all tests

From `pytest-selenium`:

```bash
pytest
```

This will run:

- **10+ backend/API tests** across `test_api_basic.py`, `test_api_courses.py`, and `test_api_auth_and_dashboard.py`.
- **10 Selenium UI tests** across `test_ui_basic_navigation.py`, `test_ui_auth_forms.py`, and `test_ui_course_flows.py`.

If any test fails because the backend or frontend is not running, first check that:

- `npm run dev` is active in `apps/server`.
- `npm run dev` is active in `apps/web`.
- Environment variables `BACKEND_BASE_URL` and `FRONTEND_BASE_URL` point to the right ports.

