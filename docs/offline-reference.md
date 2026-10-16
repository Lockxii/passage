# Optional offline journey reference

Added October 16, 2026. The account screen has a custom, keyboard-accessible switch, disabled by default. Enabling it retrieves the account's favorites and stores a text-only snapshot alongside the currently displayed route steps. **Actualiser la copie** replaces the favorites and, when a route is displayed, its steps. Without a displayed route, an existing journey is preserved with its original timestamp; the favorites timestamp is updated independently.

## Scope and privacy

- The local copy contains favorite labels and place names, journey titles/instructions, timestamps and an internal account identifier used to isolate accounts. It deliberately excludes coordinates, route geometry, departure timestamps, tokens, recovery keys, email, avatars and reports. Addresses can still be sensitive; the interface explains that the copy stays on this device. Browser storage is not encrypted by this feature.
- Storage is scoped to the configured API server and the current account session. Changing accounts discards the previous copy. Disabling the switch removes it immediately, even with the server stopped. Signing out clears local personal references and the local session before requesting server revocation; a network failure is reported rather than claiming successful server revocation.
- This is a manual snapshot, not automatic synchronization. Changes to favorites on another screen or device require refreshing the copy. All steps remain a dated reference: no current departures, disruption status, GPS tracking, rerouting or map tile downloads are stored or promised.
- It works in an already-loaded web application. There is no service worker and no guarantee of a cold offline website launch. The copy is session-bound: after a browser/session reset, signing in starts a new opt-in snapshot. The shared Capacitor code was built but was not tested on a physical Android device.
- Invalid or oversized cached data is not rendered. Quota failures keep the previous valid snapshot and show an error. At most 30 favorites and 200 steps are accepted; overly long journeys fail visibly instead of silently dropping steps.

## Verification

54 functional tests and four hosting checks pass; the production build succeeds. Six new tests cover opt-in behavior, the field whitelist, disable/logout cleanup, account/server isolation, independent journey timestamps, invalid/inaccessible storage, quota failures and oversized journeys.

Real 390 × 844 browser checks used a disposable SQLite database and a fictional account with a favorite between Gare Lille Flandres and République Beaux-Arts. The actual planner produced the route; its text steps were saved through the account UI. The test server was then stopped: reopening the account still showed the saved steps and favorites. Disabling the option while the server was stopped removed the copy, verified by closing/reopening the account. After restart, enabling a fresh copy and signing out also removed it. No real user location permission was requested.

[Mobile capture](screenshots/offline-reference.jpg), taken October 16, 2026. Background map © OpenStreetMap contributors; transit data © Ilévia / MEL, Licence Ouverte 2.0. No personal account details or credentials are visible. No deployment or public APK was produced.
