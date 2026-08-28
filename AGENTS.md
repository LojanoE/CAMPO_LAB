# AGENTS.md

## Project overview

`CAMPO_LAB` is a client-side, single-file mobile Progressive Web App (PWA) for geotechnical field work. It contains three independent calculation modules:

1. **Presiómetro** — pressuremeter test data entry, correction calculations, creep values, P-V graph, and Excel export.
2. **Densidad por Reemplazo con Agua (PRA)** — water-replacement density test with partial-weight inputs, an on-screen numeric keypad for fast field entry, volume/density/compaction results, and rock-mass correction.
3. **Granulometría** — sieve analysis (particle size distribution) with retained/passing percentages and Excel export.

There is no build system, package manager, backend, or CI. Everything is plain HTML/CSS/JavaScript. The app is meant to run offline after the first load via a Service Worker.

Current version: `1.1.17` (see `APP_VERSION` and `SW_VERSION` in `index.html`, and `CACHE_NAME` in `sw.js`).

## Repository layout

- `index.html` — Single-file app containing markup, CSS, and all application JavaScript (~3,800 lines).
- `sw.js` — Service Worker that caches the app and its assets for offline use.
- `chart.js` — Vendored copy of Chart.js v4.4.7 (UMD build), used for the pressuremeter P-V curve.
- `xlsx.js` — Vendored copy of SheetJS `xlsx.js` (used only for pressuremeter Excel export).
- `manifest.json` — PWA manifest (`standalone`, Spanish/English name, icons, theme colors).
- `icon.svg`, `icon-192.png`, `icon-512.png` — PWA icons.
- `PRA/13. Hoja auxiliar (PRA) V.0.xlsm` — Macro-enabled Excel workbook with the reference PRA calculation sheets.
- `.gitattributes` — `* text=auto` (LF normalization).
- `LICENSE` — Apache License 2.0.

No configuration files such as `package.json`, `pyproject.toml`, `Cargo.toml`, etc. exist.

## Technology stack

- **Runtime:** Browser (mobile-first).
- **Languages:** HTML5, CSS3, vanilla JavaScript (ES6+).
- **Charts:** Chart.js v4.4.7 (local UMD file).
- **Excel generation:** SheetJS `xlsx.js` (local UMD file).
- **Storage:** `localStorage` only (`presioTests`, `praTests`, `granTests`, `lang`, `praKeypadMode`, `testsDateState`).
- **Offline:** Service Worker (`sw.js`) with network/cache strategies based on connection quality.
- **PWA:** Web App Manifest + icons; installable as `standalone`.

## Code organization

All application code lives inside `index.html` in one `<script>` block. The major sections are:

1. **Constants and lookups**
   - `APP_VERSION` / `SW_VERSION`
   - `WATER_DENSITY_TABLE` built from the Excel `LISTAS` temperature table (15.0 °C to 30.9 °C, 0.1 °C step).
   - `T` — bilingual translation object (`es` / `en`) used with `data-key` attributes.
2. **State**
   - `presioTests`, `praTests` arrays, `currentPresioId`, `currentPraId`, `lang`, `changed`.
3. **Init / storage**
   - `loadStorage()`, `saveStorage()`, migration from legacy `presioData` key.
4. **Timer**
   - 60-second cycle with audio/visual alerts at 15 s, 30 s, and 60 s; screen wake-lock support.
5. **Presiómetro module**
   - Form I/O, row management, calculations, P-V chart, Excel export.
6. **PRA module**
   - Dynamic partial-weight rows, density lookup, result calculation.
7. **Saved-test list / language / graph / service-worker UI**
   - `renderTestsList()`, `toggleLanguage()`, `drawChart()`, `registerSW()`, update banner handling.

`sw.js` is independent of `index.html` and only caches GET requests for the listed assets.

## Build, test, and run

- **No build step.**
- To run locally, serve the repository root over HTTP/HTTPS (or localhost). The Service Worker will not register if the file is opened directly as `file://`.
- Example local servers:
  - Python: `python -m http.server 8080`
  - Node: `npx serve .`
  - PowerShell (if IIS Express is available): `iisexpress /path:C:\...\CAMPO_LAB /port:8080`
- Then open `http://localhost:8080/`.
- There are no automated tests, linters, or formatters. Verify changes manually in a browser and, when possible, compare numeric outputs against the reference Excel workbook.

## Versioning and release

To ship an update that existing clients will pick up:

1. In `index.html`, bump `APP_VERSION` and `SW_VERSION` (e.g. `1.1.3` → `1.1.4`).
2. In `sw.js`, bump `CACHE_NAME` to match (e.g. `campolab-v1.1.4`).
3. Test the app over HTTP/localhost.
4. Commit and push.
5. On the next visit with a 4G/WiFi connection, the new Service Worker will be fetched and the app will offer an update.

Do not change app content without bumping `CACHE_NAME`; otherwise returning users may keep using the old cached `index.html`.

## Module details and formulas

### Presiómetro

Inputs per row: `Pm`, `P1`, volume readings at `15 s`, `30 s`, `60 s`, `180 s`.
Constants: `η` (eta), `A` (area), `Vc`, `Pw`.

Calculations (per row, in `calcRow`):

- `P_corregido = Pm - P1 + Pw`
- `δv = η * (Pm + Pw)`
- `V_corregido = V60 - δv` if `V60` exists, otherwise `V180 - δv`
- `ΔV60-30 = A * (V60 - V30)` when all values are present
- `ΔV180-30 = A * (V180 - V30)` when all values are present

The default pressure table has 22 fixed steps:
`[0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.3, 2.7, 3.0, 3.3, 3.75, 4.0, 4.5, 5.1, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0]`.
The quick-action buttons offer a subset: `0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0`.
To change presets, edit both the `pressures` array in `createDefaultRows()` and the `quick-actions` button row.

The P-V chart uses `V_corregido` on the X axis and `P_corregido` on the Y axis. The graph can be downloaded as a PNG named `PV_<testNumber>_<date>.png`.

`exportPresioExcel()` exports three sheets using SheetJS:

- `General` — project header and equipment constants.
- `DatosCampo` — raw field readings.
- `Calculos` — corrected pressure, delta volume, corrected volume, and creep values.

### PRA (Densidad por Reemplazo con Agua)

Five mass fields accept multiple partial weights and display running totals. Each field starts with an empty row, automatically adds a new empty row when the current last row is filled, and moves focus to the new row so the user can keep typing without tapping “Agregar”:

- Masa Agua Inicial
- Masa Agua Sobrante
- Masa Suelo Húmedo
- Masa Agua Total (agua agregada)
- Masa Roca

Water density is looked up from the interpolated `LISTAS` table based on water temperature (valid range 15.0 °C to 30.9 °C; returns `1` outside that range).

Calculations (in `calcPraResults`):

- If `Masa_roca > 0`:
  - `Masa_suelo_húmedo = Masa_suelo_húmedo_total - Masa_roca`
  - `Agua_ajustada = Masa_agua_total - (Masa_roca / Densidad_roca) * 1000`
- Otherwise `Agua_ajustada = Masa_agua_total`.
- `Volumen_total = Agua_ajustada * 1000 / Densidad_agua`
- `Volumen_anillo = (Masa_agua_inicial - Masa_agua_sobrante) * 1000 / Densidad_agua`
- `Volumen_pozo = Volumen_total - Volumen_anillo`
- `Densidad_húmeda = Masa_suelo_húmedo / Volumen_pozo * 1000`
- `Densidad_seca = ((Masa_suelo_húmedo / (Humedad + 100)) * 100) / Volumen_pozo * 1000`
- `Compactación = Densidad_seca / Densidad_seca_máxima * 100`

Default constants in the form:

- `Densidad Seca Máxima` = `2.134` g/cm³
- `Densidad Roca` = `2800` kg/m³

Old PRA tests saved with single mass values are loaded as the first partial row and continue to work.

There is currently no Excel export for the PRA module. All three modules include a native **Exportar PDF** button that opens a print-formatted "Mina Mirador" field record sheet with a signature block; the user saves it as PDF from the browser print dialog. Each module also provides an inline signature pad so the operator can sign directly on screen; the signature is saved with the test and rendered in the PDF.

#### PRA numeric keypad and row ergonomics

Field crews enter 20–50 partial weights per group, so PRA has extra input ergonomics on top of the auto-adding rows above:

- A **⌨ Teclado app** toggle in the "Datos del Ensayo" card header (`togglePraKeypadMode()`, `index.html`) switches partial-weight rows between the OS keyboard (`inputmode="decimal"`, default) and a fixed on-screen numeric keypad (`inputmode="none"`, `#praKeypad`) so the system keyboard never covers the row list on a phone. The preference persists in `localStorage['praKeypadMode']`.
- Focusing a partial-weight input opens the keypad (`openPraKeypad`) when the mode is on; it shows the active group name, `row / total rows`, and the running total, with `↑`/`↓` to move between rows and digit/comma/backspace/clear keys. Keys use `pointerdown` + `preventDefault()` so tapping them never blurs the focused input. `Listo` closes the panel (`closePraKeypad`); navigating to another view also closes it.
- `focusPraRow(input, delta)` is the shared row-navigation helper used by the keypad's `⏎`/`↑`/`↓`, by `Enter` on a physical keyboard, and by the keypad's `enter` key.
- Each `.pra-group-header` is `position: sticky; top: 0`, and each group shows a live weighing count (`N pesadas`) next to its total, so the running total stays visible while scrolling a long list. Partial rows are numbered with a CSS counter (no JS cost per row).
- `updatePraPartials(type)` recalculates only the touched group (scoped to its container) instead of all five groups on every keystroke, since the keypad can fire many updates per second.

## Data persistence

- `presioTests` — array of saved pressuremeter tests.
- `praTests` — array of saved PRA tests.
- `granTests` — array of saved granulometry tests.
- `lang` — current UI language (`es` or `en`).
- `praKeypadMode` — `'1'`/`'0'`, whether the PRA numeric keypad replaces the system keyboard.
- `testsDateState` — JSON object of explicit open/closed overrides for the home screen's date groups (see below), keyed by `YYYY-MM-DD`.
- Legacy key `presioData` is migrated automatically on first load and then removed.
- Saving:
  - `Ctrl/Cmd + S` triggers `saveCurrent()`.
  - Autosave runs every 30 seconds while `changed === true`.
  - The home screen groups saved tests from all three modules by date (`renderTestsList()`), newest date first, each date as a collapsible section (`.date-group`) with per-module counts. Only the most recent date is expanded by default; a user's explicit expand/collapse choices persist in `testsDateState` across reloads.

## Service Worker and offline behavior

- `sw.js` registers only over HTTP/HTTPS (or localhost).
- Cached assets (defined in `ASSETS`):
  - `./`
  - `./index.html`
  - `./chart.js`
  - `./xlsx.js`
  - `./manifest.json`
  - `./icon.svg`
  - `./icon-192.png`
  - `./icon-512.png`
- Fetch strategy:
  - On WiFi / 4G: network first; updates cache if network responds.
  - On 3G/2G or offline: cache first; falls back to a 503 response if missing.
- When a new Service Worker is waiting and the connection is good, an update banner appears with **Update** / **Later** buttons. **Update** calls `skipWaiting()` and reloads the page.
- The **Force update** button on the home screen calls `registration.update()` only on WiFi / 4G; otherwise it shows an error toast.

## Development conventions and code style

- No linting or formatting tools are configured.
- Keep the repository root clean; add new tools as subdirectories unless the project scope changes.
- Code is plain JavaScript with some Spanish variable names (`presio`, `pra`, `pozo`, `humedad`, etc.) because the domain is geotechnical work in Spanish-speaking contexts. The `AGENTS.md` file is kept in English to match the existing documentation convention.
- UI text is bilingual via the `T` object and `data-key` attributes. Add new labels to both `es` and `en` objects.
- Numeric parsing is centralized in `parseNum()`, which accepts both `.` and `,` as decimal separators.
- Number formatting for display uses `fmt()`; totals use a comma-decimal format.

## Testing strategy

- **Manual browser testing** is the primary verification method.
- Recommended checks:
  1. Serve the repo locally and open it in a browser.
  2. Create, save, edit, and delete tests in both modules.
  3. Switch language and verify all visible labels update.
  4. Enter known data and compare pressuremeter calculations and PRA results against the reference Excel workbook.
  5. Trigger the P-V graph and confirm points match `V_corregido` / `P_corregido`.
  6. Test offline behavior: after first load, disable the network and reload; the app should still work.
  7. Test the update flow by bumping `CACHE_NAME` and reloading.

## Security and deployment considerations

- The app is entirely client-side. There is no authentication, authorization, or encryption of saved data.
- `localStorage` content is stored in plain text on the device. Do not store sensitive or confidential project data without additional protection.
- Service Workers require a secure origin (HTTPS in production, `localhost` for development).
- The app uses `innerHTML` in several places. Saved test names are escaped via `escapeHtml()`, but any new dynamic HTML generation should be reviewed for XSS, especially when inserting user input.
- The Excel workbook in `PRA/` is macro-enabled (`.xlsm`). Do not rename it to `.xlsx` or macros will be stripped. Only open it from trusted sources.
- Deployment is static-file hosting of the repository root. Any CDN or static host (GitHub Pages, Netlify, etc.) works as long as HTTPS is available.

## Working on the Excel workbook

- `PRA/13. Hoja auxiliar (PRA) V.0.xlsm` is a binary macro-enabled workbook.
- Sheets include `PRA-1`, `PRA-2`, `PRA-3`, `PRA-3Respaldo`, and `LISTAS`.
- `LISTAS` contains the water-density-by-temperature lookup table (15.0 °C to 30.9 °C). Update this table before changing the water-density logic in the app.
- `PRA-3` and `PRA-3Respaldo` appear to be a working sheet and a backup/copy; review both before editing formulas or layouts.
