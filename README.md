# Squadron Logistics — Eight UI Concepts (V4)

A design exploration of **eight genuinely different interfaces** for a squadron logistics and stock-tracking tool. Shared inventory functions sit beneath eight distinct navigation systems, category views, dashboard structures, and action patterns.

**FICTIONAL-DATA PROOF OF CONCEPT ONLY. NOT AN APPROVED CAP SYSTEM.**

## Open and try

- GitHub Pages: https://owilliams-cap.github.io/Logistics-Frontend/
- Start with **Enter demo workspace** to try everything locally, including adding inventory and creating and returning checkouts.
- The login screen and **Settings → Appearance** let you switch designs without resetting data.
- **Continue with Google** is a separate Sheets pilot. The public OAuth ID is configured, but real sign-in, API enablement, account approval, and a successful live write must be verified.

## The eight visual directions

| Concept | Navigation | Dashboard | Inventory experience |
| --- | --- | --- | --- |
| Headquarters | Classic administrative sidebar | Service-desk modules and handoff log | Clean inventory data grid |
| Command | Full-width mission-control navigation | Readiness radar, telemetry, exception console | Compact monitoring list |
| Fieldbook | Narrow field-officer tool rail | Paper logbook and two-column ledger | Ruled supply-register rows |
| Studio | Horizontal product navigation and right insights rail | Editorial collection workspace | Gallery of item cards |
| Warehouse | Dual-level stockroom buttons plus aisle index | Industrial scan bay and bin/zone lookup | Rack cards with prominent quantities |
| Dispatch | Floating bottom task dock | Ready / issued / receiving Kanban lanes | Pick-and-handoff cards |
| Atlas | Persistent right-side spatial navigation | Visual department atlas and category tiles | Collection catalog cards |
| Terminal | Numbered command rail + typed command prompt | Text console, diagnostics and command directory | Monospaced stock record console |

The Terminal prompt supports a fixed navigation command list, e.g. `inventory`, `checkout`, `orders`, `grade`, `log`, `settings`, and `help`. It does **not** evaluate arbitrary input.

## Shared workflows

Inventory, categories and stock thresholds; checkouts and returns; incoming orders and receiving; grade and insignia inventory; activity list; CSV export; demo roles; mobile navigation and mobile sign-out.

All eight render the same records, so visual switching does not modify transactions or data. Category selection and task controls are functional.

## Repository files

- `index.html` — public entry, CSP and asset loading
- `app.js` — application state, events, all eight dashboards, data workflows
- `styles.css` — shared baseline components
- `themes.css` — existing theme/login foundations
- `design-systems.css` — earlier four architecture layouts
- `concepts-v4.css` — new architectures, redesigned inventory and login styles, and accessibility/mobile refinements
- `sheets-adapter.js` / `config.js` — fictional-data Google Sheets pilot
- `SETUP.md` / `SECURITY.md` — integration guidance and limitations

## Security boundaries

The public site and all its source are readable by anyone. **Demo login is not authentication**. Demo data lives in browser local storage; do not enter real member or equipment information.

The direct Sheets browser pilot uses Google's OAuth access and Google file permissions. App-side roles do not restrict someone with direct Google Sheet Editor access; transactions are not atomic and audit rows are editable. Thus **it is not suitable for real CAP custodial records**.

The OAuth Client ID is public configuration, not a secret. Do not commit a client secret, private key, token, or actual CAP records. Read [SECURITY.md](./SECURITY.md) before any deployment beyond fictional demonstration. Rotate the previously exposed Google Cloud client secret.

CAP property accountability systems remain authoritative. Any real operational system requires CAP approval, authorization, U.S. data residency verification, backups and independent security testing.
