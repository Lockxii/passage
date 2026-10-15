# Profile photos and public report authors

Delivered October 15, 2026. The French account screen offers optional image upload, replacement and removal with custom controls, progress feedback, errors and an explicit public-visibility explanation. The report detail shows the public nickname and avatar. Legacy reports without linked accounts have no invented author.

## Data and privacy

- The authenticated `PUT /api/account/avatar` accepts JPEG, PNG or WebP, with request size and decoded pixel limits. The browser accepts files up to 15 MB and center-crops/resizes them before upload. The server independently validates the image, rejects unsupported/animated formats, rotates, crops to 256 × 256, flattens transparency and re-encodes JPEG without metadata. Only that normalized image is stored.
- `DELETE /api/account/avatar` removes the stored image. Each write revalidates the account session after asynchronous processing, preventing a revoked session from completing an upload. Rate limits and the existing origin policy apply, including PUT preflight support.
- Public reports expose only `author: {name, hasAvatar}`. The no-store `/api/reports/:id/avatar` endpoint reads the current author's image only while that report is active. Replacement updates existing reports; deletion, closed reports and expired reports make the image unavailable. No original file name, email, account ID, token or recovery key is included in the public author object. A third party may still save an image while it is publicly available.
- This is not identity verification or moderation. An avatar does not authenticate a report. Older clients may retain an already-rendered image until the detail is reopened; the server does not serve deleted avatars.

## Verification

48 tests pass, including expanded HTTP coverage for authentication, revoked sessions, invalid and missing images, dimensions and metadata stripping, replacement, deletion, account isolation, exact public author fields and cross-origin preflight. The four hosting tests and production build pass. The existing report-photo tests continue to pass.

The real browser UI was checked at 390 × 844 for upload, removal, replacement and the public author detail. Captures: [account](screenshots/profile-photo.jpg) and [report](screenshots/report-author.jpg). Both use an isolated disposable SQLite database, fictional `Passage Démo`, reserved `demo@example.org`, a synthetic image and a fabricated test report. No real location permission was requested. Background map © OpenStreetMap contributors; transit data © Ilévia / MEL, Licence Ouverte 2.0.

No physical Android test, APK build, hosted deployment or public service release was performed.
