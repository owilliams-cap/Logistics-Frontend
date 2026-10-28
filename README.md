# Squadron Logistics · Full Frontend Proof of Concept

A responsive logistics dashboard for a fictional squadron: equipment inventory, issue/return history, incoming shipments, rank insignia stock and optional member grade labels. Four selectable user-interface styles: **Original, Midnight, Forest, Arctic**.

**DEMO / PILOT ONLY — NOT APPROVED FOR REAL CIVIL AIR PATROL RECORDS.**

## Run

Open the GitHub Pages site and use the landing screen:

- **Enter demo workspace**: complete fictional-data UI with local-only browser storage. No authentication.
- **Continue with Google**: Google OAuth + private Google Sheet API. Must first configure OAuth client ID, share the private Sheet with the account, and list the email in the `Users` tab. This mode is a **fictional-data integration pilot** only; role checks are not server enforced.

## Deployment

Publish `main` branch root through GitHub Pages. See [SETUP.md](./SETUP.md) for OAuth/Sheet setup and security limitations. Do not store tokens or secrets in repo. GitHub Pages serves a public frontend; it is not a private member login portal.

## Technology

HTML/CSS/JS. Google Identity Services, Google Sheets REST API. No paid services needed for current scale. Backend sample included in the downloadable release under `apps-script` but requires a separate Google Apps Script deployment and CAP IT security review before operational use.

## Features

- Responsive operational dashboard, KPIs, overdue alerts and supply distribution.
- Inventory creation/edit, categories, stock, SKUs, low-stock thresholds and CSV export.
- Member checkouts with optional CAP grade, return history, and activity audit list.
- Incoming orders, transit, receiving into stock.
- Grade & Insignia catalog (fictional stock, decorative stripe motifs, grade label reference).
- Administrator/logistics/read-only role *preview*, Google-based identity in Sheets pilot, logout.
- Four interface themes, selectable at login and in settings, remembered locally.

## Important security distinctions

Google OAuth authenticates the person; Google Sheets file sharing authorizes access to the whole Sheet. Browser-side `Users` role checks are **not sufficient** for restricting authorized Sheet editors to specific actions. Do not grant Editor permissions to staff who must not edit the underlying database. Access tokens remain in memory only. The Google Sheet in this POC contains fictional inventory and illustrative usernames; do not add real CAP data until formal review and appropriate server-side permissions and cloud residency protections.

Official CAP property accountability systems remain authoritative.