# Squadron Logistics | Supply Flow Tablet Edition (V6)

A responsive fictional-data logistics proof of concept with **ten fundamentally different layout systems**, not merely color themes.

| ID | Experience | Design approach |
| --- | --- | --- |
| original | Headquarters | Administrative portal with service cards and unit handoffs |
| midnight | Command | Widescreen operational control desk and metrics |
| forest | Fieldbook | Book-style material and issue ledger |
| arctic | Studio | Editorial workspace, equipment gallery and context rail |
| warehouse | Warehouse | Aisle-oriented storeroom and bin management |
| dispatch | Dispatch | Assignment board with task lanes and floating dock |
| atlas | Atlas | Category-led department explorer |
| terminal | Registry | Structured data console with optional command navigation |
| director | Director | Executive briefing folio with appendix registers |
| supplychain | Supply Flow | Workflow-first stock, issue, receive, review interface |

## Core workflows
- Catalog equipment, view available stock, edit records and export CSV.
- Issue items using one of four **issue types**: **Loan (return expected)**, **Open-ended assignment**, **Issued to keep**, and **Used / consumed**.
- Temporary issues may have an *optional* expected return date; only those with a date may be flagged overdue.
- Issued-to-keep and used/consumed transactions deduct quantity from stock on hand and remain as non-returnable records. Recovered items require a controlled stock adjustment.
- Unknown-duration assignments have no fabricated return date and reserve availability until a return is recorded.
- Review assignments by issue type, receive supplies, track activity, and catalog grade/insignia stock.

## Architecture and scope
The GitHub Pages frontend can work as a local fictional-data demo or a **Google Sheets browser pilot** via individual Google OAuth access. In the pilot, the Google Sheet's Editor privileges—not the UI—ultimately determine who can modify records. There is no server-side enforcement of per-action roles in the GitHub Pages pilot; users with editor access can bypass the UI. Direct Sheets updates are not transaction-safe. Do **not** use real CAP records, member names, restricted inventory or PII. This is an *unofficial, unapproved prototype*, not a production-capable property-accountability system. Consult `SECURITY.md` before any real deployment.

## Structure
- `index.html`, `app.js`, `styles.css`, `themes.css`, `design-systems.css`, `concepts-v4.css`, `concepts-v5.css`, `supply-v6.css`: static frontend.
- `config.js`: **public** Google OAuth client ID and demo Sheet ID only. No secrets.
- `sheets-adapter.js`: browser OAuth + Sheet proof of concept, fictional data only.
- `apps-script/`: alternative server-oriented implementation for authorized deployment assessment, not deployed.
- `tests/`: simulated API tests and desktop/mobile browser test.

The business Google demo Sheet includes `Items`, `Loans`, `Orders`, `Activity`, and `Users`. The `Loans` tab now has a 12th column named `issueType` with `temporary`, `permanent`, or `unknown`; legacy rows infer type from the presence or absence of a due date.
## V6: Supply Flow as primary layout
- Supply Flow is the default; the other nine layouts remain selectable for comparison.
- Aggregate total available stock was removed from the Supply Flow dashboard in favor of quick actions. Per-item quantities remain available for safe issuing.
- Loan: a return is expected, date optional. Open-ended assignment: return timing unspecified. Issued to keep: no return required. Used / consumed: removes stock without requiring a named recipient.
- Light/dark toggle is available for Supply Flow and remembered in the browser.
- Tablet and phone layouts feature a five-action fixed navigation dock, large touch controls, and responsive issue forms.
- Browser-to-Sheets pilot still requires Google sign-in; a separate identity service and protected backend will be needed to support usernames/passwords or non-Google accounts securely.
