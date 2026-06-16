/**
 * ui.js — All user interface logic.
 *
 * Manages:
 *   • Left sidebar: player panels + game log
 *   • Right sidebar: dice, action buttons, current-player info
 *   • Modals: property detail, buy/auction, card reveal, mortgage/build/loan, game over
 *   • Toast notifications
 *   • Dice animation
 */

const UI = (() => {

  // ── Toast system ──────────────────────────────────────────────────────────

  let _toastTimer = null;

  function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast show toast-${type}`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  // ── Game log ──────────────────────────────────────────────────────────────

  function appendLog(msg) {
    const log = document.getElementById('gameLog');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = msg;
    log.appendChild(entry);
    // Keep last 40 entries
    while (log.children.length > 40) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }

  // ── Player panels ─────────────────────────────────────────────────────────

  function refreshPlayerPanels() {
    const container = document.getElementById('playerPanels');
    if (!container || typeof GameState === 'undefined') return;

    container.innerHTML = '';
    GameState.players.forEach((player, idx) => {
      const panel = document.createElement('div');
      panel.className = `player-panel ${player.status === 'bankrupt' ? 'bankrupt' : ''} ${idx === GameState.currentPlayerIdx ? 'active-player' : ''}`;
      panel.style.setProperty('--player-color', GAME_CONFIG.PLAYER_COLORS[idx]);

      const loans      = (player.loans || []).reduce((s, l) => s + l.principal + l.interest, 0);
      const netWorth   = calcNetWorth(player);
      const jailBadge  = player.inJail ? `<span class="badge badge-jail">🚦 Traffic Jam</span>` : '';
      const jailCards  = player.jailFreeCards ? `<span class="badge badge-card">🎟 ×${player.jailFreeCards}</span>` : '';

      panel.innerHTML = `
        <div class="player-header">
          <span class="player-token-icon" style="color:${GAME_CONFIG.PLAYER_COLORS[idx]}">${GAME_CONFIG.PLAYER_TOKENS[idx]}</span>
          <span class="player-name-label">${player.name}</span>
          ${jailBadge}${jailCards}
        </div>
        <div class="player-stats">
          <span class="stat-cash">₹${fmt(player.cash)}L</span>
          <span class="stat-props">${player.properties.length} 🏠</span>
          ${loans > 0 ? `<span class="stat-loan">Loan: ₹${fmt(loans)}L</span>` : ''}
        </div>
        <div class="player-net-worth">Net worth ≈ ₹${fmt(netWorth)}L</div>
      `;

      panel.addEventListener('click', () => showPlayerDetail(idx));
      container.appendChild(panel);
    });
  }

  function calcNetWorth(player) {
    let worth = player.cash;
    player.properties.forEach(pos => {
      const cfg = GAME_CONFIG.getSpace(pos);
      const ps  = GameState.propertyState[pos];
      if (!ps) return;
      worth += ps.mortgaged ? cfg.mortgage : cfg.price;
      if (ps.buildings > 0 && ps.buildings < 5) {
        const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
        worth += ps.buildings * (grp ? grp.officeCost : 0);
      } else if (ps.buildings === 5) {
        const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
        worth += grp ? grp.hqCost : 0;
      }
    });
    const loans = (player.loans || []).reduce((s, l) => s + l.principal + l.interest, 0);
    return worth - loans;
  }

  // ── Current-player action bar (right sidebar) ─────────────────────────────

  function refreshActionBar() {
    if (typeof GameState === 'undefined') return;
    const cp    = GameState.currentPlayer;
    const phase = GameState.turnPhase;

    // Update dice button state
    const rollBtn   = document.getElementById('btnRoll');
    const endBtn    = document.getElementById('btnEndTurn');
    const bailBtn   = document.getElementById('btnBail');
    const cardBtn   = document.getElementById('btnJailCard');

    if (rollBtn) rollBtn.disabled  = phase !== TurnPhase.WAITING_ROLL;
    if (endBtn)  endBtn.disabled   = phase !== TurnPhase.CAN_END_TURN;
    if (bailBtn) bailBtn.style.display = (cp.inJail && phase === TurnPhase.WAITING_ROLL) ? 'inline-flex' : 'none';
    if (cardBtn) cardBtn.style.display = (cp.inJail && cp.jailFreeCards > 0 && phase === TurnPhase.WAITING_ROLL) ? 'inline-flex' : 'none';

    // Current player info strip
    const strip = document.getElementById('currentPlayerStrip');
    if (strip) {
      strip.style.borderColor = GAME_CONFIG.PLAYER_COLORS[GameState.currentPlayerIdx];
      strip.innerHTML = `
        <span class="cp-token" style="color:${GAME_CONFIG.PLAYER_COLORS[GameState.currentPlayerIdx]}">${GAME_CONFIG.PLAYER_TOKENS[GameState.currentPlayerIdx]}</span>
        <span class="cp-name">${cp.name}</span>
        <span class="cp-cash">₹${fmt(cp.cash)}L</span>
      `;
    }

    // Phase label
    const phaseEl = document.getElementById('phaseLabel');
    if (phaseEl) phaseEl.textContent = phaseLabel(phase);
  }

  function phaseLabel(phase) {
    const map = {
      [TurnPhase.WAITING_ROLL]:  '🎲 Roll the dice',
      [TurnPhase.ANIMATING]:     '⏳ Moving…',
      [TurnPhase.SPACE_ACTION]:  '⚡ Action',
      [TurnPhase.BUY_DECISION]:  '🏠 Buy or Auction?',
      [TurnPhase.JAIL_DECISION]: '🚦 Jail',
      [TurnPhase.AWAITING_PAY]:  '💸 Need to pay!',
      [TurnPhase.CAN_END_TURN]:  '✅ End turn',
      [TurnPhase.GAME_OVER]:     '🏆 Game Over!',
    };
    return map[phase] || phase;
  }

  // ── Dice ──────────────────────────────────────────────────────────────────

  // Pip layout per face — indices into a 3×3 grid (0=top-left … 8=bottom-right).
  const PIP_MAP = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  // Render a vintage-cube face by lighting up the right pips in a 3×3 grid.
  function renderDieFace(el, face) {
    const n = Math.max(1, Math.min(6, face | 0));
    const on = PIP_MAP[n];
    let html = '';
    for (let i = 0; i < 9; i++) {
      html += `<span class="pip${on.includes(i) ? ' on' : ''}"></span>`;
    }
    el.innerHTML = html;
    el.dataset.face = String(n);
  }

  function animateDice(d1, d2, callback) {
    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');
    if (!die1 || !die2) { callback && callback(); return; }

    die1.classList.add('rolling');
    die2.classList.add('rolling');

    let ticks = 0;
    const interval = setInterval(() => {
      renderDieFace(die1, Math.ceil(Math.random() * 6));
      renderDieFace(die2, Math.ceil(Math.random() * 6));
      if (++ticks >= 8) {
        clearInterval(interval);
        renderDieFace(die1, d1);
        renderDieFace(die2, d2);
        die1.classList.remove('rolling');
        die2.classList.remove('rolling');
        callback && callback();
      }
    }, 80);
  }

  // ── Space / Property detail modal ─────────────────────────────────────────

  function showSpaceDetail(position) {
    const cfg = GAME_CONFIG.getSpace(position);
    if (!cfg) return;
    const ps  = (typeof GameState !== 'undefined') ? GameState.propertyState[position] : null;

    const modal = document.getElementById('modalDetail');
    if (!modal) return;

    const owner = ps?.owner !== null && ps?.owner !== undefined
      ? (typeof GameState !== 'undefined' ? GameState.getPlayerById(ps.owner)?.name : null)
      : null;

    // Build content
    let html = `<div class="modal-space-header">`;
    if (cfg.color) {
      html += `<div class="modal-color-bar" style="background:${GAME_CONFIG.COLOR_GROUPS[cfg.color]?.hex}"></div>`;
    }
    html += `<h2 class="modal-title">${cfg.name}</h2>`;
    if (cfg.description) html += `<p class="modal-desc">${cfg.description}</p>`;
    html += `</div>`;

    // Image
    if (cfg.image) {
      html += `<img class="modal-img" src="${cfg.image}" alt="${cfg.name}" onerror="this.style.display='none'">`;
    }

    // Stats grid
    if (cfg.price) {
      html += `<div class="modal-stats">`;
      html += `<div class="stat-row"><span>Purchase price</span><span>₹${cfg.price}L</span></div>`;
      html += `<div class="stat-row"><span>Mortgage value</span><span>₹${cfg.mortgage}L</span></div>`;
      if (cfg.type === 'property' && cfg.rent) {
        const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
        html += `<div class="stat-row"><span>Base rent</span><span>₹${cfg.rent[0]}L</span></div>`;
        html += `<div class="stat-row"><span>1 Office</span><span>₹${cfg.rent[1]}L</span></div>`;
        html += `<div class="stat-row"><span>2 Offices</span><span>₹${cfg.rent[2]}L</span></div>`;
        html += `<div class="stat-row"><span>3 Offices</span><span>₹${cfg.rent[3]}L</span></div>`;
        html += `<div class="stat-row"><span>4 Offices</span><span>₹${cfg.rent[4]}L</span></div>`;
        html += `<div class="stat-row highlight"><span>HQ (Hotel)</span><span>₹${cfg.rent[5]}L</span></div>`;
        html += `<div class="stat-row"><span>Office cost</span><span>₹${grp?.officeCost}L each</span></div>`;
        html += `<div class="stat-row"><span>HQ cost</span><span>₹${grp?.hqCost}L</span></div>`;
      }
      if (cfg.type === 'railway') {
        html += `<div class="stat-row"><span>Rent (1 line)</span><span>₹${cfg.rent[0]}L</span></div>`;
        html += `<div class="stat-row"><span>Rent (2 lines)</span><span>₹${cfg.rent[1]}L</span></div>`;
        html += `<div class="stat-row"><span>Rent (3 lines)</span><span>₹${cfg.rent[2]}L</span></div>`;
        html += `<div class="stat-row highlight"><span>Rent (4 lines)</span><span>₹${cfg.rent[3]}L</span></div>`;
      }
      if (cfg.type === 'utility') {
        html += `<div class="stat-row"><span>Rent (1 util.)</span><span>${cfg.rentMultiplier[0]}× dice</span></div>`;
        html += `<div class="stat-row highlight"><span>Rent (2 utils.)</span><span>${cfg.rentMultiplier[1]}× dice</span></div>`;
      }
      html += `</div>`; // .modal-stats
    }

    // Ownership / status
    if (ps) {
      html += `<div class="modal-status">`;
      if (owner) html += `<p>Owner: <strong>${owner}</strong></p>`;
      else       html += `<p>Unowned — available to buy</p>`;
      if (ps.mortgaged) html += `<p class="badge badge-mortgage">MORTGAGED</p>`;
      if (ps.buildings > 0) {
        const bText = ps.buildings === 5 ? '🏢 HQ' : `🏠 ${ps.buildings} office(s)`;
        html += `<p>Development: ${bText}</p>`;
      }
      html += `</div>`;
    }

    // Action buttons (vary based on context)
    html += `<div class="modal-actions" id="modalDetailActions"></div>`;

    document.getElementById('modalDetailBody').innerHTML = html;
    _populateDetailActions(position, cfg, ps);
    openModal('modalDetail');
  }

  function _populateDetailActions(position, cfg, ps) {
    const actionsEl = document.getElementById('modalDetailActions');
    if (!actionsEl || typeof GameState === 'undefined') return;
    const cp    = GameState.currentPlayer;
    const isOwner = ps && ps.owner === cp.id;
    const buttons = [];

    if (cfg.type === 'property' && ps) {
      // Mortgage / Unmortgage
      if (isOwner && !ps.mortgaged && ps.buildings === 0) {
        buttons.push({ label: `Mortgage (₹${cfg.mortgage}L)`, id: 'btnMortgage', action: () => {
          closeModal('modalDetail');
          if (typeof Game !== 'undefined') Game.mortgageProperty(position);
        }});
      }
      if (isOwner && ps.mortgaged) {
        const cost = Math.ceil(cfg.mortgage * 1.1);
        buttons.push({ label: `Unmortgage (₹${cost}L)`, id: 'btnUnmortgage', action: () => {
          closeModal('modalDetail');
          if (typeof Game !== 'undefined') Game.unmortgageProperty(position);
        }});
      }
      // Build / sell offices
      if (isOwner && !ps.mortgaged) {
        if (ps.buildings < 4) {
          const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
          buttons.push({ label: `Build Office (₹${grp?.officeCost}L)`, id: 'btnBuildOff', action: () => {
            if (typeof Game !== 'undefined') Game.buildOffice(position);
            closeModal('modalDetail');
          }});
        }
        if (ps.buildings > 0 && ps.buildings < 5) {
          const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
          buttons.push({ label: `Sell Office (₹${Math.floor(grp?.officeCost/2)}L)`, id: 'btnSellOff', action: () => {
            if (typeof Game !== 'undefined') Game.sellOffice(position);
            closeModal('modalDetail');
          }});
        }
        if (ps.buildings === 4) {
          const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
          buttons.push({ label: `Upgrade to HQ (₹${grp?.hqCost}L)`, id: 'btnBuildHQ', action: () => {
            if (typeof Game !== 'undefined') Game.buildHQ(position);
            closeModal('modalDetail');
          }});
        }
        if (ps.buildings === 5) {
          const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
          buttons.push({ label: `Sell HQ (₹${Math.floor(grp?.hqCost/2)}L)`, id: 'btnSellHQ', action: () => {
            if (typeof Game !== 'undefined') Game.sellHQ(position);
            closeModal('modalDetail');
          }});
        }
      }
    }

    buttons.push({ label: 'Close', id: 'btnDetailClose', secondary: true, action: () => closeModal('modalDetail') });

    actionsEl.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.id = b.id;
      btn.className = b.secondary ? 'btn btn-secondary' : 'btn btn-primary';
      btn.textContent = b.label;
      btn.addEventListener('click', b.action);
      actionsEl.appendChild(btn);
    });
  }

  // ── Buy / Auction modal ───────────────────────────────────────────────────

  function showBuyDecision(position) {
    const cfg = GAME_CONFIG.getSpace(position);
    const cp  = GameState.currentPlayer;

    const modal  = document.getElementById('modalBuy');
    const body   = document.getElementById('modalBuyBody');
    if (!modal || !body) return;

    body.innerHTML = `
      <h2>${cfg.name}</h2>
      <p class="modal-price">Purchase price: <strong>₹${cfg.price}L</strong></p>
      <p>Your cash: ₹${fmt(cp.cash)}L</p>
      ${cp.cash < cfg.price ? `<p class="warn">⚠️ You cannot afford this property.</p>` : ''}
    `;

    document.getElementById('btnBuyProperty').onclick = () => {
      closeModal('modalBuy');
      if (typeof Game !== 'undefined') Game.confirmBuy(position);
    };
    document.getElementById('btnAuctionProperty').onclick = () => {
      closeModal('modalBuy');
      if (typeof Game !== 'undefined') Game.startAuction(position);
    };

    if (cp.cash < cfg.price) {
      document.getElementById('btnBuyProperty').disabled = true;
    }

    openModal('modalBuy');
  }

  // ── Auction modal ─────────────────────────────────────────────────────────

  function showAuction(position) {
    const cfg = GAME_CONFIG.getSpace(position);
    const modal = document.getElementById('modalAuction');
    if (!modal) return;

    document.getElementById('auctionPropName').textContent = cfg.name;
    document.getElementById('auctionCurrentBid').textContent = `₹${GAME_CONFIG.AUCTION_MIN_BID}L`;

    // Populate bidder select
    const select = document.getElementById('auctionBidder');
    select.innerHTML = '';
    GameState.players.forEach((p, i) => {
      if (p.status !== 'active') return;
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${p.name} (₹${fmt(p.cash)}L)`;
      select.appendChild(opt);
    });

    document.getElementById('auctionBidInput').value = GAME_CONFIG.AUCTION_MIN_BID;

    document.getElementById('btnConfirmAuction').onclick = () => {
      const winnerIdx = parseInt(document.getElementById('auctionBidder').value);
      const bid       = parseFloat(document.getElementById('auctionBidInput').value);
      closeModal('modalAuction');
      if (typeof Game !== 'undefined') Game.completeAuction(winnerIdx, position, bid);
    };
    document.getElementById('btnCancelAuction').onclick = () => closeModal('modalAuction');

    openModal('modalAuction');
  }

  // ── Card reveal modal ─────────────────────────────────────────────────────

  function showCard(deckName, card) {
    const modal   = document.getElementById('modalCard');
    const deckEl  = document.getElementById('cardDeckName');
    const titleEl = document.getElementById('cardTitle');
    const textEl  = document.getElementById('cardText');
    if (!modal) return;

    deckEl.textContent  = deckName;
    titleEl.textContent = card.title;
    textEl.textContent  = card.text;
    modal.dataset.deck  = deckName;

    document.getElementById('btnAcknowledgeCard').onclick = () => closeModal('modalCard');
    openModal('modalCard');
  }

  // ── Loan modal ────────────────────────────────────────────────────────────

  function showLoanDialog() {
    const modal = document.getElementById('modalLoan');
    if (!modal || typeof GameState === 'undefined') return;
    const cp    = GameState.currentPlayer;
    const loans = (cp.loans || []).reduce((s, l) => s + l.principal + l.interest, 0);

    document.getElementById('loanPlayerName').textContent  = cp.name;
    document.getElementById('loanCurrentDebt').textContent = `₹${fmt(loans)}L`;
    document.getElementById('loanAmount').value            = '';
    document.getElementById('repayAmount').value           = '';

    document.getElementById('btnTakeLoan').onclick = () => {
      const amt = parseFloat(document.getElementById('loanAmount').value);
      if (isNaN(amt) || amt <= 0) { toast('Enter a valid amount.', 'error'); return; }
      closeModal('modalLoan');
      if (typeof Game !== 'undefined') Game.takeLoan(amt);
    };
    document.getElementById('btnRepayLoan').onclick = () => {
      const amt = parseFloat(document.getElementById('repayAmount').value);
      if (isNaN(amt) || amt <= 0) { toast('Enter a valid amount.', 'error'); return; }
      closeModal('modalLoan');
      if (typeof Game !== 'undefined') Game.repayLoan(amt);
    };
    document.getElementById('btnCloseLoan').onclick = () => closeModal('modalLoan');

    openModal('modalLoan');
  }

  // ── Player detail modal ───────────────────────────────────────────────────

  function showPlayerDetail(idx) {
    const modal  = document.getElementById('modalPlayer');
    const body   = document.getElementById('modalPlayerBody');
    if (!modal || !body || typeof GameState === 'undefined') return;

    const player = GameState.players[idx];
    const color  = GAME_CONFIG.PLAYER_COLORS[idx];
    const loans  = (player.loans || []).reduce((s, l) => s + l.principal + l.interest, 0);

    let html = `
      <div class="player-detail-header" style="border-color:${color}">
        <span style="color:${color};font-size:2rem">${GAME_CONFIG.PLAYER_TOKENS[idx]}</span>
        <h2>${player.name}</h2>
      </div>
      <div class="modal-stats">
        <div class="stat-row"><span>Cash</span><span>₹${fmt(player.cash)}L</span></div>
        <div class="stat-row"><span>Properties</span><span>${player.properties.length}</span></div>
        <div class="stat-row"><span>Jail Free Cards</span><span>${player.jailFreeCards || 0}</span></div>
        ${loans > 0 ? `<div class="stat-row warn"><span>Outstanding Loans</span><span>₹${fmt(loans)}L</span></div>` : ''}
        <div class="stat-row highlight"><span>Net Worth ≈</span><span>₹${fmt(calcNetWorth(player))}L</span></div>
      </div>
    `;

    if (player.properties.length > 0) {
      html += `<h3 class="section-label">Properties</h3><div class="property-list">`;
      player.properties.forEach(pos => {
        const cfg = GAME_CONFIG.getSpace(pos);
        const ps  = GameState.propertyState[pos];
        const colorHex = cfg.color ? GAME_CONFIG.COLOR_GROUPS[cfg.color]?.hex : '#555';
        const bText = ps.buildings === 0 ? '' : ps.buildings === 5 ? ' 🏢' : ` ${'🏠'.repeat(ps.buildings)}`;
        html += `
          <div class="prop-item" style="border-left-color:${colorHex}" onclick="UI.showSpaceDetail(${pos})">
            <span>${cfg.name}${bText}</span>
            <span>${ps.mortgaged ? '<em>Mortgaged</em>' : `₹${cfg.price}L`}</span>
          </div>`;
      });
      html += `</div>`;
    }

    html += `<div class="modal-actions">
      <button class="btn btn-secondary" onclick="UI.closeModal('modalPlayer')">Close</button>
    </div>`;

    body.innerHTML = html;
    openModal('modalPlayer');
  }

  // ── Game Over modal ───────────────────────────────────────────────────────

  function showGameOver(winner) {
    const modal = document.getElementById('modalGameOver');
    if (!modal) return;
    document.getElementById('winnerName').textContent  = winner.name;
    document.getElementById('winnerToken').textContent = GAME_CONFIG.PLAYER_TOKENS[winner.id];
    document.getElementById('winnerToken').style.color = GAME_CONFIG.PLAYER_COLORS[winner.id];
    openModal('modalGameOver');
  }

  // ── Shortfall modal ───────────────────────────────────────────────────────

  function showShortfallPanel(player, amount) {
    toast(`${player.name} needs ₹${fmt(amount)}L more! Sell buildings or mortgage properties.`, 'error');
    const panel = document.getElementById('shortfallPanel');
    if (panel) {
      panel.style.display = 'block';
      document.getElementById('shortfallAmount').textContent = `₹${fmt(amount)}L`;
    }
  }

  function hideShortfallPanel() {
    const panel = document.getElementById('shortfallPanel');
    if (panel) panel.style.display = 'none';
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.add('show'); m.setAttribute('aria-hidden', 'false'); }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }
  }

  // ── Number formatter ──────────────────────────────────────────────────────

  function fmt(n) {
    if (n === undefined || n === null) return '0';
    const rounded = Math.round(n * 10) / 10;
    return rounded.toLocaleString('en-IN');
  }

  // ── Public API ───────────────────────────────────�