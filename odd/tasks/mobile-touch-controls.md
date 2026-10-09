# Reliable Mobile Touch Controls

## Objective
Keep touch controls reliable on compact mobile viewports, scope selection/callout suppression to the game controls, and retain keyboard desktop behavior.

## Current behavior and decisions
- The Candybar D-pad and A/B layout is retained; this is not an analog joystick.
- Cardinal direction input follows latest-active priority. Releasing/cancelling the active direction falls back to the latest still-active direction.
- A/B are one-shot actions per press rather than held actions. Blur, visibility changes, cancellation, and unmount clear held inputs.
- Haptics are an optional local preference, default off. Browser/device vibration support varies.
- Touch controls and the skin shell are shown only when `navigator.maxTouchPoints > 0` and the viewport is compact (width <=700px, or landscape height <=600px).
- Text selection/touch-callout suppression is scoped to the game control surface.

## Verification and limits
Playwright coverage exercises touch-enabled mobile emulation (portrait/landscape hit targets, input lifecycle, A/B and haptics) and desktop keyboard regressions using system Chromium. Run with `/tmp/digger-playwright.config.cjs` against the configured local development server; generated output stays under `/tmp`. The WebKit-only touch-callout assertion is excluded from Chromium runs. Browser emulation does not establish real-device touch feel, vibration, safe-area behavior on every platform, or physical iOS callout behavior; those still require browser/device verification.

## Historical context
The original implementation used pointer events and the tests were initially planned for WebKit mobile. Prior WebKit attempts were blocked by missing browser/host libraries. The current implementation uses existing pointer lifecycle handling and the current automated test scope is system Chromium, not WebKit. Build verification is coordinated separately while the development server owns `.next`.
