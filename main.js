/**
 * main.js — Game controller.
 *
 * Orchestrates the full game flow:
 *   1. Setup screen (choose player count & names)
 *   2. Board initialisation
 *   3. Turn loop: roll → move → space action → buy/pay → end turn
 *   4. Jail logic, doubles, bankruptcy
 *
 * All heavy logic lives in Bank / GameState / Cards / Board / UI.
 * This file wires them together and owns the event listeners.
 */

// ── Singleton bank instance ────────────────────────────────────────────────
const bank = new Bank();

// ── Global Game namespace exposed to UI callbacks ──────────────────────────
const Game = (() => {

  // ── Setup ──────────────────────────────────────────────────────────────────

  function init() {
    // Restore + wire the dark-mode theme toggle
    initTheme();

    // Show setup screen, hide game screen
    document.getElementById('setupScreen').style.display  = 'flex';
    document.getElementById('gameScreen').style.display   = 'none';

    document.getElementById('btnStartGame').addEventListener('click', startGame);
    document.getElementById('btnRestartGame').addEventListener('click', () => location.reload());

    // Close modals on backdrop click. Closing the Buy prompt counts as declining.
    document.querySelectorAll('.modal-backdrop').forEach(m => {
      m.addEventListener('click', e => {
        if (e.target !== m) return;
        UI.closeModal(m.id);
        if ((m.id === 'modalBuy' || m.id === 'modalAuction') &&
            GameState && GameState.turnPhase === TurnPhase.BUY_DECISION) {
          declinePurchase();
        }
      });
    });

    // Action buttons (no End Turn button — turns auto-advance).
    document.getElementById('btnRoll').addEventListener('click', rollDice);
    document.getElementById('btnBail').addEventListener('click', () => payJailBail());
    document.getElementById('btnJailCard').addEventListener('click', () => useJailCard());
    document.getElementById('btnLoan').addEventListener('click', () => UI.showRBI());

    // Tactile feedback on the Reserve Bank button (ATM membrane click + haptic).
    if (typeof AUDIO !== 'undefined') {
      AUDIO.tactile(document.getElementById('btnLoan'));
      AUDIO.tactile(document.getElementById('btnBail'));
      AUDIO.tactile(document.getElementById('btnJailCard'));
    }

    // Sound mute toggle.
    const muteBtn = document.getElementById('muteToggle');
    if (muteBtn) {
      const syncMute = () => {
        const m = (typeof AUDIO !== 'undefined') && AUDIO.isMuted();
        muteBtn.classList.toggle('is-muted', !!m);
        const label = muteBtn.querySelector('.mute-label');
        if (label) label.textContent = m ? 'Sound Off' : 'Sound On';
      };
      muteBtn.addEventListener('click', () => {
        if (typeof AUDIO !== 'undefined') { AUDIO.toggleMuted(); if (!AUDIO.isMuted()) AUDIO.play('atm'); }
        syncMute();
      });
      syncMute();
    }
  }

  // ── Dark mode ───────────────────────────────────────────────────────────────

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      const label = btn.querySelector('.theme-toggle-label');
      if (label) label.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
  }

  function initTheme() {
    let saved = 'light';
    try { saved = localStorage.getItem('smbg-theme') || 'light'; } catch (e) {}
    applyTheme(saved);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem('smbg-theme', next); } catch (e) {}
      });
    }
  }

  function startGame() {
    const playerCount = parseInt(document.getElementById('playerCount').value) || 2;
    const names = [];
    for (let i = 1; i <= playerCount; i++) {
      const inp = document.getElementById(`pname${i}`);
      names.push((inp && inp.value.trim()) || GAME_CONFIG.PLAYER_MONUMENTS[i-1] || `Player ${i}`);
    }

    // Init subsystems
    GameState.init(names);
    CARDS.init();
    Board.render();
    UI.refresh();
    UI.initDice();

    GameState.log(`Game started! ${names.join(', ')} — good luck! Starting cash: ₹${GAME_CONFIG.STARTING_CASH}L each.`);

    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display  = 'flex';
    Board.centerAlert(`${GameState.currentPlayer.name} goes first.`);
    setStatus(`${GameState.currentPlayer.name} — roll the dice`);
  }

  // ── Player count selector ─────────────────────────────────────────────────

  function updateNameInputs() {
    const count   = parseInt(document.getElementById('playerCount').value);
    const wrapper = document.getElementById('playerNameInputs');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const div = document.createElement('div');
      div.className = 'name-input-row';
      div.innerHTML = `
        ${GAME_CONFIG.monumentBadge(i-1)}
        <input id="pname${i}" type="text" placeholder="${GAME_CONFIG.PLAYER_MONUMENTS[i-1]}" maxlength="20" />
      `;
      wrapper.appendChild(div);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUTOMATED TURN ENGINE — Promise-based async sequence with auto-advance.
  //  The manual "End Turn" button is gone: each turn runs as an async pipeline
  //    await rollDiceAnimation() → await movePlayerTokenAnimation()
  //    → await resolveTileAction() → auto-advance (unless doubles / paused).
  // ═══════════════════════════════════════════════════════════════════════════

  const AUTO_ADVANCE_MS = 1500;   // UX pause before passing to the next player
  const HOP_MS          = 130;    // per-tile token hop duration

  let _automating   = false;      // an automated sequence is currently running
  let _advanceTimer = null;       // the pending auto-advance (pass-turn) timer
  let _tileResolve  = null;       // resolver for the in-flight resolveTileAction()

  /** Cancel a pending auto-advance timer (called on reset / re-entry). */
  function clearAdvanceTimer() {
    if (_advanceTimer) { clearTimeout(_advanceTimer); _advanceTimer = null; }
  }

  /** Update the right-panel status indicator that replaced the End Turn button. */
  function setStatus(text) {
    const el = document.getElementById('turnStatus');
    if (el) el.textContent = text;
  }

  /** Toggle the "inputs locked" state during automated/animated stretches. */
  function setAutomating(on) {
    _automating = on;
    document.body.classList.toggle('automating', on);
    UI.refresh();
  }

  // ── Awaitable animation primitives ────────────────────────────────────────

  function rollDiceAnimation(d1, d2) {
    return new Promise(resolve => UI.animateDice(d1, d2, resolve));
  }

  function movePlayerTokenAnimation(player, steps) {
    const idx = GameState.players.indexOf(player);
    // Board owns the tactile arc-hop; we play a "wooden tick" as each tile lands.
    return Board.animateTokenMove(player, idx, steps, () => {
      if (typeof AUDIO !== 'undefined') AUDIO.play('tick');
    });
  }

  async function doMovement(player, steps) {
    const oldPos = player.position;
    await movePlayerTokenAnimation(player, steps);
    Board.highlightSpace(player.position);   // highlight only the final landing tile
    // GO salary — identical rule to the original (passed GO, didn't land on GO).
    if ((player.position < oldPos || (oldPos + steps >= 40)) && player.position !== 0) {
      bank.pay(null, player, GAME_CONFIG.GO_SALARY, GameState);
      GameState.recordTxn({
        category: 'system', tone: 'credit', amount: GAME_CONFIG.GO_SALARY,
        desc: `${player.name} passed GO — salary collected`,
        parties: [{ id: player.id, delta: GAME_CONFIG.GO_SALARY }],
      });
      bank.chargePassGoInterest(player, GameState);
      GameState.log(`${player.name} passed GO — collected ₹${GAME_CONFIG.GO_SALARY}L.`);
      Board.centerAlert(`${player.name} passed GO! +₹${GAME_CONFIG.GO_SALARY}L`);
      if (typeof AUDIO !== 'undefined') AUDIO.play('cash');
    }
  }

  // ── Tile resolution (resolves once the landed square is fully handled) ─────

  function resolveTileAction(player) {
    return new Promise(resolve => {
      _tileResolve = () => { _tileResolve = null; resolve(); };
      executeSpaceAction(player);
      settleAfterExecute();
    });
  }

  /** After executeSpaceAction runs, either resolve now or PAUSE for the user. */
  function settleAfterExecute() {
    const ph = GameState.turnPhase;
    if (ph === TurnPhase.BUY_DECISION) {
      setStatus('Waiting for your decision…');
      setAutomating(false);            // re-enable the Buy / Auction buttons
      return;                          // stay pending until the user acts
    }
    if (ph === TurnPhase.AWAITING_PAY) {
      setStatus('Action required — settle the shortfall');
      setAutomating(false);            // re-enable finance tools
      return;                          // stay pending until cash ≥ 0
    }
    if (_tileResolve) _tileResolve();  // CAN_END_TURN / GAME_OVER → resolved
  }

  /** Resume a paused sequence once the user completes the required action. */
  function resumeAfterPause() {
    const ph = GameState.turnPhase;
    if (ph !== TurnPhase.CAN_END_TURN && ph !== TurnPhase.GAME_OVER) return;
    if (_tileResolve) { setAutomating(true); _tileResolve(); }
    else              { autoAdvance(); }
  }

  // ── Dice roll — async entry point (still triggered manually per player) ────

  async function rollDice() {
    if (_automating) return;                                   // ignore spam
    if (GameState.turnPhase !== TurnPhase.WAITING_ROLL) {
      UI.toast("It's not time to roll.", 'error'); return;
    }
    const cp = GameState.currentPlayer;
    if (cp.status !== 'active') { await autoAdvance(); return; }

    clearAdvanceTimer();
    UI.hideShortfallPanel();
    setAutomating(true);

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const total = d1 + d2;
    const isDoubles = d1 === d2;

    GameState.lastDice = { d1, d2 };
    GameState.turnPhase = TurnPhase.ANIMATING;
    setStatus('Rolling the dice…');
    UI.refresh();
    GameState.log(`${cp.name} rolled ${d1} + ${d2} = ${total}${isDoubles ? ' (DOUBLES!)' : ''}`);

    await rollDiceAnimation(d1, d2);

    if (cp.inJail) await resolveJailRoll(cp, d1, d2, total, isDoubles);
    else           await resolveNormalRoll(cp, d1, d2, total, isDoubles);
  }

  async function resolveNormalRoll(cp, d1, d2, total, isDoubles) {
    if (isDoubles) {
      GameState.doublesCount++;
      if (GameState.doublesCount >= 3) {
        GameState.log(`${cp.name} rolled doubles 3 times — sent to Traffic Jam!`);
        GameState.sendToJail(cp);
        Board.refresh(); UI.refresh();
        await finishResolved(cp, false);   // jailed — no re-roll
        return;
      }
    }
    setStatus('Moving…');
    await doMovement(cp, total);
    Board.refresh(); UI.refresh();
    setStatus('Resolving the square…');
    await resolveTileAction(cp);
    await finishResolved(cp, isDoubles);
  }

  async function resolveJailRoll(cp, d1, d2, total, isDoubles) {
    cp.jailTurns++;

    if (isDoubles) {
      cp.inJail = false; cp.jailTurns = 0;
      GameState.log(`${cp.name} rolled doubles — out of Traffic Jam!`);
      setStatus('Moving…');
      await doMovement(cp, total);
      Board.refresh(); UI.refresh();
      setStatus('Resolving the square…');
      await resolveTileAction(cp);
      await finishResolved(cp, false);     // out on doubles → no extra re-roll
      return;
    }

    if (cp.jailTurns >= 3) {
      GameState.log(`${cp.name} must pay bail after 3 turns in Traffic Jam.`);
      const result = bank.pay(cp, null, GAME_CONFIG.JAIL_BAIL, GameState);
      if (result.ok) {
        cp.inJail = false; cp.jailTurns = 0;
        setStatus('Moving…');
        await doMovement(cp, total);
        Board.refresh(); UI.refresh();
        setStatus('Resolving the square…');
        await resolveTileAction(cp);
        await finishResolved(cp, false);
      } else {
        UI.showShortfallPanel(cp, GameState.shortfallAmount);
        setStatus('Action required — settle the shortfall');
        setAutomating(false);              // paused; resumeAfterPause() handles it
        UI.refresh();
      }
      return;
    }

    GameState.log(`${cp.name} stays in Traffic Jam (turn ${cp.jailTurns}/3).`);
    GameState.turnPhase = TurnPhase.CAN_END_TURN;
    UI.refresh();
    await finishResolved(cp, false);
  }

  /** Decide what happens once a square is resolved: re-roll, pause, or advance. */
  async function finishResolved(cp, isDoubles) {
    if (GameState.turnPhase === TurnPhase.GAME_OVER) {
      setAutomating(false);
      setStatus('Game over');
      return;
    }
    if (GameState.turnPhase === TurnPhase.AWAITING_PAY) {
      return;   // still paused on a shortfall — settled later by the player
    }
    if (isDoubles && cp.status === 'active' && !cp.inJail) {
      GameState.turnPhase = TurnPhase.WAITING_ROLL;   // doubles → roll again
      setAutomating(false);
      setStatus('Doubles! Roll again');
      UI.refresh();
      UI.toast(`${cp.name} rolled doubles — roll again!`);
      return;
    }
    await autoAdvance();
  }

  /** Wait the UX delay, then hand the turn to the next active player. */
  async function autoAdvance() {
    clearAdvanceTimer();
    setAutomating(true);
    setStatus('Passing to next player…');
    UI.refresh();

    await new Promise(resolve => {
      _advanceTimer = setTimeout(() => { _advanceTimer = null; resolve(); }, AUTO_ADVANCE_MS);
    });

    UI.closeModal('modalCard');     // dismiss any lingering info modal
    UI.hideShortfallPanel();
    GameState.advanceTurn();
    Board.refresh(); UI.refresh();
    Board.centerAlert(`${GameState.currentPlayer.name}'s turn`);
    setAutomating(false);
    setStatus(`${GameState.currentPlayer.name} — roll the dice`);
  }

  // ── Space actions ─────────────────────────────────────────────────────────

  function executeSpaceAction(player) {
    const space = GAME_CONFIG.getSpace(player.position);
    GameState.log(`${player.name} landed on ${space.name}.`);
    Board.centerAlert(space.name);

    switch (space.type) {

      case 'corner':
        if (space.subtype === 'go') {
          // Landed directly on GO — collect salary
          bank.pay(null, player, GAME_CONFIG.GO_SALARY, GameState);
          GameState.recordTxn({
            category: 'system', tone: 'credit', amount: GAME_CONFIG.GO_SALARY,
            desc: `${player.name} landed on GO — salary collected`,
            parties: [{ id: player.id, delta: GAME_CONFIG.GO_SALARY }],
          });
          if (typeof AUDIO !== 'undefined') AUDIO.play('cash');
          GameState.log(`${player.name} landed on GO — collected ₹${GAME_CONFIG.GO_SALARY}L.`);
          afterSpaceAction(player);
        } else if (space.subtype === 'go_to_jail') {
          GameState.sendToJail(player);   // sets CAN_END_TURN
          Board.refresh(); UI.refresh();
        } else {
          // Jail (just visiting) or Free Parking — no action
          afterSpaceAction(player);
        }
        break;

      case 'tax':
        handleTax(player, space);
        return; // resolves internally

      case 'chance':
        CARDS.drawHustle(player, GameState, bank, UI);
        if (GameState.pendingSpaceAction) {
          GameState.pendingSpaceAction = false;
          executeSpaceAction(player);   // card moved the player — re-evaluate
          return;
        }
        afterSpaceAction(player);
        break;

      case 'community_chest':
        CARDS.drawGossip(player, GameState, bank, UI);
        if (GameState.pendingSpaceAction) {
          GameState.pendingSpaceAction = false;
          executeSpaceAction(player);
          return;
        }
        afterSpaceAction(player);
        break;

      case 'property':
      case 'railway':
      case 'utility':
        handlePropertyLanding(player, space);
        return;

      default:
        afterSpaceAction(player);
    }

    Board.refresh();
    UI.refresh();
  }

  function handleTax(player, space) {
    let amount = space.amount;

    if (space.subtype === 'income') {
      // Player pays the lesser of flat ₹20L or 10% of total assets
      const tenPercent = Math.floor(calcTotalAssets(player) * GAME_CONFIG.INCOME_TAX_PERCENT);
      amount = Math.min(GAME_CONFIG.INCOME_TAX_FLAT, tenPercent);
      GameState.log(`${player.name} chose ₹${amount}L income tax (flat=${GAME_CONFIG.INCOME_TAX_FLAT}L, 10%=${tenPercent}L).`);
    }

    const result = bank.pay(player, null, amount, GameState);
    GameState.recordTxn({
      category: 'system', tone: 'debit', amount,
      desc: `${player.name} paid ${space.name} (₹${amount}L)`,
      parties: [{ id: player.id, delta: -amount }],
    });
    if (typeof AUDIO !== 'undefined') AUDIO.play('atm');
    if (!result.ok) {
      UI.showShortfallPanel(player, GameState.shortfallAmount);   // → AWAITING_PAY (pause)
    } else {
      GameState.log(`${player.name} paid ₹${amount}L tax.`);
      afterSpaceAction(player);
    }
    Board.refresh();
    UI.refresh();
  }

  function handlePropertyLanding(player, space) {
    const ps = GameState.propertyState[space.position];

    if (!ps) { afterSpaceAction(player); return; }

    if (ps.owner === null) {
      // Unowned → PAUSE the auto-advance and wait for Buy / Auction / decline.
      GameState.turnPhase = TurnPhase.BUY_DECISION;
      UI.refresh();
      UI.showBuyDecision(space.position);
      return;
    }

    if (ps.owner === player.id) {
      GameState.log(`${player.name} landed on their own property — no rent.`);
      afterSpaceAction(player);
      return;
    }

    if (ps.mortgaged) {
      GameState.log(`${space.name} is mortgaged — no rent collected.`);
      afterSpaceAction(player);
      return;
    }

    // Auto-pay rent to the owner.
    const diceTotal = GameState.lastDice.d1 + GameState.lastDice.d2;
    const rent      = bank.calcRent(player, space.position, diceTotal, GameState);
    const owner     = GameState.getPlayerById(ps.owner);

    GameState.log(`${player.name} pays ₹${rent}L rent to ${owner.name} for ${space.name}.`);
    const result = bank.pay(player, owner, rent, GameState);
    GameState.recordTxn({
      category: 'rent', tone: 'neutral', amount: rent,
      desc: `${player.name} paid ₹${rent}L rent to ${owner.name} (${space.name})`,
      parties: [{ id: player.id, delta: -rent }, { id: owner.id, delta: rent }],
    });
    if (typeof AUDIO !== 'undefined') AUDIO.play('cash');
    if (!result.ok) {
      UI.showShortfallPanel(player, GameState.shortfallAmount);
      GameState.shortfallCreditor = owner.id;
    } else {
      Board.centerAlert(`${player.name} pays ₹${rent}L rent to ${owner.name}`);
      afterSpaceAction(player);
    }

    Board.refresh();
    UI.refresh();
  }

  /** Mark the square fully resolved (ready for auto-advance). */
  function afterSpaceAction(player) {
    if (GameState.turnPhase === TurnPhase.GAME_OVER) return;
    if (GameState.turnPhase === TurnPhase.AWAITING_PAY) return;
    GameState.turnPhase = TurnPhase.CAN_END_TURN;
    Board.refresh();
    UI.refresh();
  }

  // ── Buy / Auction callbacks (resolve the paused BUY_DECISION) ─────────────

  function confirmBuy(position) {
    const cp = GameState.currentPlayer;
    const result = GameState.buyProperty(cp, position, bank);   // → CAN_END_TURN
    if (result.ok) {
      UI.toast(`Purchased! ₹${GAME_CONFIG.getSpace(position).price}L`);
      if (typeof AUDIO !== 'undefined') AUDIO.play('buy');   // paper-stamp / signing
      Board.refresh();
    }
    UI.refresh();
    resumeAfterPause();
  }

  function startAuction(position) {
    GameState.auctionPosition = position;
    UI.showAuction(position);   // phase stays BUY_DECISION until completeAuction
  }

  /** Player closed the buy prompt / cancelled the auction without buying. */
  function declinePurchase() {
    if (GameState.turnPhase !== TurnPhase.BUY_DECISION) return;
    GameState.auctionPosition = null;
    GameState.log(`${GameState.currentPlayer.name} declined to buy — square left unsold.`);
    GameState.turnPhase = TurnPhase.CAN_END_TURN;
    UI.refresh();
    resumeAfterPause();
  }

  function completeAuction(winnerIdx, position, bid) {
    const winner = GameState.players[winnerIdx];
    const result = bank.completeAuction(winner, position, bid, GameState);
    if (result.ok) {
      UI.toast(`${winner.name} won ${GAME_CONFIG.getSpace(position).name} for ₹${bid}L!`);
      if (typeof AUDIO !== 'undefined') AUDIO.play('sold');   // gavel — Sold!
    }
    GameState.auctionPosition = null;
    if (GameState.turnPhase !== TurnPhase.GAME_OVER) {
      GameState.turnPhase = TurnPhase.CAN_END_TURN;
    }
    Board.refresh();
    UI.refresh();
    resumeAfterPause();
  }

  // ── Jail payment buttons ──────────────────────────────────────────────────

  function payJailBail() {
    const cp     = GameState.currentPlayer;
    const result = GameState.attemptJailEscape(cp, bank, 'bail');
    if (result.ok) {
      UI.toast(`${cp.name} paid bail — now roll the dice!`);
      if (typeof AUDIO !== 'undefined') AUDIO.play('atm');
    }
    UI.refresh();
  }

  function useJailCard() {
    const cp     = GameState.currentPlayer;
    const result = GameState.attemptJailEscape(cp, bank, 'card');
    if (result.ok) {
      UI.toast(`${cp.name} used a Jail Free card — roll the dice!`);
    }
    UI.refresh();
  }

  // ── Shortfall settlement → resume the paused turn ─────────────────────────

  /** After any cash-raising action, see if the player's shortfall is cleared. */
  function checkShortfallResolved() {
    if (GameState.turnPhase !== TurnPhase.AWAITING_PAY) return;
    const cp = GameState.currentPlayer;
    const creditor = GameState.shortfallCreditor !== null
      ? GameState.getPlayerById(GameState.shortfallCreditor)
      : null;
    GameState.resolveShortfall(cp, bank, creditor);
    if (cp.cash >= 0) { GameState.shortfallCreditor = null; UI.hideShortfallPanel(); }
    UI.refresh();
    resumeAfterPause();   // if now CAN_END_TURN / GAME_OVER, continue the turn
  }

  // ── Building / mortgage callbacks (called from UI modal buttons) ──────────

  function mortgageProperty(position) {
    const result = bank.mortgage(GameState.currentPlayer, position, GameState);
    if (result.ok) {
      if (typeof AUDIO !== 'undefined') AUDIO.play('vault');   // mortgage cash-in cha-ching
      Board.refresh(); UI.refresh(); checkShortfallResolved();
    }
  }

  function unmortgageProperty(position) {
    const result = bank.unmortgage(GameState.currentPlayer, position, GameState);
    if (result.ok) {
      if (typeof AUDIO !== 'undefined') AUDIO.play('atm');
      Board.refresh(); UI.refresh();
    }
  }

  function buildOffice(position) {
    const result = bank.buyOffice(GameState.currentPlayer, position, GameState);
    if (result.ok) {
      UI.toast('Office built!');
      if (typeof AUDIO !== 'undefined') AUDIO.play('build');   // wooden block placement
      Board.refresh(); UI.refresh();
    }
  }

  function sellOffice(position) {
    const result = bank.sellOffice(GameState.currentPlayer, position, GameState);
    if (result.ok) {
      UI.toast('Office sold.');
      if (typeof AUDIO !== 'undefined') AUDIO.play('cash');
      Board.refresh(); UI.refresh(); checkShortfallResolved();
    }
  }

  function buildHQ(position) {
    const result = bank.buyHQ(GameState.currentPlayer, position, GameState);
    if (result.ok) {
      UI.toast('Headquarters built!');
      if (typeof AUDIO !== 'undefined') AUDIO.play('build');
      Board.refresh(); UI.refresh();
    }
  }

  function sellHQ(position) {
    const result = bank.sellHQ(GameState.currentPlayer, position, GameState);
    if (result.ok) {
      UI.toast('HQ sold.');
      if (typeof AUDIO !== 'undefined') AUDIO.play('cash');
      Board.refresh(); UI.refresh(); checkShortfallResolved();
    }
  }

  // ── Loan callbacks ────────────────────────────────────────────────────────

  function takeLoan(amount) {
    const result = bank.grantLoan(GameState.currentPlayer, amount, GameState);
    if (result.ok) {
      UI.toast(`₹${amount}L loan received!`);
      if (typeof AUDIO !== 'undefined') AUDIO.play('vault');   // vault / cha-ching
      UI.refresh();
      checkShortfallResolved();   // resume the turn if this cleared a shortfall
    }
  }

  function repayLoan(amount) {
    const result = bank.repayLoan(GameState.currentPlayer, amount, GameState);
    if (result.ok) {
      UI.toast(`₹${amount}L repaid.`);
      if (typeof AUDIO !== 'undefined') AUDIO.play('cash');
      UI.refresh();
    }
  }

  // ── Asset calculation (for income tax) ───────────────────────────────────

  function calcTotalAssets(player) {
    let total = player.cash;
    player.properties.forEach(pos => {
      const cfg = GAME_CONFIG.getSpace(pos);
      const ps  = GameState.propertyState[pos];
      total += ps.mortgaged ? cfg.mortgage : cfg.price;
      const grp = GAME_CONFIG.COLOR_GROUPS[cfg.color];
      if (grp && ps.buildings > 0 && ps.buildings < 5) total += ps.buildings * grp.officeCost;
      if (grp && ps.buildings === 5) total += grp.hqCost;
    });
    return total;
  }

  // ── DOMContentLoaded entry point ──────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    init();

    // Build setup player count → name inputs
    const countSel = document.getElementById('playerCount');
    if (countSel) {
      countSel.addEventListener('change', updateNameInputs);
      updateNameInputs(); // initial render
     }
  });

  // ── Expose what UI modals need ────────────────────────────────────────────
  return {
    confirmBuy,
    startAuction,
    completeAuction,
    declinePurchase,
    mortgageProperty,
    unmortgageProperty,
    buildOffice,
    sellOffice,
    buildHQ,
    sellHQ,
    takeLoan,
    repayLoan,
  };
})();
