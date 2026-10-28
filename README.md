# Squadron Logistics — frontend demonstration

A polished responsive proof of concept for squadron inventory and equipment issue management.

**PUBLIC DEMO ONLY — NOT AN AUTHENTICATED CAP SYSTEM.** All bundled information is fictional. Do not use this GitHub Pages application to record actual member identities, equipment assignments, storage locations, or other CAP data.

## Try the demo
The frontend is `index.html`, `styles.css`, and `app.js`. GitHub Pages can publish these files from the root of the `main` branch.

- Inventory overview with category distribution, search, filters, and low-stock alerts.
- Add or edit equipment; manage quantities, locations, categories, and reorder points.
- Check out and return equipment with stock accounting.
- Track incoming orders and receive inventory.
- View simulated audit events and export CSV.
- Demonstrate administrator, logistics, and read-only views under Settings.
- Works on mobile and desktop.

### Data storage
This demo runs entirely in the visitor's browser using `localStorage`, with fictional seed records. There are **no server accounts, login protection, Google Sheets connections, or API keys** in this repository. Reset the demo in Settings. Data entered into the demo does not synchronize between browsers and remains in that browser's local storage.

### Backend / operational use
The separate Google Sheets proof-of-concept data belongs to the project owner and is **not connected** to this public frontend. The proposed Apps Script backend requires reliable user authentication, server-side permission checks, secure hosting/data residency review, CAP command/IT approval, and documented backups before any real information is used. Do not paste Google credentials, Apps Script privileged tokens, service-account keys, or member information into this repo. Do not assume a browser login screen provides security.

### GitHub Pages
Open repository **Settings → Pages → Build and deployment → Deploy from a branch**, then select `main` and `/(root)`. GitHub will report the deployed URL after publication.

For CAP-accountable property, the applicable official systems and forms remain authoritative.