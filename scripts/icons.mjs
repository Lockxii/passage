import { __iconData } from "../node_modules/lucide-react/dist/esm/icons/footprints.mjs";
import { writeFileSync, copyFileSync } from "node:fs";
const paths = __iconData.node.map(([, p]) => p.d);
writeFileSync(
  "public/icon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#00aeeb"/><g transform="translate(12 12)" fill="none" stroke="#123b49" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join("")}</g></svg>`,
);
writeFileSync(
  "android/app/src/main/res/drawable/passage_icon.xml",
  `<?xml version="1.0" encoding="utf-8"?><vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="48" android:viewportHeight="48"><path android:fillColor="#00aeeb" android:pathData="M0,0h48v48h-48z"/><group android:translateX="12" android:translateY="12">${paths.map((d) => `<path android:pathData="${d}" android:strokeColor="#123b49" android:strokeWidth="1.8" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="#00000000"/>`).join("")}</group></vector>`,
);
copyFileSync(
  "node_modules/lucide-react/LICENSE",
  "public/licenses/lucide-ISC.txt",
);
