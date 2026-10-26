# Raktér 3D · Cargo Space Planner

**Magyar · English · Deutsch**

Raktér 3D is an open-source, browser-based 3D cargo loading planner. Arrange pallets, boxes and other goods in a configurable vehicle cargo space, either automatically or by hand. The interface is available in Hungarian, English and German.

## Features

- Interactive 3D view, top/side/rear views, centimetre dimensions and numbered top-down layout.
- Automatic placement and manual drag-and-drop placement with collision and cargo-space boundary checks.
- Per-item rules: stackable, non-stackable, cannot rotate, cannot tilt, and floor-only.
- Cargo list import from Excel (`.xlsx`) or CSV; JSON plan import and export; print-ready plan.
- Optional two-axle load estimate based on user-entered vehicle data.
- Local browser storage; no account, API key, external CDN or telemetry.
- Optional Windows desktop build using Electron.

## Run in a browser

The app is static. Serve the `dist/` directory from any local web server, or host it as a static website. For example:

```sh
npx serve dist
```

Open the local URL printed by the server. Some browsers restrict module workers when opening `index.html` directly as a `file://` URL, so use a local server.

## Run and build the Windows app

Use Node.js 20 or newer.

```sh
npm install
npm run desktop:start
```

On Windows, create the installer and portable executable with:

```sh
npm run desktop:dist
```

The build outputs are written to `release/`. To build on another operating system, use the included GitHub Actions workflow or a Windows machine. The executable is not code-signed.

## Language and saved data

Choose Magyar, English or Deutsch from the language menu in the header. The preference is saved in the current browser profile. Cargo names, plan names and vehicle names are user data and remain as entered. Plans are stored locally in the browser or desktop app profile and do not sync between devices. Use JSON export/import to move a plan between profiles.

## Loading and safety limits

Vehicle dimensions and capacities are user-supplied. The app models a rectangular cargo space; it does not model wheel arches, door openings, restraints, unloading order or package compression strength. Axle load is a simplified two-axle estimate, not a certified calculation. Verify the vehicle, cargo and actual axle loads before travel. The automatic placement algorithm is heuristic and does not guarantee an optimal layout.

## Development

```sh
npm install
npm test
```

Three.js files are included under `dist/vendor/` with their MIT license. The bundled Roboto fonts are licensed under Apache-2.0. See the included notices and licenses for details. The project itself is licensed under MIT.

## Magyar

A Raktér 3D nyílt forráskódú, böngészőben futó 3D rakodástervező. Raklapok és egyéb áruk automatikus vagy kézi elhelyezését segíti a megadott jármű-raktérben. A felület magyarul, angolul és németül használható.

Fő funkciók: interaktív 3D nézet; felül-, oldal- és hátulnézet; centiméteres, számozott kiosztás; kézi húzás és automatikus elrendezés; rakodási szabályok; Excel/CSV és JSON import/export; nyomtatható terv; egyszerű tengelyterhelés-becslés. A tervek helyben, a böngésző vagy az asztali program profiljában tárolódnak.

Futtatás böngészőben: `npx serve dist`, majd nyisd meg a helyi címet. Windows-programhoz: `npm install`, `npm run desktop:start`; Windows alatt a `npm run desktop:dist` készíti el a telepítőt és a hordozható EXE-t. A teljes leírás angolul fent található.

**Fontos:** az automatikus elrendezés heurisztikus. A jármű- és áruadatokat, valamint a tengelyterhelést indulás előtt ellenőrizni kell. A tengelyterhelés csak egyszerű két tengelyes becslés; a program nem vizsgál kerékdobot, ajtónyílást, rögzítést, kirakási sorrendet vagy nyomószilárdságot.

## Deutsch

Raktér 3D ist ein quelloffener, browserbasierter 3D-Ladeplaner. Paletten und andere Güter lassen sich automatisch oder manuell im angegebenen Laderaum anordnen. Die Oberfläche ist auf Ungarisch, Englisch und Deutsch verfügbar.

Funktionen: interaktive 3D-Ansicht; Drauf-, Seiten- und Heckansicht; nummerierter Plan mit Zentimetermaßen; manuelles Verschieben und automatische Anordnung; Laderegeln; Excel/CSV- und JSON-Import/Export; druckbarer Ladeplan; einfache Achslastschätzung. Pläne werden lokal im Browser- oder Desktop-Profil gespeichert.

Im Browser starten: `npx serve dist` ausführen und die angezeigte lokale Adresse öffnen. Windows-App: `npm install`, `npm run desktop:start`; unter Windows erzeugt `npm run desktop:dist` den Installer und die portable EXE. Die vollständige Anleitung steht oben auf Englisch.

**Hinweis:** Die automatische Anordnung ist heuristisch. Fahrzeug-, Ladungs- und Achslastdaten müssen vor der Fahrt geprüft werden. Die Achslast ist nur eine einfache Zweiachsenschätzung; Radkästen, Türöffnungen, Ladungssicherung, Entladereihenfolge und Druckfestigkeit werden nicht berücksichtigt.
