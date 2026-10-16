# Two-week improvement plan

One focused improvement per day, October 13–26, 2026, at 10:00 Europe/Paris. This is a planned backlog, not a claim of completed functionality. The automation uses a fresh temporary clone and publishes source changes only. No hosted application or APK release is planned.

## Delivery rules

Keep the interface in French and documentation in English. Preserve existing behavior and the current visual style. For each item: inspect the implementation, make the smallest coherent change, test it, capture the actual result at **390 × 844**, review the public files for personal information, and push only verified changes. Use demo data and a temporary application database for screenshots. Do not invent screenshots or present historical captures as new evidence.

Browser access was restored on October 13 and fresh mobile captures were verified. Use only authorized browser capabilities; never bypass a later access restriction. If visual verification or another required dependency is blocked, keep the work local and report the limitation. Resume the same item on the next scheduled run. Do not claim daily delivery regardless of failures.

Start servers only for the required checks and stop those started by that run. Do not overwrite unrelated changes, commit private data or start paid services. Record completion below only after tests, capture and push succeed. Do not process more than one feature per day or extend work past October 26 to catch up.

## Temporary checkout lifecycle

The original local Passage checkout and deliverables are removed at the owner's request. Each run clones this repository into a dated folder under `C:/Users/conta/Documents/Codex/passage-daily-work/`, creates a daily feature branch, implements and verifies one feature, then merges into an up-to-date `main` and pushes without force. Resume any retained unfinished checkout before starting another feature.

After verifying that the implementation commit is included in remote `main` and no unpublished work remains, stop the run's servers, leave the checkout and delete only that run's validated temporary directory. Keep the checkout if implementation, capture, tests or push fail. Never remove shared tools, other projects or unrelated analyses. GitHub is the durable record of completed work.

## Backlog

| Target date | Improvement | Acceptance criteria | Status |
| --- | --- | --- | --- |
| Oct 13 | Nearby departures on home | On-demand location; nearby stops and distances; upcoming passages; freshness labels and scheduled fallback; useful location-denied and no-results states. | Completed Oct 13 |
| Oct 14 | Signed-in reporting | Require an account in both the composer and server API; preserve existing report reads and ownership; offer a clear sign-in action. | Completed Oct 14 |
| Oct 15 | Profile photos and report authors | Upload, replace and remove a validated avatar; strip metadata; show public nickname/avatar on reports without exposing email or private account data. | Completed Oct 15 |
| Oct 16 | Opt-in offline journey reference | Account setting for device-local favorites and saved journey steps; visible saved timestamp; disable removes cache; clear personal cache on logout; do not promise offline routing, live data or map tiles. | Completed Oct 16 |
| Oct 17 | Transport disruption context | Show verified fresh delays/cancellations affecting displayed lines; explain partial coverage and link to official traffic information; never imply a complete alerts feed or road congestion. | Planned |
| Oct 18 | Alighting reminders | Opt-in in-app reminder and supported vibration near the destination stop; deduplicate; respect GPS freshness; retain manual confirmation and foreground limitation. | Planned |
| Oct 19 | Journey preferences | Save a preference for less walking or fewer transfers; explain the trade-off and preserve fastest-arrival comparison; use measured journey properties. | Planned |
| Oct 20 | Stop details | Open a stop from the map/search; show served lines, direction-specific departures and a walking route to the selected physical platform. | Planned |
| Oct 21 | Favorite stops | Save and remove frequently used stops; launch their departures directly from home; keep these distinct from favorite destinations. | Planned |
| Oct 22 | Recent searches | Small device-local list of recent public destinations with remove/clear controls; no history sharing or automatic server upload. | Planned |
| Oct 23 | Service freshness status | Compact status for timetable import age and realtime freshness; actionable retry and honest offline/provider-error states without stale live badges. | Planned |
| Oct 24 | Share a journey summary | User-triggered share/copy of public stop names, line sequence and scheduled times; preview before sharing; exclude GPS coordinates, saved private addresses, tokens and account details. | Planned |
| Oct 25 | Night display | Optional dark interface with accessible contrast and readable map overlays; persist preference and respect reduced motion; use only an appropriately licensed map style if needed. | Planned |
| Oct 26 | Accessibility display settings | Larger text and stronger contrast options in account/display settings; no clipped mobile controls; keyboard labels and focus verified. | Planned |

If a feature already exists, verify it and select the next unfinished item rather than duplicating it. Dates are targets, not a reason to ship incomplete changes. Use documented public data sources; unavailable data must remain explicitly unavailable.

## Completed deliveries

| Date | Feature | Verification | Capture | Implementation |
| --- | --- | --- | --- | --- |
| Oct 13, 2026 | Nearby departures on home | 48 tests, 4 hosting checks, production build; mobile layout, bus line switching, metro fallback, denied location and no nearby stops verified | [Home](screenshots/nearby-home.jpg) · [Departures](screenshots/nearby-bus.jpg) | [18474f3](https://github.com/Lockxii/passage/commit/18474f3) |
| Oct 14, 2026 | Signed-in reporting | 48 tests including expanded auth/ownership HTTP coverage, 4 hosting checks, production build; mobile sign-in and expired-session draft recovery verified | [Sign-in gate](screenshots/report-sign-in.jpg) · [Session expiry](screenshots/report-session-expired.jpg) | [f13680a](https://github.com/Lockxii/passage/commit/f13680a) |
| Oct 15, 2026 | Profile photos and public report authors | 48 tests with expanded avatar/auth/privacy HTTP coverage, 4 hosting checks, production build; mobile upload, removal, replacement and public author verified | [Account](screenshots/profile-photo.jpg) · [Report author](screenshots/report-author.jpg) | [19b4af5](https://github.com/Lockxii/passage/commit/19b4af5) |
| Oct 16, 2026 | Opt-in offline journey reference | 54 functional tests, 4 hosting checks, production build; mobile save/read with server stopped, disable and logout cleanup verified | [Local reference](screenshots/offline-reference.jpg) | [175d9a9](https://github.com/Lockxii/passage/commit/175d9a9) |

The October 13 delivery was started manually after the owner reported no result from the scheduled run. Available logs did not establish why the scheduled execution failed to produce work. The existing automation was re-registered for the thirteen remaining daily runs at 10:00 Europe/Paris, October 14–26. The October 14 heartbeat ran and delivered the signed-in reporting feature.
