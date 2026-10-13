# Nearby departures — October 13, 2026

The home panel now finds the four nearest served physical platforms within an 800-metre straight-line radius. Opposite-direction platforms remain separate. Select a platform and a line to see its next departures. The existing realtime adapter is reused; one visible line polls every minute, with requests paused while the page is hidden. Metro and tram queries are now accepted after the same exact stop/line validation as buses. No claim of fresh metro coverage is made.

Location is requested on demand, retained only in component memory as nearby results, and never included in the departures API request. The API receives only the selected public stop and line identifiers. Position fixes older than 30 seconds or less accurate than 250 metres are rejected. Closing the section clears its results; changing views unmounts it. A refresh updates the position, not a continuous tracking session.

## Verification

- 48 automated tests passed, including proximity sorting, platform separation, the 800-metre boundary behavior, four-result cap, invalid coordinates, empty coverage and invalid departure queries. Existing realtime tests cover per-visit freshness and provider failures.
- Four static hosting tests passed and the production build succeeded.
- Actual integrated-browser verification at 390 × 844: home layout, nearest platforms, metro scheduled departures, bus line 14 to line 18 switching, permission denial and no nearby stops.
- The expanded home sheet is height-limited and scrollable so departures do not push controls off-screen.
- Captures retain map attribution, show no personal account data, and use a labelled simulated position near Place de la République for the expanded state.

## Reproduce the mobile review

Import the same GTFS archive into both the stop catalog and timetable if rebuilding data. Run the API on port 4311 using a temporary application database, and Vite on port 5173. Open `/tests/fixtures/nearby-preview.html` through the Vite server. This development-only fixture mounts the real application with a simulated public location; it is not part of the production build. Add `?state=denied`, `?state=empty` or `?state=inaccurate` to exercise errors without exposing a real location.

## Limits

No live physical-device GPS or Android test was performed. The provider returned no fresh live visits for the inspected platforms, so the screenshot shows scheduled fallback. The feature does not identify a bus, supply road traffic, calculate a walking path to a stop, or track location in the background. Direction names come from each individual departure. Timetable freshness still depends on the imported public feed.
