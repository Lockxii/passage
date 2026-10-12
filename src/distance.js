/* Adapted from wazeHQ/turf, packages/turf-distance/index.js
 * Commit b18cdda4c81487f814634b6bd0c850dbf63017be, MIT, Morgan Herlocker (2013).
 * License: public/licenses/turf-MIT.txt. Changes: object coordinates, metres,
 * WGS84 mean Earth radius, clamped rounding at antipodes; no Turf dependencies.
 */
export function distance(from, to) {
  const rad = Math.PI / 180;
  const dLat = rad * (to.lat - from.lat),
    dLon = rad * (to.lon - from.lon);
  const a = Math.min(
    1,
    Math.max(
      0,
      Math.sin(dLat / 2) ** 2 +
        Math.sin(dLon / 2) ** 2 *
          Math.cos(rad * from.lat) *
          Math.cos(rad * to.lat),
    ),
  );
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
