# STATE — South Mumbai Business Game

## What this is
Monopoly-style hot-seat board game, pure vanilla HTML/CSS/JS, no build step.
Deployed on GitHub Pages: https://airyniks.github.io/south-mumbai-monopoly/
Repo: https://github.com/AiryNiks/south-mumbai-monopoly (local folder is the source of truth; git initialised 2026-07-11 against origin/main).

## Locked decisions
- **Design system:** 1900s Bombay Art-Deco. Palette: ivory `#F0E9D6` / charcoal `#161616` / gold `#B68A3E` / muted emerald. Fonts: Poiret One (display), Montserrat (body/numbers), **Oswald** (board-tile caps — added 2026-07-11 for legibility; condensed Deco look is intentional).
- **Board sizing:** `#board { width: min(100%, calc(100vh - 2.4rem), 1040px); aspect-ratio: 1 }`, grid `1.55fr repeat(9,1fr) 1.55fr`. Tile text scales with `cqmin` (each `.board-space` is a size container). Name size tiers (`nm-md/lg/xl`) set in board.js from the label's longest word — do not remove, they prevent clipping.
- **Toggles:** #muteToggle/#themeToggle float top-right on the setup screen only; `dockToggles()` in main.js moves them into `#sidebarUtilities` (right sidebar) when play starts. Never position them fixed over the game screen again — that caused the overlap bug.
- **Dice:** true 3D cubes (`.die > .die-cube > .die-face.f1–f6`), spin via cumulative rotateX/rotateY in ui.js (`FACE_ROT`, `_dieAngles`), throw arc via `.die.throwing` keyframes. `DICE_ROLL_MS = 1150` must match the CSS transition duration.
- **Mobile (≤760px):** right sidebar becomes `display: contents`; children reflow by `order` into one column (utilities 0 → player strip 1 → board 2 → action dock 3 → RBI 4 → players/log 5). `#actionDock` is `display: contents` on desktop, a card on mobile. `#boardZoom` chip toggles `.zoomed` (board 175vw, pannable in `#boardViewport`).
- **Brand:** `favicon.svg` = gold gateway + sunburst medallion on charcoal, double Deco ring. Used in tab icon, setup screen, board center, mobile topbar. Keep it a single flat SVG.

## Verification notes
- The bundled Browser pane has `prefers-reduced-motion: reduce` and throttled rAF — dice take the reduced path there; test animations in a real browser.
- Full-turn pipeline (roll → move → buy/rent/tax → auto-advance) tested on desktop 1363×600/1280×720 and mobile 375×812 on 2026-07-11.

## Next candidates (not committed to)
- Real property photos in `images/` (config already points at paths).
- Following the token with auto-scroll while the mobile board is zoomed.
