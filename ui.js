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
      const jailBadge  = player.inJail ? `<span class="badge badge-jail">Detained</span>` : '';
      const jailCards  = player.jailFreeCards ? `<span class="badge badge-card">Pardon ×${player.jailFreeCards}</span>` : '';

      panel.innerHTML = `
        <div class="player-header">
          ${GAME_CONFIG.monumentBadge(idx)}
          <span class="player-name-label">${player.name}</span>
          ${jailBadge}${jailCards}
        </div>
        <div class="player-stats">
          <span class="stat-cash">₹${fmt(player.cash)}L</span>
          <span class="stat-props">${player.properties.length} estates</span>
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
        ${GAME_CONFIG.monumentBadge(GameState.currentPlayerIdx, 'lg')}
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
      [TurnPhase.WAITING_ROLL]:  'Roll the dice',
      [TurnPhase.ANIMATING]:     'Moving…',
      [TurnPhase.SPACE_ACTION]:  'Action',
      [TurnPhase.BUY_DECISION]:  'Buy or Auction?',
      [TurnPhase.JAIL_DECISION]: 'Detained',
      [TurnPhase.AWAITING_PAY]:  'Payment due',
      [TurnPhase.CAN_END_TURN]:  'End turn',
      [TurnPhase.GAME_OVER]:     'Game Over',
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

    // Clatter of dice tumbling on a smooth surface.
    if (typeof AUDIO !== 'undefined') AUDIO.play('dice');

    die1.classList.add('rolling');
    die2.classList.add('rolling');

    // Ease-out: face-switching starts fast and progressively slows, so the roll
    // naturally decelerates before revealing the final numbers.
    const delays = [55, 60, 68, 80, 96, 116, 142, 176, 214];
    let i = 0;

    const settle = () => {
      renderDieFace(die1, d1);
      renderDieFace(die2, d2);
      die1.classList.remove('rolling');
      die2.classList.remove('rolling');
      die1.classList.add('settle');
      die2.classList.add('settle');
      setTimeout(() => {
        die1.classList.remove('settle');
        die2.classList.remove('settle');
      }, 280);
      callback && callback();
    };

    const step = () => {
      if (i >= delays.length) { settle(); return; }
      renderDieFace(die1, Math.ceil(Math.random() * 6));
      renderDieFace(die2, Math.ceil(Math.random() * 6));
      setTimeout(step, delays[i++]);
    };
    step();
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
        html += `<p class="dev-line">Development: ${bldLabel(ps.buildings)}</p>`;
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

    const grp        = cfg.color ? GAME_CONFIG.COLOR_GROUPS[cfg.color] : null;
    const stripColor = grp ? grp.hex : 'var(--accent-gold)';
    const groupLabel = cfg.color
      ? cfg.color.replace(/-/g, ' ').toUpperCase()
      : (cfg.type === 'railway' ? 'RAILWAY' : cfg.type === 'utility' ? 'UTILITY' : '');
    const baseRent   = Array.isArray(cfg.rent) ? cfg.rent[0] : null;
    const desc       = cfg.description || '';
    const affordable = cp.cash >= cfg.price;

    body.innerHTML = `
      <button class="modal-close" id="btnCloseBuy" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="7.5" y1="7.5" x2="16.5" y2="16.5"/><line x1="16.5" y1="7.5" x2="7.5" y2="16.5"/></svg></button>
      <div class="buy-strip" style="background:${stripColor}"></div>
      <div class="buy-head">
        <h2 class="buy-title">${cfg.name}</h2>
        ${groupLabel ? `<div class="buy-group">${groupLabel}</div>` : ''}
      </div>
      ${desc ? `<p class="buy-desc">${desc}</p>` : ''}
      <div class="buy-stats">
        <div class="stat-row highlight"><span>Purchase price</span><span>₹${cfg.price}L</span></div>
        ${baseRent != null ? `<div class="stat-row"><span>Base rent</span><span>₹${baseRent}L</span></div>` : ''}
        ${Array.isArray(cfg.rentMultiplier) ? `<div class="stat-row"><span>Rent</span><span>${cfg.rentMultiplier[0]}×–${cfg.rentMultiplier[1]}× dice</span></div>` : ''}
        ${cfg.mortgage != null ? `<div class="stat-row"><span>Mortgage value</span><span>₹${cfg.mortgage}L</span></div>` : ''}
        <div class="stat-row"><span>Your cash</span><span>₹${fmt(cp.cash)}L</span></div>
      </div>
      ${!affordable ? `<p class="buy-warn">You can't afford this — choose Auction.</p>` : ''}
    `;

    document.getElementById('btnBuyProperty').onclick = () => {
      closeModal('modalBuy');
      if (typeof Game !== 'undefined') Game.confirmBuy(position);
    };
    document.getElementById('btnAuctionProperty').onclick = () => {
      closeModal('modalBuy');
      if (typeof Game !== 'undefined') Game.startAuction(position);
    };
    document.getElementById('btnCloseBuy').onclick = () => {
      closeModal('modalBuy');
      if (typeof Game !== 'undefined') Game.declinePurchase();
    };

    document.getElementById('btnBuyProperty').disabled = !affordable;  // reset each open

    closeModal('modalCard');   // avoid stacking a leftover card modal under the prompt
    openModal('modalBuy');
  }

  // ── Auction modal ─────────────────────────────────────────────────────────

  /**
   * Turn-by-turn auction prompt. Shows the property, the current high bid, and
   * prompts ONE bidder at a time to raise or pass.
   * @param {number} position  board position being auctioned
   * @param {object} ctx       { bidderName, bidderCash, currentBid, highBidderName, minBid }
   */
  function showAuction(position, ctx) {
    const cfg  = GAME_CONFIG.getSpace(position);
    const body = document.getElementById('modalAuctionBody');
    if (!body || !ctx) return;

    const highLine = ctx.highBidderName
      ? `High bid: <strong>₹${fmt(ctx.currentBid)}L</strong> — ${ctx.highBidderName}`
      : `No bids yet · opening at ₹${fmt(ctx.minBid)}L`;
    const canAfford = ctx.bidderCash >= ctx.minBid;

    body.innerHTML = `
      <div class="modal-title">Property Auction</div>
      <div class="modal-desc"><strong>${cfg.name}</strong></div>
      <div class="modal-desc">${highLine}</div>
      <div class="modal-desc"><strong>${ctx.bidderName}</strong> to bid — cash ₹${fmt(ctx.bidderCash)}L</div>
      <div class="auction-input-row">
        <input id="auctionBidInput" type="number" min="${ctx.minBid}" step="1" value="${ctx.minBid}" ${canAfford ? '' : 'disabled'} />
      </div>
      ${canAfford ? '' : `<p class="buy-warn" style="padding:0 1.2rem 0.5rem">Not enough cash to reach ₹${fmt(ctx.minBid)}L — you can only pass.</p>`}
      <div class="modal-actions">
        <button id="btnPlaceBid" class="btn btn-primary" ${canAfford ? '' : 'disabled'}>Place Bid</button>
        <button id="btnPassBid" class="btn btn-secondary">Pass</button>
      </div>
    `;

    const input = document.getElementById('auctionBidInput');
    const placeBtn = document.getElementById('btnPlaceBid');
    if (placeBtn) placeBtn.onclick = () => {
      const amt = parseInt(input.value, 10);
      if (typeof Game !== 'undefined') Game.placeBid(amt);
    };
    document.getElementById('btnPassBid').onclick = () => {
      if (typeof Game !== 'undefined') Game.passBid();
    };
    if (typeof AUDIO !== 'undefined') {
      body.querySelectorAll('button').forEach(b => AUDIO.tactile(b));
    }

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

  // ══════════════════════════════════════════════════════════════════════════
  //  Reserve Bank of India (RBI) modal — Banking · Ledger · About
  // ══════════════════════════════════════════════════════════════════════════

  let _rbiTab        = 'banking';            // 'banking' | 'ledger' | 'about'
  let _ledgerFilter  = 'all';                // 'all' | 'mine' | 'rbi'

  const CLOSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="7.5" y1="7.5" x2="16.5" y2="16.5"/><line x1="16.5" y1="7.5" x2="7.5" y2="16.5"/></svg>';

  function showRBI() {
    const modal = document.getElementById('modalRBI');
    if (!modal || typeof GameState === 'undefined') return;
    _rbiTab = 'banking';
    renderRBI();
    openModal('modalRBI');
  }

  function renderRBI() {
    const body = document.getElementById('modalRBIBody');
    if (!body || typeof GameState === 'undefined') return;

    const cp    = GameState.currentPlayer;
    const debt  = (cp.loans || []).reduce((s, l) => s + l.principal + l.interest, 0);
    const repo  = GameState.repoRate;
    const below = GameState.belowCRR(cp);
    const floor = GAME_CONFIG.CRR_MINIMUM;

    body.innerHTML = `
      <button class="modal-close" id="btnRBIClose" aria-label="Close" title="Close">${CLOSE_SVG}</button>
      <div class="rbi-head">
        <span class="rbi-seal" aria-hidden="true">₹</span>
        <div class="rbi-head-text">
          <h2 class="rbi-title">Reserve Bank of India</h2>
          <div class="rbi-sub">Mint Road, Fort · Central Monetary Authority</div>
        </div>
      </div>

      <div class="rbi-meters">
        <div class="rbi-meter">
          <span class="rbi-meter-label">Repo Rate</span>
          <strong class="rbi-meter-val">${repo}%</strong>
        </div>
        <div class="rbi-meter ${below ? 'crr-bad' : 'crr-ok'}">
          <span class="rbi-meter-label">${cp.name}'s Cash</span>
          <strong class="rbi-meter-val">₹${fmt(cp.cash)}L</strong>
        </div>
        <div class="rbi-meter">
          <span class="rbi-meter-label">Outstanding</span>
          <strong class="rbi-meter-val">₹${fmt(debt)}L</strong>
        </div>
      </div>

      <div class="rbi-tabs" role="tablist">
        <button class="rbi-tab ${_rbiTab==='banking'?'active':''}" data-tab="banking">Banking</button>
        <button class="rbi-tab ${_rbiTab==='ledger' ?'active':''}" data-tab="ledger">Ledger</button>
        <button class="rbi-tab ${_rbiTab==='about'  ?'active':''}" data-tab="about">About</button>
      </div>

      <div class="rbi-panel">${
        _rbiTab === 'banking' ? rbiBankingPanel(cp, debt, repo, below, floor)
      : _rbiTab === 'ledger'  ? rbiLedgerPanel()
      :                         rbiAboutPanel()
      }</div>
    `;

    // ── Wire close + tabs ────────────────────────────────────────────────────
    body.querySelector('#btnRBIClose').onclick = () => closeModal('modalRBI');
    body.querySelectorAll('.rbi-tab').forEach(btn => {
      btn.onclick = () => { _rbiTab = btn.dataset.tab; renderRBI(); };
    });

    // ── Tab-specific wiring ──────────────────────────────────────────────────
    if (_rbiTab === 'banking') {
      const takeBtn  = body.querySelector('#btnRBITakeLoan');
      const repayBtn = body.querySelector('#btnRBIRepay');
      if (takeBtn) takeBtn.onclick = () => {
        const amt = parseFloat(body.querySelector('#rbiLoanAmount').value);
        if (isNaN(amt) || amt <= 0) { toast('Enter a valid loan amount.', 'error'); if (typeof AUDIO!=='undefined') AUDIO.errorFeedback(); return; }
        if (typeof Game !== 'undefined') Game.takeLoan(amt);
        renderRBI();
      };
      if (repayBtn) repayBtn.onclick = () => {
        const amt = parseFloat(body.querySelector('#rbiRepayAmount').value);
        if (isNaN(amt) || amt <= 0) { toast('Enter a valid repayment.', 'error'); if (typeof AUDIO!=='undefined') AUDIO.errorFeedback(); return; }
        if (typeof Game !== 'undefined') Game.repayLoan(amt);
        renderRBI();
      };
    } else if (_rbiTab === 'ledger') {
      body.querySelectorAll('.ledger-pill').forEach(pill => {
        pill.onclick = () => { _ledgerFilter = pill.dataset.filter; renderRBI(); };
      });
    }

    // ── Tactile feedback (ATM membrane click + sharp haptic) on every button ──
    if (typeof AUDIO !== 'undefined') {
      body.querySelectorAll('button').forEach(b => AUDIO.tactile(b));
    }
  }

  function rbiBankingPanel(cp, debt, repo, below, floor) {
    const loanRows = (cp.loans || []).length
      ? (cp.loans || []).map(l =>
          `<div class="stat-row"><span>Loan @ ${l.rate != null ? l.rate : '—'}%</span><span>₹${fmt(l.principal + l.interest)}L</span></div>`
        ).join('')
      : `<div class="stat-row"><span>No active loans</span><span>—</span></div>`;

    return `
      ${below ? `<div class="crr-banner">
          <strong>RBI Advisory — CRR breach.</strong> Your liquid cash is below the
          ₹${floor}L reserve floor. Mortgage a property now rather than risk a forced sale.
        </div>` : ''}

      <p class="rbi-note">Loans are issued at the current <strong>Repo Rate of ${repo}%</strong>,
        locked for the life of the loan. Interest accrues each time you pass GO.
        Max ${GAME_CONFIG.MAX_LOANS} loans of ₹${GAME_CONFIG.MAX_LOAN_AMOUNT}L each.</p>

      <div class="modal-stats">${loanRows}</div>

      <div class="rbi-action">
        <label>Sanction a Loan</label>
        <div class="rbi-input-row">
          <input id="rbiLoanAmount" type="number" min="1" max="${GAME_CONFIG.MAX_LOAN_AMOUNT}" step="1" placeholder="Amount (₹L, max ${GAME_CONFIG.MAX_LOAN_AMOUNT})" />
          <button id="btnRBITakeLoan" class="btn btn-primary rbi-btn">Borrow</button>
        </div>
      </div>

      <div class="rbi-action">
        <label>Repay a Loan</label>
        <div class="rbi-input-row">
          <input id="rbiRepayAmount" type="number" min="1" step="1" placeholder="Amount (₹L)" />
          <button id="btnRBIRepay" class="btn btn-secondary rbi-btn">Repay</button>
        </div>
      </div>
    `;
  }

  function rbiLedgerPanel() {
    return `
      <div class="ledger-filters">
        <button class="ledger-pill ${_ledgerFilter==='all' ?'active':''}" data-filter="all">All Transactions</button>
        <button class="ledger-pill ${_ledgerFilter==='mine'?'active':''}" data-filter="mine">My Transactions</button>
        <button class="ledger-pill ${_ledgerFilter==='rbi' ?'active':''}" data-filter="rbi">RBI Updates</button>
      </div>
      <div class="ledger-list" id="rbiLedgerList">${buildLedgerRows()}</div>
    `;
  }

  function buildLedgerRows() {
    const cpId = GameState.currentPlayer ? GameState.currentPlayer.id : -1;
    let rows = GameState.ledger.slice().reverse();   // newest first

    if (_ledgerFilter === 'mine') {
      rows = rows.filter(e => e.parties.some(p => p.id === cpId));
    } else if (_ledgerFilter === 'rbi') {
      rows = rows.filter(e => e.category === 'rbi' || e.category === 'system');
    }

    if (rows.length === 0) {
      return `<div class="ledger-empty">No transactions to show yet.</div>`;
    }

    return rows.map(e => {
      let cls = e.tone, sign = '', amt = e.amount;
      if (_ledgerFilter === 'mine') {
        const mine = e.parties.find(p => p.id === cpId);
        if (mine) {
          cls  = mine.delta >= 0 ? 'credit' : 'debit';
          sign = mine.delta >= 0 ? '+' : '−';
          amt  = Math.abs(mine.delta);
        }
      } else {
        sign = e.tone === 'credit' ? '+' : e.tone === 'debit' ? '−' : '';
      }
      const amtStr = (e.amount > 0)
        ? `<span class="ledger-amt ${cls}">${sign}₹${fmt(amt)}L</span>`
        : `<span class="ledger-amt neutral">—</span>`;
      return `
        <div class="ledger-row ${cls}">
          <div class="ledger-main">
            <span class="ledger-desc">${e.desc}</span>
            <span class="ledger-meta">Turn ${e.turn} · ${e.time}</span>
          </div>
          ${amtStr}
        </div>`;
    }).join('');
  }

  function rbiAboutPanel() {
    return `
      <div class="rbi-card">
        <div class="rbi-card-row"><span>Role</span><p>The central monetary authority regulating the South Mumbai real-estate market.</p></div>
        <div class="rbi-card-row"><span>Funds</span><p>Infinite net worth — the RBI issues currency and never runs dry.</p></div>
        <div class="rbi-card-row"><span>Functions</span><p>Issues currency, manages property title deeds, handles mortgages, and sanctions business loans.</p></div>
      </div>
      <div class="rbi-explain">
        <div class="rbi-explain-item">
          <strong>Repo Rate</strong>
          <p>The interest rate on RBI loans. It is reviewed every ${GAME_CONFIG.REPO_RATE_INTERVAL} rounds and swings between ${GAME_CONFIG.REPO_RATE_MIN}%–${GAME_CONFIG.REPO_RATE_MAX}%. Borrow when it's low.</p>
        </div>
        <div class="rbi-explain-item">
          <strong>CRR · Cash Reserve Ratio</strong>
          <p>Keep at least ₹${GAME_CONFIG.CRR_MINIMUM}L in liquid cash. Drop below it and the RBI warns you to mortgage early — before bankruptcy forces your hand.</p>
        </div>
        <div class="rbi-explain-item">
          <strong>Digital Ledger</strong>
          <p>A timestamped record of every purchase, rent transfer, loan, and policy change — full transparency over the game's economy.</p>
        </div>
      </div>
    `;
  }

  /** Called by GameState.recordTxn — live-refresh the ledger if it's on screen. */
  function onLedgerUpdate() {
    const modal = document.getElementById('modalRBI');
    if (modal && modal.classList.contains('show') && _rbiTab === 'ledger') {
      const list = document.getElementById('rbiLedgerList');
      if (list) list.innerHTML = buildLedgerRows();
    }
  }

  /** Update the right-sidebar repo-rate chip. */
  function refreshRepoChip() {
    const el = document.getElementById('repoChip');
    if (!el || typeof GameState === 'undefined') return;
    el.innerHTML = `<span class="repo-dot"></span>RBI Repo Rate&nbsp;<strong>${GameState.repoRate}%</strong>`;
  }

  /** One-shot CRR advisory when a player crosses below the reserve floor. */
  function checkCRR(player) {
    if (!player || typeof GameState === 'undefined') return;
    const below = GameState.belowCRR(player);
    if (below && !player.crrWarned) {
      player.crrWarned = true;
      toast(`RBI Advisory: ${player.name} is below the ₹${GAME_CONFIG.CRR_MINIMUM}L reserve floor — mortgage early to stay liquid.`, 'error');
    } else if (!below && player.crrWarned) {
      player.crrWarned = false;
    }
  }

  /** Backward-compatible alias — the old loan dialog now opens the RBI modal. */
  function showLoanDialog() { showRBI(); }

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
        ${GAME_CONFIG.monumentBadge(idx, 'lg')}
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
        const bIcons = bldMini(ps.buildings);
        html += `
          <div class="prop-item" style="border-left-color:${colorHex}" onclick="UI.showSpaceDetail(${pos})">
            <span>${cfg.name} ${bIcons}</span>
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
    document.getElementById('winnerName').textContent = winner.name;
    document.getElementById('winnerToken').innerHTML  = GAME_CONFIG.monumentBadge(winner.id, 'lg');
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

  // Inline development label using the custom House / Hotel SVG emblems.
  function bldLabel(buildings) {
    if (!buildings) return '—';
    if (buildings >= 5) return `<span class="bld-inline hq">${GAME_CONFIG.HQ_ICON}</span> Headquarters`;
    let icons = '';
    for (let i = 0; i < buildings; i++) {
      icons += `<span class="bld-inline office">${GAME_CONFIG.OFFICE_ICON}</span>`;
    }
    return `${icons} ${buildings} office${buildings > 1 ? 's' : ''}`;
  }

  // Compact development emblems for tight list rows.
  function bldMini(buildings) {
    if (!buildings) return '';
    if (buildings >= 5) return `<span class="bld-inline sm hq">${GAME_CONFIG.HQ_ICON}</span>`;
    let icons = '';
    for (let i = 0; i < buildings; i++) {
      icons += `<span class="bld-inline sm office">${GAME_CONFIG.OFFICE_ICON}</span>`;
    }
    return icons;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    toast,
    appendLog,
    animateDice,
    renderDieFace,
    initDice() {
      const d1 = document.getElementById('die1');
      const d2 = document.getElementById('die2');
      if (d1) renderDieFace(d1, 1);
      if (d2) renderDieFace(d2, 1);
    },
    showSpaceDetail,
    showBuyDecision,
    showAuction,
    showCard,
    showLoanDialog,
    showRBI,
    onLedgerUpdate,
    refreshRepoChip,
    checkCRR,
    showPlayerDetail,
    showGameOver,
    showShortfallPanel,
    hideShortfallPanel,
    openModal,
    closeModal,
    fmt,

    /** Full UI refresh — call after every game state change. */
    refresh() {
      refreshPlayerPanels();
      refreshActionBar();
      refreshRepoChip();
      if (typeof GameState !== 'undefined') checkCRR(GameState.currentPlayer);
    },
  };
})();
