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
      icon.textContent = '🚂';
      content.appendChild(icon);
    }

    if (cfg.type === 'utility') {
      const icon = document.createElement('div');
      icon.className = 'space-icon utility-icon';
      icon.textContent = cfg.position === 12 ? '⚡' : '🔌';
      content.appendChild(icon);
    }

    // Name label
    const nameEl = document.createElement('div');
    nameEl.className = 'space-name';
    nameEl.textContent = cfg.shortName || cfg.name;
    content.appendChild(nameEl);

    // Price
    if (cfg.price != null) {
      const priceEl = document.createElement('div');
      priceEl.className = 'space-price';
      priceEl.textContent = `₹${cfg.price}L`;
      content.appendChild(priceEl);
    }

    // Token container (player tokens go here)
    content.appendChild(buildTokensContainer());

    el.appendChild(content);

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
      case 'go':            return '🏁';
      case 'jail':          return '🚦';
      case 'free_parking':  return '🌊';
      case 'go_to_jail':    return '🚔';
      case 'chance':        return '🎲';
      case 'community_chest': return '📬';
      case 'income':        return '💸';
      case 'luxury':        return '💎';
      default:              return '❓';
    }
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
          <span class="center-title-line1">South Mumbai</span>
          <span class="center-title-line2">Business Game</span>
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
        const spaceEl = document.querySelector(`.board-space[data-position="${player.position}"]`);
        if (!spaceEl) return;
        const tc = spaceEl.querySelector('.tokens-container');
        if (!tc) return;

        const token = document.createElement('div');
        token.className = 'player-token';
        token.style.backgroundColor = GAME_CONFIG.PLAYER_COLORS[idx];
        token.title = player.name;
        token.textContent = GAME_CONFIG.PLAYER_TOKENS[idx] || '●';
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
        buildingsEl.innerHTML = '';

        if (!ps || ps.buildings === 0) return;

        if (ps.buildings === 5) {
          // HQ
          const hq = document.createElement('div');
          hq.className = 'building hq';
          hq.textContent = '🏢';
          buildingsEl.appendChild(hq);
        } else {
          for (let i = 0; i < ps.buildings; i++) {
            const off = document.createElement('div');
            off.className = 'building office';
            buildingsEl.appendChild(off);
          }
        }

        // Mortgaged overlay
        if (ps.mortgaged) {
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
