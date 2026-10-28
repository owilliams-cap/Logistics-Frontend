# Squadron Logistics POC — Google Login and Google Sheets setup

This build includes: login-first UI; four designs (Original, Midnight, Forest, Arctic); inventory / checkout / returns / incoming supplies / grade-insignia UI; fictional local demo; and an **opt-in Google-authenticated Sheets pilot**.

## Status

- GitHub Pages frontend: static files only.
- Google Sheets sample: owned by `orionwilliams.cap@gmail.com` with fictional data, including `Items`, `Loans`, `Orders`, `Activity`, `Users`.
- Google OAuth: **requires one configuration step from the owner**. Until a real OAuth *Web application client ID* is entered in `config.js`, the Continue with Google button reports a setup requirement. This is deliberate and prevents fake authentication.
- Real CAP data: **not authorized for this pilot**. Use fiction until command / IT and cloud-data-residency approval and server-side access controls are in place.

## Google Cloud setup (free for this pilot; quotas apply)

1. Log into [Google Cloud Console](https://console.cloud.google.com/) as the business Google account.
2. Create/select a Google Cloud project, e.g. **Squadron Logistics Prototype**.
3. **APIs & Services → Library**: enable **Google Sheets API**.
4. Go to **Google Auth Platform** (OAuth consent). Choose **External** if using regular `@gmail.com` accounts. Set the app name, support email, and developer contact as your business email. Keep the app in **Testing** and add `orionwilliams.cap@gmail.com` as a test user. Add other fictional-data pilot participants as test users only after reviewing consent and access risks.
5. Add the necessary scopes: **Google Sheets API `https://www.googleapis.com/auth/spreadsheets`** and basic `openid email profile` (the application requests them at sign-in). This scope can authorize broad Google Sheets access on behalf of the signed-in person: the app only accesses the configured test Sheet, but the scope itself is broader. Do not roll out to all members based on this pilot.
6. **Clients → Create client → Web application**. Authorized JavaScript origin: `https://owilliams-cap.github.io` (no repository path). For local testing via HTTP, also add the exact local origin e.g. `http://localhost:8765` if needed. No client secret belongs in GitHub.
7. Copy the **Client ID**, which looks like `1234567890-xxxxx.apps.googleusercontent.com`, into `config.js` as `googleOAuthClientId`. The client ID is intended to be public; do not copy the client secret.
8. Commit the updated `config.js` to GitHub. GitHub Pages loads the updated files and the **Continue with Google** button becomes operational. Select your business Gmail during Google sign-in and approve access.
9. Verify the inventory list matches the Google Sheet, then change a harmless fictional item and confirm the Sheet changes. Use a separate test user who is **not** in the Google Sheet's `Users` tab to ensure it is rejected.

## Sharing and authorization

1. The business Google Sheet starts private and is owned by your business Google account.
2. `Users` includes the owner as active `admin`. This allows the browser UI to show the right controls. **However this is UI-only role enforcement**, not a security boundary, because a user with direct Google Sheets editor permission can bypass the UI and edit the underlying Sheet.
3. Each account must separately be granted permission to the Sheet using Google's Share menu; an unshared Google account should receive 403.
4. A **Google Sheets Viewer** can read but cannot mutate data through Sheets API. A **Google Sheets Editor** can bypass the frontend's role buttons, so do **not** grant editing permission to cadet cadre or anyone requiring narrowly scoped access in this pilot.
5. For live CAP use, replace the direct-to-Sheets browser adapter with an approved server-side API/Apps Script deployment with verified Google identity, authorization per action, append-only audit control and transaction locking. A prepared example is included under `apps-script/`, but it is not deployed.

## Why Google OAuth configuration cannot be automated from ChatGPT's Google Drive connector

The Drive connector can create and populate the Sheet but does not provision OAuth credentials in Google Cloud Console or publish Apps Script web apps. Those require an account-owner action. **Do not send a client secret**. It is enough to supply the public OAuth client ID after setup if you'd like the GitHub `config.js` updated.

## Security and operational notes

- Do not put actual CAP records, PII, passwords, tokens, or service-account credentials in your public repo.
- OAuth access token is only held in JS memory, not written to localStorage. A refresh requires Google sign-in again.
- GitHub Pages is public. Login protects the Google Sheet by Google's permissions, **not** the HTML/CSS/JavaScript.
- Direct Sheets writes are not atomic under concurrent use; two simultaneous checkouts can race. This pilot is **not** suitable for official issue/return accountability.
- Google Sheets API can return 401/403/429. The UI displays errors and does not silently substitute local data.
- CAPR 120-1 cloud hosting and CAPR 1-2 PII obligations still apply before operational use.

## Files

- `index.html` — login-first page.
- `styles.css` — original baseline design.
- `themes.css` — four design variants and login UI.
- `app.js` — UI, fictional demo mode and data handling.
- `sheets-adapter.js` — Google OAuth token and Google Sheets API pilot adapter.
- `config.js` — public OAuth client ID and Sheet ID only.
- `apps-script/` — optional, *not deployed*, server-side alternative for further CAP IT review.

## Troubleshooting

- **Google OAuth not configured**: fill client ID in `config.js`.
- **origin_mismatch**: add the correct `https://owilliams-cap.github.io` JavaScript origin.
- **access blocked / test user not approved**: add the signed-in email to Google OAuth consent screen test users.
- **HTTP 403 from Sheets**: share the private spreadsheet with that Google account or select the account with permission.
- **Email not authorized**: add the verified email to the `Users` tab as `active=TRUE`.
- **Sheet column mismatch**: `Loans` must end in `grade`, the 11th column. The other tabs retain their documented headers.
- **Sign-in needs to be repeated**: access tokens expire. Use the sign-out button and sign in again.