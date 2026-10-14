# Signed-in reporting — October 14, 2026

## Behavior

A visitor without an account session sees a dedicated sign-in gate when choosing to report. The gate links to the existing login/registration screen and explains that the map and reports remain publicly readable. After login, **Continuer mon signalement** validates the account workspace, including device-session ownership reconciliation, before opening the composer. New registrations still pass through the existing recovery-key acknowledgement flow.

If an account session expires or is revoked while a report is being composed, publication is refused. The app clears the invalid account credential, presents the sign-in gate, and keeps the draft's stop, line and optional image in the current page's memory. Reauthentication resumes that draft without publishing automatically. Drafts are not durable across page reloads or a new report action.

## Server enforcement

`POST /api/reports` requires a valid account session in `X-Account-Token`, alongside the existing device bearer token. The account is checked before reading the submitted report or decoding a photo, then checked again after asynchronous processing to catch revocation during the request. The device session is linked only to the authenticated account; a conflicting prior association is rejected and the account workspace can rotate the device session before retrying.

A structured `ACCOUNT_REQUIRED` response distinguishes account expiry from a failed device credential. The client does not discard an otherwise valid device session on an account error, preserving existing ownership. Public reads, report photos while active, votes and owner removal keep their existing behavior. Public report responses do not expose account emails or account identifiers. No database migration is required.

## Verification

- 48 automated tests passed, including extended HTTP assertions for absent, malformed, logged-out and password-reset-revoked account credentials; authentication before invalid photo processing; successful signed-in creation; account association; conflicting account ownership; public reads; votes; author removal and account-owned removal.
- Existing account tests cover expiration and session revocation. Existing store tests cover legacy device ownership and removal.
- Four static-hosting checks passed and the production build succeeded.
- Browser verification at 390 × 844: signed-out gate, login with a disposable demonstration account, continuation to the composer, session expiry simulated only in the temporary database, refusal to publish, and successful reconnection retaining République Beaux-Arts / M1 in the draft.
- Two fresh screenshots contain no personal account details, recovery keys or uploaded photos. No demonstration report was published into a real user's database.

## Scope

An account is not proof of identity and this change is not a complete anti-abuse system. Public nicknames/avatars are a separate planned feature. Physical Android testing and a new APK build were not performed; the web and Capacitor interfaces share this implementation. No public application deployment or binary release was made.
