# Recent public destinations

Delivered October 22, 2026. Selecting a catalog stop in either destination search records its identifier in a small device-local list. Home displays up to five recent destinations, most recent first. Re-selecting one moves it to the front; opening one fills the destination without requesting GPS automatically. Individual remove controls and **Tout effacer** are provided.

Only identifiers present in the loaded public stop catalog are recorded. Free-form query text, external geocoder results, private addresses, GPS positions, account details and origin points are not stored in this list. Favorites and home/work launches do not feed this history. No new upload or history-sharing endpoint is added. Existing journey/search requests still operate normally.

The list belongs to the browser/device, not an account, and remains after logout on shared devices. Clear it explicitly or clear site storage. Missing catalog stops cannot launch and remain removable. Invalid storage is tolerated; failed writes display an error without falsely confirming removal.

## Verification

76 tests, four hosting checks and production build passed. Added tests cover catalog-only capture, recency ordering, deduplication, five-item limit, malformed/unavailable storage, persistence, clear and write failures. HTTP tests and browser preview used disposable databases after rebuilding the public GTFS timetable.

Mobile 390 × 844: selected Loos Mairie with keyboard confirmation, reloaded and verified persistence, reopened the destination, removed it individually, added it again, cleared all and reloaded to verify removal. No personal GPS or account was used.

![Recent destinations](screenshots/recent-stops.jpg)

Fresh October 22 capture using a public demonstration stop. Map © OpenStreetMap contributors; stop catalog © Ilévia / MEL.
