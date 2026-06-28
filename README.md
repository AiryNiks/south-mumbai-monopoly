# South Mumbai Business Game 🏙️

> A high-stakes Monopoly-style board game set in South Mumbai's most iconic neighbourhoods — built entirely with vanilla JavaScript, HTML5, and CSS3.

---

## 🎮 Overview

South Mumbai Business Game reimagines the classic property trading board game with real locations from South Mumbai. Buy Colaba Causeway, build offices on Marine Drive, charge rent on Nepean Sea Road, and bankrupt your rivals in the most expensive square mile in India.

- **Players:** 2–4
- **Starting Cash:** ₹500 Lakhs (₹5 Crores) per player
- **Currency:** Indian Lakhs (₹L) — all values in Lakhs
- **Goal:** Be the last player standing by bankrupting everyone else

---

## 🗺️ The Board

40 spaces arranged in an 11×11 CSS grid, clockwise from GO:

| Corner | Description |
|--------|-------------|
| GO (pos 0) | Collect ₹20L each time you pass or land |
| Traffic Jam (pos 10) | Jail — stuck in Pedder Road traffic |
| Sea View Terrace (pos 20) | Free Parking — no action |
| No-Parking Zone (pos 30) | Go directly to Traffic Jam |

---

## 🏠 Properties at a Glance

| Colour | Properties | Price Range | Office Cost | HQ Cost |
|--------|-----------|-------------|-------------|---------|
| 🟤 Brown | Colaba Causeway, Crawford Market | ₹60L | ₹5L | ₹20L |
| 🔵 Light Blue | Flora Fountain, Horniman Circle, Apollo Bunder | ₹100–120L | ₹5L | ₹20L |
| 🩷 Pink | Grant Road, Esplanade, Fort Street | ₹140–160L | ₹10L | ₹30L |
| 🟠 Orange | Strand Road, Ballard Pier, Princess Street | ₹180–200L | ₹10L | ₹30L |
| 🔴 Red | Kala Ghoda, Marine Drive, Worli Sea Face | ₹220–240L | ₹15L | ₹40L |
| 🟡 Yellow | Nariman Point, Cuffe Parade, Pedder Road | ₹260–280L | ₹15L | ₹40L |
| 🟢 Green | Malabar Hill, Breach Candy, Altamount Road | ₹300–320L | ₹20L | ₹50L |
| 🔷 Dark Blue | Carmichael Road, Nepean Sea Road | ₹350–400L | ₹20L | ₹50L |

Full rent tables in [PROPERTY_REFERENCE.md](PROPERTY_REFERENCE.md).

---

## 🚉 Railway Stations

All four stations cost **₹200L** (mortgage ₹100L each).

| Pos | Station |
|-----|---------|
| 5 | CSMT — UNESCO World Heritage terminus |
| 14 | Churchgate — Western Railway southern terminus |
| 25 | Marine Lines — near Oval Maidan |
| 35 | Mumbai Central — long-distance & suburban hub |

**Rent:** ₹25L (1 owned) → ₹50L (2) → ₹100L (3) → ₹200L (4)

---

## ⚡ Utilities

Both utilities cost **₹150L** (mortgage ₹75L each).

| Pos | Utility |
|-----|---------|
| 12 | BEST Electricity |
| 28 | Reliance Energy |

**Rent:** 4× dice roll (1 owned) or 10× dice roll (2 owned)

---

## 🃏 Card Decks

- **Mumbai Hustle** (Chance) — 16 cards at positions 7, 22, 33
- **Townie Gossip** (Community Chest) — 16 cards at positions 2, 17

Cards include: advance to GO, Sea Link Shortcut, Traffic Jam (go to jail), BMC repairs, Kala Ghoda Art Exhibition (collect from all players), and Get Out of Jail Free cards.

---

## 💰 Financial Rules

| Rule | Value |
|------|-------|
| GO salary | ₹20L |
| Jail bail | ₹5L |
| Income Tax | ₹20L flat or 10% of assets (choose lower) |
| Sea Link Toll | ₹7.5L |
| BMC Luxury Cess | ₹10L |
| Mortgage interest | 10% of mortgage value to unmortgage |
| Bank loan max | 3 loans × ₹100L each |
| Loan interest | 10% charged on each pass of GO |

---

## 🏗️ Buildings

Properties must be in a **monopoly** (own all colours) before building. The even-building rule is enforced — you must build evenly across all properties in a group.

- **Offices** (houses) — up to 4 per property
- **HQ** (hotel) — replaces 4 offices; requires all group properties to have 4 offices first
- Selling returns **50%** of build cost

---

## 🚀 How to Play

1. Open `index.html` in any modern browser
2. Set player count (2–4) and enter names
3. Click **Start Game**
4. Roll dice, buy properties, build offices, collect rent
5. Use the Bank Loans button if you're short on cash
6. Last player standing wins

---

## 🛠️ Tech Stack

- **HTML5** — single `index.html` entry point
- **CSS3** — 1900s Bombay Art Deco theme (cream & gold) with a dark mode toggle, 11×11 CSS grid board
- **Vanilla JavaScript** — no frameworks, no build tools, no backend
- **Web Audio API** — all sound effects are synthesised in-browser (no audio files)

> **100% client-side & safe to publish.** The game runs entirely in the browser — there is no server, no database, and no API keys or secrets of any kind in this repository. Nothing sensitive is exposed via "Inspect Element."

### File Structure

```
south-mumbai-monopoly/
├── index.html       — game entry point
├── styles.css       — dark minimalist UI
├── gameConfig.js    — all board data, prices, rents (edit here for customisation)
├── cards.js         — Mumbai Hustle & Townie Gossip card decks
├── bank.js          — Bank class (mortgages, loans, buildings, rent calculation)
├── gameState.js     — turn state machine & game state singleton
├── board.js         — board rendering & token/building display
├── ui.js            — modals, player panels, dice animation, toasts
└── main.js          — game controller & event wiring
```

---

## 🌐 Publish on GitHub Pages (free, no tokens)

Because the game is fully static, you can host it for free with GitHub Pages — no build step and no personal access token required:

1. Create a new repository on GitHub and push this folder:

   ```bash
   git init
   git add .
   git commit -m "South Mumbai Business Game"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Source → Deploy from a branch**, pick `main` / `root`, and save.
3. Your game goes live at `https://<your-username>.github.io/<your-repo>/`.

Use the GitHub Desktop app or a credential helper for authentication — never paste a personal access token into a script or commit it to the repo.

---

## 📝 Customisation

All game data lives in `gameConfig.js` — change property prices, rent tables, building costs, or card text there without touching any game logic.

To add real photos, place images in an `images/` folder and update the `image:` field for each property in `gameConfig.js`.

---

*South Mumbai Business Game — Where Heritage Meets High Stakes Real Estate*
