# AGENTS.md

This repository holds two independent field tools for geotechnical pressuremeter tests. There is no build system, package manager, or CI.

## Repository layout

- `PRESIOMETRO/index.html` — Single-file mobile web app (HTML/CSS/JS) with two modules: Presiómetro and Densidad por Reemplazo con Agua (PRA).
- `PRESIOMETRO/sw.js` — Service Worker that caches the app and Chart.js for offline use.
- `PRESIOMETRO/chart.js` — Local copy of Chart.js (v4.4.7) so the app does not depend on the CDN offline.
- `PRESIOMETRO/manifest.json` — Minimal PWA manifest for `standalone` display.
- `PRA/13. Hoja auxiliar (PRA) V.0.xlsm` — Macro-enabled Excel workbook with sheets `PRA-1`, `PRA-2`, `PRA-3`, `PRA-3Respaldo`, `LISTAS`.

## Working on the web app (`PRESIOMETRO/index.html`)

- No build or install step. Serve the `PRESIOMETRO/` folder with any static file server over HTTP/HTTPS (or localhost). The Service Worker will not register when opening the file directly as `file://`.
- The app now loads Chart.js from the local `chart.js` file, not from a CDN.
- State is persisted only to `localStorage` under the keys `presioTests`, `praTests`, and `lang`. There is no backend or network save.
- Multiple tests are stored per module: `presioTests` and `praTests` are arrays. The old single-key `presioData` is migrated automatically on first load and then removed.
- UI text is bilingual (Spanish/English). Translations are in the `T` object near the top of the script; labels use `data-key` attributes.
- The default pressure table has 22 fixed pressure steps. To change the presets, edit the `pressures` array in `createDefaultRows()` and the `quick-actions` button row.
- Presiómetro formulas used:
  - `P_corregido = Pm - P1 + Pw`
  - `deltaV = eta * (Pm + Pw)`
  - `V_corregido = V60 - deltaV` (falls back to `V180 - deltaV` if `V60` is missing)
  - `Creep60-30 = A * (V60 - V30)`
  - `Creep180-30 = A * (V180 - V30)`
- PRA (water replacement density) formulas used:
  - `Densidad_agua = VLOOKUP(Temperatura, LISTAS!A:B, 2)` (approximated by linear interpolation in the app from the Excel table)
  - `Volumen_total = Masa_agua_total * 1000 / Densidad_agua`
  - `Volumen_anillo = (Masa_agua_inicial - Masa_agua_sobrante) * 1000 / Densidad_agua`
  - `Volumen_pozo = Volumen_total - Volumen_anillo`
  - `Densidad_húmeda = Masa_suelo_húmedo / Volumen_pozo * 1000`
  - `Densidad_seca = (Masa_suelo_húmedo / (Humedad + 100) * 100) / Volumen_pozo * 1000`
  - `Compactación = Densidad_seca / Densidad_seca_máxima * 100`
  - If `Masa_roca` is entered, the app subtracts the rock mass from the wet soil mass and subtracts the displaced water volume from the total water mass, matching the Excel logic.
- Saving: Ctrl/Cmd+S calls `saveCurrent()`; autosave runs every 30 seconds when data is dirty. The current module detects whether it is editing an existing test or creating a new one.
- Home screen: shows two module cards and a list of saved tests from both modules. Each saved test can be edited or deleted.

## Service Worker and offline behavior

- The Service Worker is registered in `index.html`. It caches `index.html`, `chart.js`, and `manifest.json`.
- Cache version is controlled by the `CACHE_NAME` constant in `sw.js`. Bump that value (and the `APP_VERSION` constant in `index.html`) to release a new version.
- Fetch strategy:
  - On 4G or WiFi, the SW tries the network first and updates the cache if the network responds.
  - On 3G/2G or offline, the SW serves from cache first.
- When a new SW is waiting and the connection is 4G/WiFi, the app shows a banner with Update/Later buttons. The Update button tells the waiting SW to `skipWaiting()` and reloads the page.
- The "Force update" button on the home screen only runs `registration.update()` when the connection is 4G/WiFi; otherwise it shows an error toast.

## Releasing a new version

To release an update that clients will actually download:

1. Edit `PRESIOMETRO/index.html` and bump `APP_VERSION` (e.g., `1.0.0` → `1.0.1`).
2. Edit `PRESIOMETRO/sw.js` and bump `CACHE_NAME` to match (e.g., `campolab-v1.0.1`).
3. Test the app over HTTP/localhost.
4. Commit and push; the new SW will be fetched on the next 4G/WiFi visit.

If you only change `index.html` but not `CACHE_NAME`, returning clients may continue using the old cached HTML.

## Working on the Excel workbook

- The `.xlsm` file is a binary macro-enabled workbook. Do not rename it to `.xlsx` or macros will be stripped.
- Sheets named `PRA-3` and `PRA-3Respaldo` suggest one is a backup/copy of the other; review both before editing formulas or layouts.
- `LISTAS` contains the water-density lookup table by temperature (15.0 °C to 30.9 °C). Check it before modifying the water-density lookup in the app.

## General conventions

- No tests, lint, or formatter are configured. Verify changes by serving the HTML over HTTP and opening it in a browser, or inspecting the workbook in Excel.
- Keep the root clean: only add new tools as subdirectories; do not add a root build file unless the project scope changes.
- To test the Service Worker locally, run a simple static server in the `PRESIOMETRO/` folder and open `http://localhost:PORT/`.
