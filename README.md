# South Mumbai Business Game 🏙️

A Monopoly-style property-trading board game set across South Mumbai's most iconic addresses — built in pure vanilla **HTML, CSS, and JavaScript**. No frameworks, no build step, no backend, no API keys. Just open it and play.

**▶ Play it:** `https://airyniks.github.io/south-mumbai-monopoly/`

---

## 🎮 Overview

Buy Colaba Causeway, build offices on Marine Drive, charge rent on Nepean Sea Road, borrow from the Reserve Bank of India, and bankrupt your rivals across the most expensive square mile in the country.

- **Players:** 2–4 (hot-seat, on one device)
- **Starting cash:** ₹1,500 Lakhs (₹15 Crores) per player
- **Currency:** Indian Lakhs (₹L) — 1 Crore = 100L
- **Goal:** Be the last solvent player standing

---

## ✨ Highlights

- **40-space board** of real South Mumbai landmarks, rendered on an 11×11 CSS grid that scales to fill the screen, with condensed Deco tile lettering that stays legible at every size.
- **Full mobile layout** — on phones the game reflows into a single smooth column (player strip → board → dice dock → RBI → players & log), with a one-tap board magnifier for a pannable close-up. Every desktop feature works on mobile.
- **True 3D dice** — two ivory cubes that lift off the felt, tumble in 3D, bounce, and settle on the rolled faces.
- **Heritage player tokens** — Gateway of India, Rajabai Clock Tower, Taj Mahal Palace, and the BSE Building, drawn as crisp inline-SVG monuments.
- **Art-Deco brand seal** — a gold gateway-and-sunburst medallion (`favicon.svg`) used as the browser-tab icon, setup emblem, and board centerpiece.
- **Reserve Bank of India** — repo-rate-linked loans, mortgages, a live transaction ledger, and a CRR (cash-reserve) advisory.
- **Two themed card decks** — *Mumbai Hustle* (Chance) and *Townie Gossip* (Community Chest), 16 cards each.
- **Automatic turn engine** — roll, move, resolve, and pass play with no manual "end turn"; doubles re-roll, three doubles sends you to Traffic Jam.
- **Procedural sound** — every effect is synthesised in-browser with the Web Audio API (no audio files), with a mute toggle.
- **Light & dark themes** — a 1900s Bombay Art-Deco palette with a one-click dark mode, remembered between visits.

---

## 🕹️ How to Play

1. Open the live link above (or open `index.html` locally in any modern browser).
2. Choose **2–4 players** and enter names.
3. Click **Begin Play**.
4. Roll the dice, buy properties, build offices and HQs, and collect rent.
5. Short on cash? Mortgage property, sell buildings, or take an RBI loan.
6. Bankrupt everyone else to win.

---

## 🗺️ The Board

| Corner | Space | Effect |
|--------|-------|--------|
| 0 | GO | Collect ₹20L each time you pass or land |
| 10 | Traffic Jam | Jail — just visiting, or stuck in Pedder Road traffic |
| 20 | Sea View Terrace | Free parking — no cost, no penalty |
| 30 | No-Parking Zone | Towed! Go directly to Traffic Jam |

Property colour groups run from Brown (Colaba, Crawford) up to Dark Blue (Carmichael Road, Nepean Sea Road). Full rent tables are in [PROPERTY_REFERENCE.md](PROPERTY_REFERENCE.md), and the complete ruleset is in [rules.md](rules.md).

---

## 💰 Financial Rules

| Rule | Value |
|------|-------|
| Starting cash | ₹1,500L (₹15 Crores) |
| GO salary | ₹20L per pass or landing |
| Jail bail | ₹5L (forced after 3 turns) |
| Income Tax | ₹20L flat or 10% of assets (lower) |
| Sea Link Toll | ₹7.5L |
| BMC Luxury Cess | ₹10L |
| Mortgage | 50% of price; +10% interest to lift |
| RBI loans | Up to 3 loans of ₹100L each |
| Loan interest | Repo-rate-linked, accrues on passing GO |

**Buildings:** you need a full colour-group **monopoly** to build, and must build **evenly** across the group. Offices (houses) go up to 4 per property, then convert to an **HQ** (hotel). Selling returns 50% of the build cost.

**Bankruptcy:** if you owe more than you can possibly raise — by mortgaging, selling buildings, and borrowing — you're declared bankrupt automatically and your estate passes to your creditor. You can also concede manually with **Declare Bankruptcy**.

---

## 🛠️ Tech & Project Structure

Vanilla **HTML5 + CSS3 + JavaScript** — no dependencies, no build tooling. Sound is synthesised at runtime via the Web Audio API; there are no external assets required to play.

```
south-mumbai-monopoly/
├── index.html       — entry point (loads everything below)
├── favicon.svg      — Art-Deco brand seal (tab icon + in-game emblem)
├── styles.css       — Art-Deco theme + dark mode + mobile layout, 11×11 grid board
├── audio.js         — Web Audio sound engine (procedural)
├── gameConfig.js    — ALL game data: prices, rents, starting cash, board
├── cards.js         — Mumbai Hustle & Townie Gossip decks
├── bank.js          — money, mortgages, loans, buildings, rent
├── gameState.js     — turn state machine & game state
├── board.js         — board rendering, tokens, building display
├── ui.js            — panels, modals, dice, toasts, RBI screen
├── main.js          — game controller & event wiring
├── rules.md         — full rules
├── PROPERTY_REFERENCE.md — complete rent tables
└── .nojekyll        — serves files as-is on GitHub Pages
```

> All files live at the repository **root** and reference each other with relative paths. Keep them flat — moving the `.js`/`.css` files into subfolders will break the page.

---

## 🌐 Deploy on GitHub Pages (free, no tokens)

The game is fully static, so hosting is free and needs no personal access token:

1. Push every file in this folder to your repository's **root** (HTML, CSS, all `.js`, and `.nojekyll`):

   ```bash
   git add .
   git commit -m "Update South Mumbai Business Game"
   git push
   ```

2. On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `root`**.
3. Wait ~1 minute, then open `https://<your-username>.github.io/<your-repo>/` and **hard-refresh** (Ctrl + F5) to clear the cache.

**Updating tip:** always re-upload **all** the files you changed together. If you edit `gameConfig.js` (e.g. starting cash) but only re-upload some files, the live game keeps the old value until the new `gameConfig.js` is pushed — then hard-refresh to beat the browser cache.

---

## 🔒 Security & Privacy

This game is **100% client-side**. There is no server, no database, and **no API keys, tokens, or secrets** anywhere in the code — nothing sensitive is exposed through "Inspect Element." Player names are sanitised before display, so the game is safe to publish publicly as-is.

---

## 📝 Customisation

All tunable values live in **`gameConfig.js`** — starting cash, property prices, rent tables, building costs, loan limits, and the RBI repo-rate band. Change them there without touching any game logic.

To add real photographs, drop images into an `images/` folder and point the `image:` field of each property in `gameConfig.js` at them. Missing images are hidden automatically, so the game always works without them.

---

*South Mumbai Business Game — Where Heritage Meets High-Stakes Real Estate.*
