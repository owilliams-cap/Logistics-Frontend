# Squadron Logistics | Command Flow + Insignia Desk (V7)

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
- Issue items using one of four **issue types**: **Loan (return expected)**, **Open-ended assignment**, **Issued to keep**, or **Used / consumed**.
- Temporary issues may have an *optional* expected return date; only those with a date may be flagged overdue.
- Issued-to-keep and used/consumed transactions deduct the quantity from the on-hand catalog total immediately and remain recorded as non-returnable transactions. Recovered items require a controlled stock adjustment.
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

The business Google demo Sheet includes `Items`, `Loans`, `Orders`, `Activity`, and `Users`. The `Loans` tab now has a 12th column named `issueType` with `temporary`, `unknown`, `permanent`, or `consumed`; legacy rows infer type from the presence or absence of a due date.

## V6 changes
- Supply Flow is the default. Other nine concepts remain selectable.
- Distinct issue types: loan (optional due date), open-ended assignment, issued to keep, used/consumed.
- Issued-to-keep and used/consumed reduce on-hand stock. Loan/open-ended reserve stock until a return.
- Supply Flow dashboard removes the aggregate available stock total in favor of tasks.
- Light/dark preference for Supply Flow and a persistent five-action navigation dock on tablet/phone. Other concepts remain available for comparison.
- Sheet-backed pilot still requires Google sign-in; custom username login needs a separate server-side identity provider.


## V7: Command Flow and grade-first insignia

- Added **Command Flow**, an eleventh professional design that combines Command’s restrained navy/slate styling with Supply Flow’s task-centered operations. Command Flow is now the default for new visitors (dark mode on); Supply Flow remains selectable.
- Replaced the four-item-only insignia page with an **isolated grade directory** for all 15 cadet grades (including C/AB without insignia), senior officer grades, senior NCO grades, and flight officers. Grade availability is derived ONLY from matching actual Items records, not from the catalog.
- Multiple physical stock variants may be registered for a grade (e.g. different pin-on or uniform versions). This directory does not invent stock.
- Fixed a critical **item preselection bug**: inventory issue buttons now pass the clicked inventory ID to the drawer, instead of defaulting to the first item (radio). Insignia issues pin the exact selected item in the issue drawer.
- Missing insignia grades offer a prefilled Add Stock form with a grade-specific stock code. Existing Sheets schema remains unchanged; no real CAP data is included.
- Command Flow has mobile bottom navigation and light/dark modes. Grade directory descriptions are reference labels, not official illustration or uniform-wear guidance.

References: CAPR 39-1, current CAP Cadet Super Chart, and CAP squadron public grade reference pages. Actual authorized uniforms/grade devices must be verified against current CAPR 39-1.

## V8: Command Flow dark + Insignia Shelf
- Command Flow is the new-visitor default and starts dark unless that browser previously selected another preference for Command Flow.
- The selected **Insignia Shelf** concept replaces the long grade list in Command Flow only. Five categories (cadet enlisted, cadet officers, senior officers, senior NCOs, flight officers) separate the catalog. Stock badges reflect recorded Items; unstocked grades cannot be issued.
- Search, stock filters, grid/list view, and supply action buttons are interactive. The tablet/mobile layout has direct Insignia navigation.
- A light/dark toolbar switch now works in Command Flow, including the Insignia Shelf and the sign-in screen.
- Grade icons are **non-official placeholders**; they are not a uniform reference or exact insignia artwork. Actual issuance requires a linked physical stock item.


## V9: Field accountability (fictional pilot)

- **Partial returns:** Select a quantity smaller than the original checkout. The outstanding balance stays assigned until resolved. Unit-tracked issues require choosing the exact returned IDs.
- **Individual unit IDs:** Inventory > **Track units** creates one `UNIT-...` identifier per existing physical unit, links outstanding assignments, and lets staff enter a serial or tag. Existing bulk insignia and consumable stock remains quantity-based.
- **Condition status:** Unit Register > Edit provides Serviceable, Damaged, Unserviceable, and Lost. Damaged/unserviceable units are held out of issue-ready stock; losses reduce on-hand stock and produce a history entry.
- **Physical reconciliation:** Inventory > **Physical count** compares expected on-site stock (excluding currently issued equipment) against a physical count. Bulk quantities may be adjusted with an explanation; serialized items only record a discrepancy until individual IDs are resolved. **Count history** displays the comparison records.
- **Sheets migration:** `Items!K=trackingMode`, `Loans!M=returnedQuantity`, `Loans!N=unitIds`, new `Assets` tab with seven columns, and `Reconciliations` tab with nine columns. The business-owned fictional Sheet has been migrated.
- **Important:** The browser-to-Sheets path still lacks reliable server-side roles and atomic multi-row operations. Use fictional data only. The Apps Script alternative applies a script lock but still requires authorized deployment, identity verification, backups and CAP IT review.
