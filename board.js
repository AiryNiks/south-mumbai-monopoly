/**
 * board.js — Board rendering.
 *
 * Renders a square 11×11 CSS-grid board where:
 *   • Bottom row  (row 11): positions 0–10  (right→left)
 *   • Left column (col  1): positions 11–19 (bottom→top)  + corners
 *   • Top row     (row  1): positions 20–30 (left→right)
 *   • Right column(col 11): positions 31–39 (top→bottom)  + corners
 *   • Center (cols 2–10, rows 2–10): game info panel
 *
 * Corners (0, 10, 20, 30) are styled 2× bigger via grid-template sizing.
 * Each edge space has its content oriented toward the board center.
 */

const Board = (() => {

  // Per-tile token hop duration (ms) — tuned for a tactile, premium cadence.
  const HOP_MS = 150;
  const HOP_LIFT = 18;          // how high the token lifts at the apex of each hop
  let _travelingIdx = null;     // player index currently mid-flight (hidden from static render)

  // ── Grid position lookup ──────────────────────────────────────────────────

  /**
   * Return {col, row} (1-indexed) for each board position.
   * Corners land on col∈{1,11} × row∈{1,11}.
   */
  function gridPos(position) {
    if (position === 0)  return { col: 11, row: 11 }; // GO — bottom-right
    if (position >= 1  && position <= 9)  return { col: 11 - position, row: 11 };
    if (position === 10) return { col: 1,  row: 11 }; // Jail — bottom-left
    if (position >= 11 && position <= 19) return { col: 1,  row: 11 - (position - 10) };
    if (position === 20) return { col: 1,  row: 1  }; // Free Parking — top-left
    if (position >= 21 && position <= 29) return { col: 1 + (position - 20), row: 1  };
    if (position === 30) return { col: 11, row: 1  }; // Go to Jail — top-right
    if (position >= 31 && position <= 39) return { col: 11, row: 1 + (position - 30) };
    return { col: 1, row: 1 };
  }

  /** Return which edge a position sits on (for CSS orientation classes). */
  function getEdge(position) {
    if (position === 0 || position === 10 || position === 20 || position === 30) return 'corner';
    if (position >= 1  && position <= 9)  return 'bottom';
    if (position >= 11 && position <= 19) return 'left';
    if (position >= 21 && position <= 29) return 'top';
    if (position >= 31 && position <= 39) return 'right';
  }

  // ── Space element builders ────────────────────────────────────────────────

  function buildColorStrip(color) {
    const strip = document.createElement('div');
    strip.className = 'color-strip';
    strip.style.backgroundColor = GAME_CONFIG.COLOR_GROUPS[color]?.hex || '#555';
    return strip;
  }

  function buildTokensContainer() {
    const tc = document.createElement('div');
    tc.className = 'tokens-container';
    return tc;
  }

  /**
   * Build a single board space element.
   * @param {object} cfg  — GAME_CONFIG.BOARD entry
   * @param {string} edge — 'bottom'|'left'|'top'|'right'|'corner'
   */
  function buildSpace(cfg, edge) {
    const el = document.createElement('div');
    el.className = `board-space space-${cfg.type} edge-${edge}`;
    el.dataset.position = cfg.position;
    if (cfg.color) el.dataset.color = cfg.color;

    // Corner spaces get a unique identifier class
    if (cfg.type === 'corner') {
      el.classList.add(`corner-${cfg.subtype || cfg.name.toLowerCase().replace(/\s+/g, '-')}`);
    }

    // ── Color strip (only for purchasable properties) ──────────────────────
    if (cfg.type === 'property' && cfg.color) {
      el.appendChild(buildColorStrip(cfg.color));
    }

    // ── Inner content wrapper ──────────────────────────────────────────────
    const content = document.createElement('div');
    content.className = 'space-content';

    // Property image placeholder
    if (cfg.image) {
      const img = document.createElement('img');
      img.className = 'space-img';
      img.src = cfg.image;
      img.alt = cfg.name;
      img.onerror = () => { img.style.display = 'none'; }; // hide if image missing
      content.appendChild(img);
    }

    // Space icon for special spaces
    if (cfg.type === 'corner' || cfg.type === 'chance' || cfg.type === 'community_chest' || cfg.type === 'tax') {
      const icon = document.createElement('div');
      icon.className = 'space-icon';
      icon.textContent = spaceIcon(cfg);
      content.appendChild(icon);
    }

    if (cfg.type === 'railway') {
      const icon = document.createElement('div');
      icon.className = 'space-icon railway-icon';
      icon.textContent = '≣';
      content.appendChild(icon);
    }

    if (cfg.type === 'utility') {
      const icon = document.createElement('div');
      icon.className = 'space-icon utility-icon';
      icon.textContent = cfg.position === 12 ? '↯' : '≈';
      content.appendChild(icon);
    }

    // Name label — size tier keyed to the longest word so it always fits the tile
    const label  = cfg.shortName || cfg.name;
    const nameEl = document.createElement('div');
    nameEl.className = 'space-name';
    const longestWord = label.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
    if (longestWord >= 10)     nameEl.classList.add('nm-xl');
    else if (longestWord >= 8) nameEl.classList.add('nm-lg');
    else if (longestWord >= 6) nameEl.classList.add('nm-md');
    nameEl.textContent = label;
    content.appendChild(nameEl);

    // Price
    if (cfg.price != null) {
      const priceEl = document.createElement('div');
      priceEl.className = 'space-price';
      priceEl.textContent = `₹${cfg.price}L`;
      content.appendChild(priceEl);
    }

    el.appendChild(content);

    // Token container — a direct child of the SPACE (not the rotated .space-content),
    // so pieces always sit upright and overlay the tile without nudging the name.
    el.appendChild(buildTokensContainer());

    // Buildings display overlay
    const buildings = document.createElement('div');
    buildings.className = 'buildings-display';
    el.appendChild(buildings);

    // Click handler → show property detail modal
    el.addEventListener('click', () => {
      if (typeof UI !== 'undefined') UI.showSpaceDetail(cfg.position);
    });

    return el;
  }

  function spaceIcon(cfg) {
    switch (cfg.subtype || cfg.type) {
      case 'go':            return '⇢';
      case 'jail':          return '⊘';
      case 'free_parking':  return '❖';
      case 'go_to_jail':    return '⊗';
      case 'chance':        return '✦';
      case 'community_chest': return '✉';
      case 'income':        return '₹';
      case 'luxury':        return '◈';
      default:              return '◆';
    }
  }

  // ── Token hop animation (tactile arc movement) ─────────────────────────────

  /** Centre of a tile in coordinates relative to the #board element. */
  function tileCenter(position) {
    const board = document.getElementById('board');
    const tile  = document.querySelector(`.board-space[data-position="${position}"]`);
    if (!board || !tile) return { x: 0, y: 0 };
    const br = board.getBoundingClientRect();
    const tr = tile.getBoundingClientRect();
    return { x: tr.left - br.left + tr.width / 2, y: tr.top - br.top + tr.height / 2 };
  }

  /** Animate one token element along a lifting/dropping arc from→to. */
  function hopTo(el, from, to, dur) {
    return new Promise(resolve => {
      const half = (el.offsetWidth || 15) / 2;
      const x0 = from.x - half, y0 = from.y - half;
      const x1 = to.x   - half, y1 = to.y   - half;
      const mx = (x0 + x1) / 2,  my = Math.min(y0, y1) - HOP_LIFT;

      // Graceful fallback when the Web Animations API is unavailable.
      if (typeof el.animate !== 'function') {
        el.style.transform = `translate(${x1}px, ${y1}px)`;
        setTimeout(resolve, dur);
        return;
      }

      const anim = el.animate([
        // rise — decelerate toward the apex (ease-out)
        { transform: `translate(${x0}px, ${y0}px) scale(1)`,        easing: 'cubic-bezier(0.16, 0.7, 0.3, 1)' },
        // apex — slight lift scale
        { transform: `translate(${mx}px, ${my}px) scale(1.07)`, offset: 0.5, easing: 'cubic-bezier(0.6, 0, 0.85, 0.4)' },
        // drop — accelerate down, settle (gentle squash)
        { transform: `translate(${x1}px, ${y1}px) scale(1)` },
      ], { duration: dur, fill: 'forwards' });

      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      anim.onfinish = finish;
      setTimeout(finish, dur + 60);   // safety net if onfinish never fires
    });
  }

  // ── Public render function ────────────────────────────────────────────────

  return {

    /**
     * Build the entire board DOM and insert into #board.
     * Call once at game start.
     */
    render() {
      const boardEl = document.getElementById('board');
      boardEl.innerHTML = '';

      GAME_CONFIG.BOARD.forEach(cfg => {
        const edge = getEdge(cfg.position);
        const { col, row } = gridPos(cfg.position);
        const el = buildSpace(cfg, edge);
        el.style.gridColumn = col;
        el.style.gridRow    = row;
        boardEl.appendChild(el);
      });

      // Center panel (spans cols 2–10, rows 2–10)
      const center = document.createElement('div');
      center.id = 'board-center';
      center.style.gridColumn = '2 / 11';
      center.style.gridRow    = '2 / 11';
      center.innerHTML = `
        <div class="center-title">
          <img class="center-seal" src="favicon.svg" alt="" />
          <span class="center-title-line1">South Mumbai</span>
          <span class="center-title-line2">Business Game</span>
          <span class="center-tagline">Where Heritage Meets High-Stakes Real Estate</span>
        </div>
        <div class="center-decks">
          <div class="deck-pile deck-hustle" id="deckHustle" title="Mumbai Hustle">
            <div class="deck-label">Mumbai<br>Hustle</div>
          </div>
          <div class="deck-pile deck-gossip" id="deckGossip" title="Townie Gossip">
            <div class="deck-label">Townie<br>Gossip</div>
          </div>
        </div>
        <div id="centerAlert" class="center-alert hidden"></div>
      `;
      boardEl.appendChild(center);

      this.refreshTokens();
      this.refreshBuildings();
    },

    /**
     * Re-render player tokens on all spaces.
     * Call after any player movement.
     */
    refreshTokens() {
      // Clear all token containers
      document.querySelectorAll('.tokens-container').forEach(tc => {
        tc.innerHTML = '';
      });

      if (typeof GameState === 'undefined') return;

      GameState.players.forEach((player, idx) => {
        if (player.status !== 'active') return;
        if (idx === _travelingIdx) return;   // mid-hop: drawn by the traveling token instead
        const spaceEl = document.querySelector(`.board-space[data-position="${player.position}"]`);
        if (!spaceEl) return;
        const tc = spaceEl.querySelector('.tokens-container');
        if (!tc) return;

        const token = document.createElement('div');
        token.className = 'player-token';
        token.style.backgroundColor = GAME_CONFIG.PLAYER_COLORS[idx];
        token.title = player.name;
        token.innerHTML = GAME_CONFIG.monumentIcon(idx);
        if (idx === GameState.currentPlayerIdx) token.classList.add('active-token');
        tc.appendChild(token);
      });
    },

    /**
     * Re-render building indicators on all property spaces.
     */
    refreshBuildings() {
      if (typeof GameState === 'undefined') return;

      document.querySelectorAll('.board-space[data-position]').forEach(el => {
        const pos = parseInt(el.dataset.position);
        const ps  = GameState.propertyState[pos];
        const buildingsEl = el.querySelector('.buildings-display');
        if (!buildingsEl) return;

        // Render custom House (offices) / Hotel (HQ) SVG emblems.
        buildingsEl.innerHTML = (!ps || ps.buildings === 0)
          ? ''
          : GAME_CONFIG.buildingsMarkup(ps.buildings);

        // Mortgaged overlay (ps is undefined for corners/Chance/Tax — guard it)
        if (ps && ps.mortgaged) {
          el.classList.add('mortgaged');
        } else {
          el.classList.remove('mortgaged');
        }
      });

      // Ownership colour tints
      this.refreshOwnership();
    },

    /**
     * Tint each property space with its owner's colour.
     */
    refreshOwnership() {
      if (typeof GameState === 'undefined') return;
      document.querySelectorAll('.board-space[data-position]').forEach(el => {
        const pos = parseInt(el.dataset.position);
        const ps  = GameState.propertyState[pos];
        if (!ps) return;
        // Remove old owner classes
        el.classList.remove('owned', 'player0-owned', 'player1-owned', 'player2-owned', 'player3-owned');
        if (ps.owner !== null) {
          el.classList.add('owned', `player${ps.owner}-owned`);
        }
      });
    },

    /**
     * Animate a player's token hopping `steps` tiles, one tactile arc per tile.
     * Updates player.position after each landed tile and fires onStep(pos) so the
     * caller can play the "wooden tick" exactly as the token lands.
     * Falls back to instant position updates in non-DOM (headless) environments.
     *
     * @returns {Promise<void>} resolves when the whole move completes.
     */
    async animateTokenMove(player, idx, steps, onStep) {
      const board = document.getElementById('board');

      // Headless / no-DOM fallback — just advance the model and tick.
      if (!board || typeof board.appendChild !== 'function' ||
          typeof document.querySelector !== 'function') {
        for (let i = 0; i < steps; i++) {
          player.position = (player.position + 1) % 40;
          if (onStep) onStep(player.position);
        }
        return;
      }

      _travelingIdx = idx;
      this.refreshTokens();                       // remove the static token while it flies

      const trav = document.createElement('div');
      trav.className = 'player-token active-token traveling-token';
      trav.style.position = 'absolute';
      trav.style.left = '0';
      trav.style.top = '0';
      trav.style.margin = '0';
      trav.style.backgroundColor = GAME_CONFIG.PLAYER_COLORS[idx];
      trav.innerHTML = GAME_CONFIG.monumentIcon(idx);
      board.appendChild(trav);

      const half = (trav.offsetWidth || 15) / 2;
      const startC = tileCenter(player.position);
      trav.style.transform = `translate(${startC.x - half}px, ${startC.y - half}px)`;

      for (let i = 0; i < steps; i++) {
        const from    = tileCenter(player.position);
        const nextPos = (player.position + 1) % 40;
        const to      = tileCenter(nextPos);
        await hopTo(trav, from, to, HOP_MS);
        player.position = nextPos;
        if (onStep) onStep(player.position);      // wooden tick lands here
      }

      trav.remove();
      _travelingIdx = null;
      this.refreshTokens();

      // A subtle settle bounce on the freshly-landed token.
      const landed = board.querySelector(
        `.board-space[data-position="${player.position}"] .player-token.active-token`);
      if (landed) {
        landed.classList.add('just-landed');
        setTimeout(() => landed.classList.remove('just-landed'), 380);
      }
    },

    /**
     * Visually highlight the space a player just landed on.
     */
    highlightSpace(position) {
      document.querySelectorAll('.board-space.landed').forEach(el => el.classList.remove('landed'));
      const el = document.querySelector(`.board-space[data-position="${position}"]`);
      if (el) el.classList.add('landed');
    },

    /**
     * Flash a short message in the board center.
     */
    centerAlert(msg, duration = 3000) {
      const el = document.getElementById('centerAlert');
      if (!el) return;
      el.textContent = msg;
      el.classList.remove('hidden');
      clearTimeout(el._timeout);
      el._timeout = setTimeout(() => el.classList.add('hidden'), duration);
    },

    /** Full refresh — call after any state change. */
    refresh() {
      this.refreshTokens();
      this.refreshBuildings();
    },
  };
})();
