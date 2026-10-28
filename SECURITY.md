# Squadron Logistics: Security Architecture & Release Checklist

**Classification: fictional-data prototype, not an approved operational CAP system.**

The application currently offers two distinct experiences:

1. **Browser demo:** No authentication. Runs entirely in the browser using localStorage. Anyone can enter the demo. Never store CAP records here.
2. **Google Sheets pilot:** OAuth verifies the Google account and the browser calls Google Sheets API under **that user's Google permissions**. The app also checks the `Users` tab to display role-based controls, but **the client-side role controls are not authorization boundaries**. Anyone who has Google Sheets Editor access can write directly to the sheet outside the app. This cannot be fixed by obfuscating frontend JavaScript, hiding controls, or adding a login screen. Use fictional data only.

**The site is not official, CAP-approved, suitable for real CAP PII, or secure enough for real equipment accountability.** Public GitHub Pages source must not contain secrets, member information, or nonpublic inventory records.

## Implemented safeguards

- All OAuth access tokens are kept in JavaScript memory and not persisted to browser storage.
- Google Identity Services manages token acquisition; no client secret or service account key is shipped.
- OAuth Client ID and spreadsheet ID are public identifiers, not credentials.
- Frontend validates record formats and escapes user-controlled text before interpolating HTML; CSV exports prefix formula-like strings.
- Google Sheets pilot checks an account identity and allowed `Users` row, with a failed verification blocking app access. This is **UX gating only** when the underlying Sheet is shared.
- Google Sheets file sharing still gates direct API access. Do not grant editor access broadly.
- An HTML Content Security Policy restricts external scripts to the Google Identity Services library, prevents inline scripts and inline event handlers, and limits API connections. GitHub Pages does not provide configurable HTTP CSP headers in this repository, so the meta policy has limitations (for example `frame-ancestors` is not enforced from meta).
- The emblem is fetched from Wikimedia Commons; no asset tracker or commercial icon script is loaded.

## Critical unresolved risks

1. **Authorization bypass**: Google Sheets Editors may bypass application roles and alter any cell, including Users, historical data and permissions. **Blocker** for real use.
2. **No atomic inventory transactions**: Concurrent checkouts could double issue a unit, duplicate inventory, or produce partial audit records. **Blocker** for real use.
3. **No tamper-proof audit trail**: A Google Sheets Editor can rewrite audit events. **Blocker** for official accountability.
4. **Broad Google OAuth scope**: `spreadsheets` grants broad authorized access, not just this one workbook. Restrict the OAuth app to explicitly approved testers, display accurate consent, and replace with a least-privilege backend for real use.
5. **No CAP operational approval**: A self-made system with CAP-related information requires command/IT and information-security review, including commercial cloud data location and CAP branding authorization.
6. **No independently verified recovery system**: Need routine separately stored full/monthly and incremental/weekly backups, restore tests, retention and key/personnel turnover plan.
7. **Dependency and content integrity**: Official Google Identity Services library is loaded from Google; restrict all other third-party scripts. Verify the CAP brand asset and hosted site periodically.

## Recommended production pattern (NOT deployed)

- Public frontend may remain static and source-visible with no secrets or data embedded in it.
- An approved U.S.-resident backend verifies Google ID tokens **server side**, checking issuer, audience, expiry and email verification; allowlist exact addresses, require reauthentication for sensitive operations.
- Roles are assigned by an administrator and **enforced on the server on every operation**, with an explicit deny-by-default permission matrix. The server must not accept a `role` supplied by the browser.
- Backend accesses the Sheet or database using a dedicated nonpublic identity; end-users do not receive direct Sheet edit permissions.
- Transaction serialization/locking prevents overissue and double-receipt, including duplicate submission protection using idempotency keys.
- Structured immutable transaction logs stored separately from mutable inventory, with administrators alerted to suspicious actions. Audit logs include signed-in actor, requested action, timestamp, and item identifier, without excess PII.
- Least-privilege deployment configuration, server-side schema validation, output encoding, CSRF/OAuth state handling where relevant, rate limits, quotas, request size limits, session expiry and revocation.
- Google Cloud data processing and backups reviewed for continental-U.S. CAP hosting rules. Ensure appropriate commander/wing/NHQ IT review and approval; CAPR 110-1, 120-1, 1-2, 190-1 and 900-2 may apply.
- Before operational launch: independent security review, backup restoration test, concurrent checkouts test, malicious-user authorization tests, and verification that all official property systems/forms remain authoritative.

## Account and credential hygiene

- Do not paste client secrets, OAuth tokens, service-account files, CAPIDs or real member checkout information into GitHub issues, commits, screenshots or chats.
- **The prior client secret was visible in a screenshot. Rotate it in Google Cloud Console.** The browser frontend never needs it.
- Periodically review Google OAuth test users and file shares. Revoke access when a member changes duties or leaves the unit.

## Branding

The **CAP command emblem** is referenced from the public Wikimedia Commons copy of `Civil_Air_Patrol_US.svg`, identified as originating from Civil Air Patrol. CAP's National HQ maintains the Brand Portal and rules for CAP names, seal, logos, insignia and public digital systems; review this public demo's use before treating it as an authorized CAP page. The prototype carries a visible unofficial status disclaimer.

Sources:
- CAP Public Affairs resources and Brand Portal: https://www.gocivilairpatrol.com/members/cap-national-hq/public-affairs-about/public-affairs
- CAP emblem origin and license notice: https://commons.wikimedia.org/wiki/File:Civil_Air_Patrol_US.svg
- Google Identity Services CSP: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

## V5 issue accounting safeguards
Issuance modes are explicit and only a temporary item with a real due date can be marked overdue. Permanent giveaways reduce stock on hand and become immutable issuance records in the demo; unknown-duration items stay assigned without an estimated return. **This does not solve** the underlying multi-request, non-atomic Google Sheets API behavior or permit official CAP property transactions.