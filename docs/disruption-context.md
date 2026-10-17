# Disruption context for displayed departures

Added October 17, 2026. The shared departure card used by nearby stops and journeys now shows a compact context panel for the current physical stop/platform and selected line.

Fresh SIRI visits are summarized as cancelled passages and delays of at least one minute, with the maximum observed delay and the oldest contributing update time. Cancelled visits are not double-counted as delays. Their scheduled time is used to determine whether they are upcoming, even if an expected time is absent or obsolete.

The shared freshness filter requires a live API status, an update no older than 180 seconds, at most 30 seconds in the future, and an upcoming passage within two hours. The client clock reevaluates freshness every 15 seconds; the existing refresh runs each minute and pauses while hidden. Expired client data is labelled as stale, provider failure as unavailable, and no matching fresh visits as insufficient recent information. Fresh visits without observed delays do not imply normal network traffic. When neither live nor scheduled passages can be displayed, the badge says unavailable rather than theoretical, and the caption does not claim to retain absent schedules.

## Sources and limits

- Existing public source: [Ilévia SIRI Stop Monitoring via transport.data.gouv.fr](https://proxy.transport.data.gouv.fr/resource/ilevia-lille-siri-sm). This change adds no paid service, new collection endpoint, coordinates upload or personal data.
- [Official Ilévia traffic-information guidance](https://www.ilevia.fr/cms/institutionnel/info-trafic-application-ilevia), checked October 17, 2026, explains how to access their traffic information. The UI links to this guidance, not to a claimed comprehensive alert feed.
- Coverage is limited to received visits at the selected stop and line, across the platform's destinations. It does not establish that a particular planned journey is cancelled. Network interruptions, diversions and road congestion are not covered. Journey calculations and arrival estimates remain based on scheduled timetables.
- A dedicated network-wide disruptions feed remains unimplemented. No bus positions, traffic conditions or missing alerts are invented.

## Verification

60 functional tests and four hosting checks pass; production build passes. Six added tests cover fresh delay/cancellation summaries, stale/future/past/out-of-window visits, provider failures, unknown delays and advances, cancellation timing and expiry as the client clock advances. Existing realtime parser and scheduled-fallback tests remain in place.

Real 390 × 844 browser checks used an isolated temporary SQLite database and the existing development-only nearby-preview fixture to simulate a public position near République Beaux-Arts. The first capture shows actual theoretical fallback with no fresh matching data; the second shows the API server deliberately stopped and a different line selected. Neither screenshot simulates or invents a delay or disruption. Alert-state logic is covered by deterministic unit tests rather than a fabricated screenshot.

Captures: [no recent data](screenshots/disruption-context.jpg), [server unavailable](screenshots/disruption-unavailable.jpg). Map © OpenStreetMap contributors; transit data © Ilévia / MEL, Licence Ouverte 2.0. No real user location, personal account, deployment or public APK was used.
