# Delta skin support

Digger accepts `.deltaskin` ZIP archives with a root `info.json` and referenced PNG assets. Archives are size/entry bounded and reject unsafe paths, duplicate entries, ZIP64/multi-disk archives, missing or malformed metadata, missing assets, and non-PNG asset references. PDF files are not skins.

The supported configuration subset covers device/representation/orientation entries under `representations`, positive `mappingSize.width` and `.height`, `assets` name-to-PNG paths, `items` with frames and string inputs (including directional input maps), optional item `asset` and `extendedEdges`, `screens` with input/output frames, configuration `extendedEdges`, and optional `translucent`. Frames require finite coordinates and positive dimensions; edge extensions must be finite nonnegative numbers. Extra configuration properties may be ignored. Artwork variants use PNG paths present in the archive.

Touch controls support only up/down/left/right and A/B. Direction controls use latest-active cardinal priority; A/B trigger once per press. Emulator-specific actions (start/select/menu, save/load, fast-forward and similar actions), DS touch input, and custom operations are unsupported. Landscape metadata is used when present. If an imported skin has no landscape configuration, Digger uses the bundled Candybar landscape layout and artwork; portrait art is not rotated. The imported skin remains available in portrait.

The on-screen shell and controls appear only on touch-capable compact viewports (width at most 700px, or landscape height at most 600px). Haptics are an optional local-device preference, default off; support depends on browser/device vibration APIs. Keyboard/gameplay behavior remains available on desktop.

Automated coverage uses Playwright with system Chromium, including mobile emulation and desktop regressions. This does not establish behavior on every browser or physical device: safe-area rendering, real touch feel, vibration, and iOS callouts require device/browser verification. WebKit-only callout assertions are not part of the current system-Chromium run.
