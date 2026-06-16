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
    // Show setup screen, hide game screen
    document.getElementById('setupScreen').style.display  = 'flex';
    document.getElementById('gameScreen').style.display   = 'none';

    document.getElementById('btnStartGame').addEventListener('click', startGame);
    document.getElementById('btnRestartGame').addEventListener('click', () => location.reload());

    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(m => {
      m.addEventListener('click', e => {
        if (e.target === m) UI.closeModal(m.id);
      });
    });

    // Action buttons
    document.getElementById('btnRoll').addEventListener('click', rollDice);
    document.getElementById('btnEndTurn').addEventListener('click', endTurn);
    document.getElementById('btnBail').addEventListener('click', () => payJailBail());
    document.getElementById('btnJailCard').addEventListener('click', () => useJailCard());
    document.getElementById('btnLoan').addEventListener('click', () => UI.showLoanDialog());
  }

  function startGame() {
    const playerCount = parseInt(document.getElementById('playerCount').value) || 2;
    const names = [];
    for (let i = 1; i <= playerCount; i++) {
      const inp = document.getElementById(`pname${i}`);
      names.push((inp && inp.value.trim()) || `Player ${i}`);
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
    Board.centerAlert(`${GameState.currentPlayer.name} goes first! 🎲`);
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
        <span class="name-token" style="color:${GAME_CONFIG.PLAYER_COLORS[i-1]}">${GAME_CONFIG.PLAYER_TOKENS[i-1]}</span>
        <input id="pname${i}" type="text" placeholder="Player ${i}" maxlength="14" />
      `;
      wrapper.appendChild(div);
    }
  }

  // ── Dice roll ─────────────────────────────────────────────────────────────

  function rollDice() {
    if (GameState.turnPhase !== TurnPhase.WAITING_ROLL) {
      UI.toast("It's not time to roll.", 'error'); return;
    }

    const cp = GameState.currentPlayer;
    if (cp.status !== 'active') { endTurn(); return; }

    GameState.turnPhase = TurnPhase.ANIMATING;
    UI.refresh();

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const total = d1 + d2;
    const isDoubles = d1 === d2;

    GameState.lastDice = { d1, d2 };
    GameState.log(`${cp.name} rolled ${d1} + ${d2} = ${total}${isDoubles ? ' (DOUBLES!)' : ''}`);

    UI.animateDice(d1, d2, () => {
      if (cp.inJail) {
        handleJailRoll(cp, d1, d2, total, isDoubles);
      } else {
        handleNormalRoll(cp, d1, d2, total, isDoubles);
      }
    });
  }

  // ── Jail roll ─────────────────────────────────────────────────────────────

  function handleJailRoll(cp, d1, d2, total, isDoubles) {
    cp.jailTurns++;

    if (isDoubles) {
      // Doubles: get out free, move but don't re-roll
      cp.inJail    = false;
      cp.jailTurns = 0;
      GameState.log(`${cp.name} rolled doubles — out of Traffic Jam!`);
      moveAndAct(cp, total, false); // no re-roll on doubles out of jail
    } else if (cp.jailTurns >= 3) {
      // Must pay after 3 turns
      GameState.log(`${cp.name} must pay bail after 3 turns in Traffic Jam.`);
      const result = bank.pay(cp, null, GAME_CONFIG.JAIL_BAIL, GameState);
      if (result.ok) {
        cp.inJail    = false;
        cp.jailTurns = 0;
        moveAndAct(cp, total, false);
      } else {
        UI.showShortfallPanel(cp, GameState.shortfallAmount);
        UI.refresh();
      }
    } else {
      // Still in jail
      GameState.log(`${cp.name} stays in Traffic Jam (turn ${cp.jailTurns}/3).`);
      GameState.turnPhase = TurnPhase.CAN_END_TURN;
      UI.refresh();
    }
  }

  // ── Normal roll ───────────────────────────────────────────────────────────

  function handleNormalRoll(cp, d1, d2, total, isDoubles) {
    if (isDoubles) {
      GameState.doublesCount++;
      if (GameState.doublesCount >= 3) {
        // Three doubles in a row → jail
        GameState.log(`${cp.name} rolled doubles 3 times — sent to Traffic Jam!`);
        GameState.sendToJail(cp);
        Board.refresh();
        UI.refresh();
        return;
      }
    }

    moveAndAct(cp, total, isDoubles);
  }

  // ── Movement ─────────────────────────────────────────────────────────────

  function moveAndAct(player, steps, grantReroll) {
    const oldPos = player.position;
    player.position = (player.position + steps) % 40;

    // Passed GO?
    if (player.position < oldPos || (oldPos + steps >= 40)) {
      // Only grant GO salary if actually passed (not if landed on GO itself — handled in space action)
      if (player.position !== 0) {
        bank.pay(null, player, GAME_CONFIG.GO_SALARY, GameState);
        bank.chargePassGoInterest(player, GameState);
        GameState.log(`${player.name} passed GO — collected ₹${GAME_CONFIG.GO_SALARY}L.`);
        Board.centerAlert(`${player.name} passed GO! +₹${GAME_CONFIG.GO_SALARY}L`);
      }
    }

    Board.highlightSpace(player.position);
    Board.refreshTokens();

    // Slight delay for visual feedback before acting
    setTimeout(() => {
      executeSpaceAction(player, grantReroll);
    }, 400);
  }

  // ── Space actions ─────────────────────────────────────────────────────────

  function executeSpaceAction(player, grantReroll) {
    const space = GAME_CONFIG.getSpace(player.position);
    GameState.log(`${player.name} landed on ${space.name}.`);
    Board.centerAlert(space.name);

    switch (space.type) {

      case 'corner':
        if (space.subtype === 'go') {
          // Landed directly on GO — collect salary
          bank.pay(null, player, GAME_CONFIG.GO_SALARY, GameState);
          GameState.log(`${player.name} landed on GO — collected ₹${GAME_CONFIG.GO_SALARY}L.`);
          afterSpaceAction(player, grantReroll);
        } else if (space.subtype === 'go_to_jail') {
          GameState.sendToJail(player);
        } else {
          // Jail (just visiting) or Free Parking — no action
          afterSpaceAction(player, grantReroll);
        }
        break;

      case 'tax':
        handleTax(player, space, grantReroll);
        return; // returns internally

      case 'chance':
        CARDS.drawHustle(player, GameState, bank, UI);
        // After card action, check if a pendingSpaceAction was set
        if (GameState.pendingSpaceAction) {
          GameState.pendingSpaceAction = false;
          executeSpaceAction(player, false);
          return;
        }
        afterSpaceAction(player, grantReroll);
        break;

      case 'community_chest':
        CARDS.drawGossip(player, GameState, bank, UI);
        if (GameState.pendingSpaceAction) {
          GameState.pendingSpaceAction = false;
          executeSpaceAction(player, false);
          return;
        }
        afterSpaceAction(player, grantReroll);
        break;

      case 'property':
      case 'railway':
      case 'utility':
        handlePropertyLanding(player, space, grantReroll);
        return;

      default:
        afterSpaceAction(player, grantReroll);
    }

    Board.refresh();
    UI.refresh();
  }

  function handleTax(player, space, grantReroll) {
    let amount = space.amount;

    if (space.subtype === 'income') {
      // Player chooses flat ₹20L or 10% of total assets
      const tenPercent = Math.floor(calcTotalAssets(player) * GAME_CONFIG.INCOME_TAX_PERCENT);
      amount = Math.min(GAME_CONFIG.INCOME_TAX_FLAT, tenPercent);
      GameState.log(`${player.name} chose ₹${amount}L income tax (flat=${GAME_CONFIG.INCOME_TAX_FLAT}L, 10%=${tenPercent}L).`);
    }

    const result = bank.pay(player, null, amount, GameState);
    if (!result.ok) {
      UI.showShortfallPanel(player, GameState.shortfallAmount);
    } else {
      GameState.log(`${player.name} paid ₹${amount}L tax.`);
      afterSpaceAction(player, grantReroll);
    }
    Board.refresh();
    UI.refresh();
  }

  function handlePropertyLanding(player, space, grantReroll) {
    const ps = GameState.propertyState[space.position];

    if (!ps) { afterSpaceAction(player, grantReroll); return; }

    if (ps.owner === null) {
      // Unowned: offer buy or auction — save doubles flag so it survives the modal
      GameState.pendingReroll = grantReroll;
      GameState.turnPhase = TurnPhase.BUY_DECISION;
      UI.refresh();
      UI.showBuyDecision(space.position);
      // Game flow continues via confirmBuy() / startAuction() called from modal buttons
      return;
    }

    if (ps.owner === player.id) {
      // Own property — no action
      GameState.log(`${player.name} landed on their own property — no rent.`);
      afterSpaceAction(player, grantReroll);
      return;
    }

    if (ps.mortgaged) {
      GameState.log(`${space.name} is mortgaged — no rent collected.`);
      afterSpaceAction(player, grantReroll);
      return;
    }

    // Pay rent to owner
    const diceTotal = GameState.lastDice.d1 + GameState.lastDice.d2;
    const rent      = bank.calcRent(player, space.position, diceTotal, GameState);
    const owner     = GameState.getPlayerById(ps.owner);

    GameState.log(`${player.name} pays ₹${rent}L rent to ${owner.name} for ${space.name}.`);
    const result = bank.pay(player, owner, rent, GameState);
    if (!result.ok) {
      UI.showShortfallPanel(player, GameState.shortfallAmount);
      GameState.shortfallCreditor = owner.id;
    } else {
      Board.centerAlert(`${player.name} → ₹${rent}L rent to ${owner.name}`);
      afterSpaceAction(player, grantReroll);
    }

    Board.refresh();
    UI.refresh();
  }

  function afterSpaceAction(player, grantReroll) {
    if (GameState.turnPhase === TurnPhase.GAME_OVER) return;
    if (GameState.turnPhase === TurnPhase.AWAITING_PAY) return;

    if (grantReroll && player.status === 'active') {
      // Rolled doubles — give another roll (unless just landed in jail)
      if (!player.inJail) {
        GameState.turnPhase = TurnPhase.WAITING_ROLL;
        UI.toast(`${player.name} rolled doubles — roll again!`);
      } else {
        GameState.turnPhase = TurnPhase.CAN_END_TURN;
      }
    } else {
      GameState.turnPhase = TurnPhase.CAN_END_TURN;
    }
    Board.refresh();
    UI.refresh();
  }

  // ── Buy / Auction callbacks ───────────────────────────────────────────────

  function confirmBuy(position) {
    const cp = GameState.currentPlayer;
    const result = GameState.buyProperty(cp, position, bank);
    if (result.ok) {
      UI.toast(`Purchased! ₹${GAME_CONFIG.getSpace(position).price}L`);
      Board.refresh();
      afterSpaceAction(cp, GameState.pendingReroll);
    }
    UI.refresh();
  }

  function startAuction(position) {
    GameState.auctionPosition = position;
    UI.showAuction(position);
  }

  function completeAuction(winnerIdx, position, bid) {
    const winner = GameState.players[winnerIdx];
    const cp     = GameState.currentPlayer;
    const result = bank.completeAuction(winner, position, bid, GameState);
    if (result.ok) {
      UI.toast(`${winner.name} won ${GAME_CONFIG.getSpace(position).name} for ₹${bid}L!`);
    }
    GameState.auctionPosition = null;
    Board.refresh();
    afterSpaceAction(cp, GameState.pendingReroll);
    UI.refresh();
  }

  // ── Jail payment buttons ──────────────────────────────────────────────────

  function payJailBail() {
    const cp     = GameState.currentPlayer;
    const result = GameState.attemptJailEscape(cp, bank, 'bail');
    if (result.ok) {
      UI.toast(`${cp.name} paid bail — now roll the dice!`);
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

  // ── End turn ─────────────────────────────────────────────────────────────

  function endTurn() {
    if (GameState.turnPhase !== TurnPhase.CAN_END_TURN) {
      UI.toast("Can't end turn yet.", 'error'); return;
    }
    UI.hideShortfallPanel();
    GameState.advanceTurn();
    Board.refresh();
    UI.refresh();
    Board.centerAlert(`${GameState.currentPlayer.name}'s turn`);
  }

  // ── Building / mortgage callbacks (called from UI modal buttons) ──────────

  function mortgageProperty(position) {
    const result = bank.mortgage(GameState.currentPlayer, position, GameState);
    if (result.ok) { Board.refresh(); UI.refresh(); }
  }

  function unmortgageProperty(position) {
    const result = bank.unmortgage(GameState.currentPlayer, position, GameState);
    if (result.ok) { Board.refresh(); UI.refresh(); }
  }

  function buildOffice(position) {
    const result = bank.buyOffice(GameState.currentPlayer, position, GameState);
    if (result.ok) { UI.toast('Office built!'); Board.refresh(); UI.refresh(); }
  }

  function sellOffice(position) {
    const result = bank.sellOffice(GameState.currentPlayer, position, GameState);
    if (result.ok) { UI.toast('Office sold.'); Board.refresh(); UI.refresh(); }
  }

  function buildHQ(position) {
    const result = bank.buyHQ(GameState.currentPlayer, position, GameState);
    if (result.ok) { UI.toast('🏢 HQ built!'); Board.refresh(); UI.refresh(); }
  }

  function sellHQ(position) {
    const result = bank.sellHQ(GameState.currentPlayer, position, GameState);
    if (result.ok) { UI.toast('HQ sold.'); Board.refresh(); UI.refresh(); }
  }

  // ── Loan callbacks ────────────────────────────────────────────────────────

  function takeLoan(amount) {
    const result = bank.grantLoan(GameState.currentPlayer, amount, GameState);
    if (result.ok) {
      UI.toast(`₹${amount}L loan received!`);
      // If we were in a shortfall, check if it's now resolved
      if (GameState.turnPhase === TurnPhase.AWAITING_PAY) {
        GameState.resolveShortfall(
          GameState.currentPlayer,
          bank,
          GameState.shortfallCreditor !== null ? GameState.getPlayerById(GameState.shortfallCreditor) : null
        );
        if (GameState.currentPlayer.cash >= 0) UI.hideShortfallPanel();
      }
      UI.refresh();
    }
  }

  function repayLoan(amount) {
    const result = bank.repayLoan(GameState.currentPlayer, amount, GameState);
    if (result.ok) { UI.toast(`₹${amount}L repaid.`); UI.refresh(); }
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
    mortgageProperty,
    unmortgageProperty,
    buildOffice,
    sellOffice,
    buildHQ,
    sellHQ,
    takeLoan,
    rep