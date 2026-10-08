# Mobile Game Boy Responsive Experience

## Objective

Make the game playable and visually coherent on mobile by presenting it as a compact, portrait-oriented Game Boy-style handheld inspired by the supplied silver-device reference.

## Problem and rationale

The game canvas currently renders at a fixed 1024×896 CSS size, so it does not fit narrow viewports. The game accepts keyboard input but has no mobile touch controls. A handheld shell around a viewport-scaled game screen, with touch controls wired to existing movement/shoot actions, makes the mobile layout both responsive and playable without changing game mechanics.

## Scope and constraints

- Prefer the portrait orientation shown in the reference; keep the existing desktop experience intact.
- Fit the fixed-resolution canvas into the available mobile screen area while preserving its aspect ratio and pixel rendering.
- Add touch controls that reuse existing movement and shooting actions; do not change game rules or scoring.
- Keep controls accessible and avoid horizontal overflow on narrow mobile viewports.
- The selected portrait/landscape source PNGs total approximately 6.97 MB; load only the active orientation asset and preserve creator attribution.
- No visual testing/browser automation framework or test script was reported during exploration. Use the available lint/build checks and inspect the responsive implementation structurally.
- Forecast: approximately 250 authored changed lines; delivery strategy: ask-on-risk (default). No PR is authorized. The user explicitly authorized publishing the current snapshot on `game-offline` and `master`.

## Tasks

- [x] **MGB-1 — Make the Game Boy experience fill the mobile viewport** (complete)
  - Use the user-authorized Candybar GBC Delta Advance portrait and landscape skin images as full-viewport device frames; include creator attribution.
  - Remove the mobile game's excess vertical gaps so the device frame uses the available dynamic viewport height and width, respecting safe areas.
  - Overlay the game canvas in each skin's declared screen output frame and align functional touch controls with the artwork's D-pad and face buttons; recalibrate D-pad hit areas for both orientations and preserve pointer-release behavior.
  - Select the matching portrait/landscape frame when device orientation changes; preserve desktop layout and keyboard input.
  - Route: delegated direct writer. Trigger: multi-file responsive UI and binary skin assets; preparation belongs with the writer.
  - Allowed surfaces: `app/play/page.tsx`, `app/globals.css`, `components/GameCanvas.tsx`, `components/HUD.tsx`, `public/skins/candybar/iphone_edgetoedge_portrait.png`, `public/skins/candybar/iphone_edgetoedge_landscape.png`, `public/skins/candybar/ATTRIBUTION.md`.
  - Acceptance: on mobile, the complete portrait or landscape skin fills the available viewport without large blank bars; the game renders in the skin's screen window with no aspect distortion, horizontal overflow, or loss of pixel rendering; touch movement/shoot controls align with and activate the skin's buttons; orientation rotation selects the corresponding frame; desktop layout and keyboard controls remain intact.
  - Checks: `npm run lint`; `npm run build`; `git diff --check`; parent structural spot-check of skin screen/input coordinate mapping. No applicable automated test suite is configured; visual confirmation requires a fresh device screenshot.
- [x] **MGB-2 — Verify the full-screen portrait/landscape experience**
  - Re-run lint/build and `git diff --check` after this skin integration; follow native risk assessment and independent-verifier fallback if assessment fails.
  - Verify viewport sizing, orientation asset selection, skin output-frame coordinates, touch hit areas, desktop behavior, and attribute the new art.
  - Record the user's permission, check results, and any missing browser/device visual check; reconcile the task document, Engram mirror, and visible todo projection.
  - Acceptance: all applicable checks and limitations are recorded truthfully; no failed or skipped check is presented as passing.

## Progress and evidence

- Exploration: `components/GameCanvas.tsx` handles keyboard input and sends direction/shoot state to `game/engine.ts`; there is no observed touch or gamepad path. Its canvas buffer is fixed at 256×224 and is currently styled at 4×, yielding 1024×896 CSS pixels. The mobile screenshot is a portrait silver handheld with a screen above physical controls.
- Test-first exception: the repository has no declared test script or observed test suite, so there is no applicable existing deterministic test runner for a RED/GREEN cycle. Lint/build and structural responsive checks are planned instead.
- Parent structural review caught and corrected the D-pad Down button placement in `app/globals.css`.
- The user-provided screenshot then exposed a shrink-to-fit stage: the centered `items-center` layout wrapped the game in a plain `.relative` child, preventing the console from using the available mobile width.
- Width correction: `app/play/page.tsx` now sets the game stage to `w-full`; `app/globals.css` allows the mobile console to use `min(100%, 560px)`. The screen keeps an 8:7 ratio and pixelated rendering; touch controls and desktop base rules remain intact.
- Writer and independent verifier report `npm run lint`, `npm run build`, and `git diff --check` all passed on the final width follow-up. The independent verifier confirmed the full-width stage under the centered layout, 560px mobile cap, 8:7 canvas ratio, desktop base sizing, and touch controls.
- Native ASSESS failed closed because untracked files require an explicit declaration. RDD is off; the returned high-risk plan was followed with independent verification. No native review lifecycle was started.
- New user feedback: large empty areas remain above and below the handheld; user wants the game to fill the viewport like the supplied Candybar skin and noted it provides a landscape variant.
- Skin feasibility: the local `info.json` declares both portrait (`1320×2868`, screen output frame `x=180,y=454,w=960,h=864`) and landscape (`2868×1320`, output frame `x=874,y=144,w=1120,h=1008`) assets. The skin includes touch-input coordinates for its D-pad and buttons. Metadata names “Candybar by Dwichotomy - Delta Advance” but contains no license.
- User selected “Incluir la skin exacta,” confirming permission to incorporate and distribute the supplied skin. Preserve creator attribution in the project.
- The new screenshot showed the full-width-only version still left vertical gaps; the full-viewport skin integration has now been implemented and structurally verified.
- Parent structural review found the initial skin rules were gated at `max-width: 700px`, which would miss common phone landscape viewports (~844px wide). The page-fullscreen rule now also applies to landscape viewports up to 600px tall; portrait and landscape art are assigned in separate orientation-specific media queries so only the active frame is loaded. Independent verification passed after this correction.
- User reported movement buttons were not working correctly. The prior portrait hitboxes were shifted left: their cluster ended near 25.5% of the image width while the printed D-pad extends to about 40%. Parent realigned portrait and landscape directional hitboxes to the visible D-pad arms; `GameCanvas` input handlers remain unchanged.
- Independent verifier confirmed portrait/landscape hit areas match the corresponding visible D-pad arms, DOM order remains Up/Left/Down/Right, and pointer capture releases on pointerup, pointercancel, and lost capture. It also confirmed the keyboard-to-engine path is unchanged.
- Final independent commands passed: `npm run lint`, `npm run build`, and `git diff --check`; parent reran `git diff --check` with no output.
- Native ASSESS failed closed because untracked files require an explicit declaration. RDD is off; the returned high-risk plan was followed with independent verification. No native review lifecycle was started.
- Verification limitation: no browser/device touch test was available, so physical tap responsiveness and exact visual alignment remain unverified; the structural mapping is corrected and verified against both skin images/metadata.
- Feature work-unit commit: `4baa8ca` (`feat(mobile): add full-screen Game Boy skin and touch controls`); task evidence was recorded in `b0e904d`. The user authorized publishing both `master` and `game-offline`; both remote refs were verified at `b0e904d` before this final task-document update.

## Next step

Test the movement buttons on the phone. If they still misfire, share which direction and a screenshot/video of the touch location so the hit areas can be calibrated further. The feature is committed and published on both branches; `bun.lock` remains untracked and untouched.
